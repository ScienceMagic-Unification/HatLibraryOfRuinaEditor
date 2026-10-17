import type { BattleEffectTextEntry } from './previewRules'
import { shieldBashKeywordIds } from './shieldBash'
import { shieldBashAppliesTo, throughoutAppliesTo, type DicePreviewContext } from './diceApplicability'
import { aggregateDiceKeywordText, numericKeywordIds, shieldParameterEntry } from './keywordAggregation'
import { keywordMigrations } from './keywordMigrations'
import { encodeKeywordAttribute, normalizeKeywordTags, parseKeywordValue, tagAt } from './keywordValue'

export type KeywordScope = 'ability' | 'dice' | 'passive' | 'self' | 'all'
export type PreviewNode = string | { tag: string; value?: string; parameter?: string; entry?: BattleEffectTextEntry; children: PreviewNode[] }
export interface PreviewDiagnostic { code: 'unknown' | 'unclosed' | 'closing' | 'fallback' | 'legacy' | 'unsupported'; detail: string }
const brackets = [['[', ']'], ['“', '”'], ['「', '」'], ["'", "'"], ['"', '"']]
const richTags = new Set(['b', 'i', 'u', 's', 'strikethrough', 'color', 'size', 'sub', 'sup', 'mark', 'link', 'nobr', 'uppercase', 'lowercase', 'smallcaps'])

/** Preview only: never return this tree to the XML writer. Matching is case-sensitive, as in the plugin. */
export function parseKeywordPreview(source: string, rules: Map<string, BattleEffectTextEntry>, scope: KeywordScope = 'ability', keywordsEnabled = true, diceAbilityIds?: readonly string[], diceContext?: DicePreviewContext) {
  const diagnostics: PreviewDiagnostic[] = []
  const warn = (code: PreviewDiagnostic['code'], detail: string): void => {
    if (!diagnostics.some((d) => d.code === code && d.detail === detail)) diagnostics.push({ code, detail })
  }
  const noteEntry = (entry: BattleEffectTextEntry): void => {
    if (entry.language && entry.requestedLanguage && entry.language !== entry.requestedLanguage) warn('fallback', `${entry.id}: ${entry.requestedLanguage} → ${entry.language}`)
    if (entry.legacy) warn('legacy', entry.id)
  }
  const matches: { text: string; name: string; entry: BattleEffectTextEntry; bracket?: string[] }[] = []
  const seen = new Set<string>()
  for (const entry of rules.values()) {
    const enabled = scope === 'ability' || scope === 'dice' ? entry.isChangeAbility : scope === 'passive' ? entry.isChangePassive : scope === 'self' ? entry.isChangeSelf : entry.isChangeAbility || entry.isChangePassive
    if (!enabled || !keywordsEnabled) continue
    // Installed AddNewKeywordXml uses Name only when the list is absent; an explicit empty element disables it.
    const names = entry.recognizeNames ?? (entry.recognizeName ? [entry.recognizeName] : [])
    for (const name of names.length ? names : [entry.name]) {
      if (!name || seen.has(name)) continue
      seen.add(name)
      if (!entry.hasBracket) matches.push({ text: name, name, entry })
      for (const bracket of brackets) matches.push({ text: bracket[0] + name + bracket[1], name, entry, bracket })
    }
  }
  matches.sort((a, b) => b.text.length - a.text.length)
  const normalized = normalizeKeywordTags(source)
  const text = scope === 'dice' && keywordsEnabled ? aggregateDiceKeywordText(normalized, rules, diceAbilityIds ?? [], diceContext) : normalized
  let index = 0
  function read(stop?: string, plain = true, depth = 0): PreviewNode[] {
    const nodes: PreviewNode[] = []
    const append = (s: string): void => {
      if (typeof nodes[nodes.length - 1] === 'string') nodes[nodes.length - 1] += s
      else nodes.push(s)
    }
    while (index < text.length) {
      if (depth > 80) { warn('unsupported', 'nesting > 80'); append(text.slice(index)); index = text.length; break }
      const tail = text.slice(index)
      if (tail.startsWith('<noparse>')) {
        const end = text.indexOf('</noparse>', index + 9)
        append(text.slice(index + 9, end < 0 ? text.length : end))
        index = end < 0 ? text.length : end + 10
        if (end < 0) warn('unclosed', 'noparse')
        continue
      }
      const close = /^<\/([\w-]+)\s*>/.exec(tail)
      if (close) {
        index += close[0].length
        if (close[1] === stop) return nodes
        warn('closing', close[0]); append(close[0]); continue
      }
      const completeTag = tail.startsWith('<') ? tagAt(tail) : undefined
      const parameter = completeTag ? parseKeywordValue(completeTag) : undefined
      if (parameter) {
        index += completeTag!.length
        const entry = rules.get(parameter.id)
        if (keywordsEnabled && entry?.name) {
          noteEntry(entry)
          nodes.push({ tag: 'HatKeyword', value: entry.id, parameter: parameter.value, entry, children: [entry.name + ':' + parameter.value] })
        } else {
          append(completeTag!)
          if (keywordsEnabled) warn('unknown', parameter.id)
        }
        continue
      }
      const keyword = /^<(HatKeywordLink|HatKeywordIcon|HatKeyword) id="([^"<>]+)"(\/?)>/.exec(tail)
      if (keyword) {
        const [, tag, id, self] = keyword
        if (tag === 'HatKeywordIcon' && !self) { warn('unsupported', keyword[0]); append(keyword[0]); index += keyword[0].length; continue }
        index += keyword[0].length
        if (!keywordsEnabled) {
          append(keyword[0])
          if (!self) {
            nodes.push(...read(tag, false, depth + 1))
            const end = `</${tag}>`
            if (text.slice(index - end.length, index) === end) append(end)
          }
          continue
        }
        const entry = rules.get(id)
        if (entry) noteEntry(entry)
        else if (tag !== 'HatKeywordIcon') warn('unknown', keywordMigrations[id] ? `${id} → ${keywordMigrations[id]}` : id)
        // Paired keyword contents suppress ordinary-word matching; nested explicit tags remain active.
        const children = self ? (tag === 'HatKeywordIcon' ? [] : [entry?.name || entry?.recognizeName || id]) : read(tag, false, depth + 1)
        nodes.push({ tag, value: id, entry, children })
        continue
      }
      const sprite = /^<sprite(?:="([^"]+)")?\s+name="([^"]+)"\s*\/?>/.exec(tail)
      if (sprite) { index += sprite[0].length; nodes.push({ tag: 'sprite', value: sprite[2], children: [], entry: { iconSheetName: sprite[1] } as BattleEffectTextEntry }); continue }
      const tag = /^<([\w-]+)(?:=("[^"]*"|'[^']*'|[^>]*))?\s*(\/?)>/.exec(tail)
      if (tag) {
        index += tag[0].length
        if (tag[1] === 'br') { append('\n'); continue }
        if (richTags.has(tag[1])) {
          const children = tag[3] ? [] : read(tag[1], plain && tag[1] !== 'link', depth + 1)
          nodes.push({ tag: tag[1], value: tag[2]?.replace(/^["']|["']$/g, ''), children }); continue
        }
        warn('unsupported', tag[0]); append(tag[0])
        if (!tag[3]) {
          nodes.push(...read(tag[1], false, depth + 1))
          const end = `</${tag[1]}>`
          if (text.slice(index - end.length, index) === end) append(end)
        }
        continue
      }
      // Unknown tag attributes must never be treated as ordinary text keywords.
      const unknownTag = completeTag ? [completeTag] : undefined
      if (unknownTag) {
        append(unknownTag[0]); warn('unsupported', unknownTag[0]); index += unknownTag[0].length
        const name = /^<([\w-]+)/.exec(unknownTag[0])?.[1]
        if (name && !unknownTag[0].endsWith('/>')) {
          nodes.push(...read(name, false, depth + 1))
          const end = `</${name}>`
          if (text.slice(index - end.length, index) === end) append(end)
        }
        continue
      }
      const hit = plain ? matches.find((m) => tail.startsWith(m.text)) : undefined
      if (hit) {
        noteEntry(hit.entry)
        const label = hit.entry.keepRecognizeName ? hit.name : hit.entry.name || hit.name
        const preserve = hit.bracket && !hit.entry.color && !(hit.bracket[0] === '[' && scope !== 'ability' && scope !== 'dice')
        if (preserve) append(hit.bracket![0])
        nodes.push({ tag: 'HatKeyword', value: hit.entry.id, entry: hit.entry, children: [label] })
        if (preserve) append(hit.bracket![1])
        index += hit.text.length; continue
      }
      // Retain the editor's existing condition highlighting, outside noparse/keyword bodies.
      const condition = plain ? /^\[([^\]\n]+)\]/.exec(tail) : null
      if (condition) { nodes.push({ tag: 'color', value: scope === 'passive' ? 'white' : 'yellow', children: [condition[1] + '\u2009'] }); index += condition[0].length; continue }
      append(text[index++])
    }
    if (stop) warn('unclosed', stop)
    return nodes
  }
  let nodes = read()
  if (scope === 'dice' && keywordsEnabled && diceContext?.source === 'enchantment') {
    const hidden = new Set<string>()
    if (!shieldBashAppliesTo(diceContext)) for (const id of shieldBashKeywordIds) hidden.add(id)
    if (!throughoutAppliesTo(diceContext)) hidden.add('Hat_Enchantments_Throughout_Dice_Keyword')
    if (!throughoutAppliesTo(diceContext)) for (const id of numericKeywordIds.slice(0, 2)) hidden.add(id)
    nodes = removeStandaloneKeywords(nodes, hidden, rules)
  }
  return { nodes, diagnostics }
}

function removeStandaloneKeywords(nodes: PreviewNode[], hidden: Set<string>, rules: Map<string, BattleEffectTextEntry>): PreviewNode[] {
  const plain = (items: PreviewNode[]): string => items.map((n) => typeof n === 'string' ? n : plain(n.children)).join('')
  return nodes.flatMap((node): PreviewNode[] => {
    if (typeof node === 'string') return [node]
    if (node.tag.startsWith('HatKeyword') || node.tag === 'link') {
      const name = node.entry?.name
      if (node.parameter !== undefined) {
        const known = numericKeywordIds.some((id) => id === node.value) ? /^\s*\d+\s*$/.test(node.parameter) : !!shieldParameterEntry(node.value ?? '', node.parameter, rules)
        return known && hidden.has(node.value ?? '') ? [] : [node]
      }
      return node.entry && hidden.has(node.entry.id) && ['HatKeyword', 'HatKeywordLink'].includes(node.tag) &&
        [name, `[${name}]`, `【${name}】`, `(${name})`].includes(plain(node.children).trim()) ? [] : [node]
    }
    return [{ ...node, children: removeStandaloneKeywords(node.children, hidden, rules) }]
  })
}

export function keywordMarkup(id: string, kind: 'hat' | 'icon' | 'link', selectedText?: string, parameter?: string): string {
  // IDs come from XML. Reject characters that cannot form a native quoted tag attribute.
  if (/["<>\r\n]/.test(id)) throw new Error('Invalid keyword ID')
  const tag = kind === 'icon' ? 'HatKeywordIcon' : kind === 'link' ? 'HatKeywordLink' : 'HatKeyword'
  if (kind === 'hat' && parameter !== undefined) return `(~HatKeyword id="${encodeKeywordAttribute(id)}" value="${encodeKeywordAttribute(parameter)}"/~)`
  return kind !== 'icon' && selectedText !== undefined ? `(~${tag} id="${id}"~)${selectedText}(~/${tag}~)` : `(~${tag} id="${id}"/~)`
}
