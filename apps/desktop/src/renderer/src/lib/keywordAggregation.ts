import type { BattleEffectTextEntry } from './previewRules'
import { firstShieldBashScript, shieldBashKeywordIds } from './shieldBash'
import { shieldBashAppliesTo, throughoutAppliesTo, type DicePreviewContext } from './diceApplicability'
import { nativeTagPattern, parseKeywordValue, tagAt } from './keywordValue'

export const numericKeywordIds = ['Hat_Enchantments_Precision_Keyword', 'Hat_Enchantments_MultipleHit_Keyword', 'Hat_Enchantments_Harmonious_Keyword'] as const
export const exhaustDescriptionId = 'Hat_Enchantments_ExhaustDice_Description_Keyword'
const throughoutId = 'Hat_Enchantments_Throughout_Dice_Keyword'
const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const namePattern = (name: string): string => name.split(/[:：]\s*/).map(escape).join('[:：]\\s*')

export function shieldParameterEntry(id: string, value: string, rules: Map<string, BattleEffectTextEntry>): BattleEffectTextEntry | undefined {
  const base = 'Hat_Enchantments_ShieldBash_Keyword'
  if (id !== base || !rules.get(base)?.name) return undefined
  const label = rules.get(base)!.name + ':' + value
  return [...shieldBashKeywordIds].filter((key) => key !== base).map((key) => rules.get(key))
    .find((entry) => entry?.name && new RegExp(`^${namePattern(entry.name)}\\s*$`).test(label))
}

/** A display-only approximation of plugin aggregation; C# runtime values are never executed. */
export function aggregateDiceKeywordText(source: string, rules: Map<string, BattleEffectTextEntry>, abilityIds: readonly string[], dice?: DicePreviewContext): string {
  let text = source
  const groups: { ids: string[]; numeric?: boolean; taggedOnly?: boolean; metadataId?: string }[] = []
  for (const id of numericKeywordIds) {
    if (id !== 'Hat_Enchantments_Harmonious_Keyword' && dice && !throughoutAppliesTo(dice)) continue
    groups.push({ ids: [id], numeric: true })
  }
  if (!dice || throughoutAppliesTo(dice)) groups.push({ ids: [throughoutId], metadataId: abilityIds.includes('Hat_Enchantments_Throughout_Dice') ? throughoutId : undefined })
  groups.push({ ids: [exhaustDescriptionId], taggedOnly: true, metadataId: abilityIds.includes('Hat_Enchantments_Exhaust_Dice') ? exhaustDescriptionId : undefined })
  if (!dice || shieldBashAppliesTo(dice)) groups.push({ ids: [...shieldBashKeywordIds], metadataId: firstShieldBashScript(abilityIds)?.replace(/_Dice$/, '_Keyword') })
  for (const group of groups) {
    const entries = group.ids.map((id) => rules.get(id)).filter((entry): entry is BattleEffectTextEntry => !!entry?.name)
    if (!entries.length) continue
    const byId = new Map(entries.map((entry) => [entry.id, entry]))
    const valuePattern = (entry: BattleEffectTextEntry): string => namePattern(entry.name) + (group.numeric ? '\\s*[:：]\\s*\\d+' : '')
    const names = [...entries].sort((a, b) => b.name.length - a.name.length).map(valuePattern).join('|')
    const plainPattern = `(?<![\\p{L}\\p{N}_])(?:\\[\\s*(?:${names})\\s*\\]|【\\s*(?:${names})\\s*】|\\(\\s*(?:${names})\\s*\\)|(?:${names}))(?![\\p{L}\\p{N}_])`
    // Consume opaque bodies and tag attributes intact. Rich formatting may surround an independent label.
    const attributes = String.raw`(?:[^<>"']|"[^"]*"|'[^']*')*?`
    const pattern = new RegExp(`<noparse>[\\s\\S]*?(?:</noparse>|$)|<HatKeywordIcon\\b${attributes}>|<HatKeyword(?:Link)?\\b${attributes}(?:/>|>[\\s\\S]*?</HatKeyword(?:Link)?>)|<link\\b${attributes}>[\\s\\S]*?</link>|${nativeTagPattern}` + (group.taggedOnly ? '' : `|${plainPattern}`), 'gu')
    const matches: { start: number; end: number; entry: BattleEffectTextEntry; value?: number }[] = []
    for (const match of text.matchAll(pattern)) {
      const token = match[0]
      let entry: BattleEffectTextEntry | undefined
      let label = token
      let self = false
      if (token.startsWith('<')) {
        if (!/^<(?:HatKeyword(?:Link)?\b|link\b)/.test(token)) continue
        const parameter = parseKeywordValue(token)
        if (parameter) {
          entry = byId.get(parameter.id)
          if (!entry) continue
          if (group.numeric && /^\s*\d+\s*$/.test(parameter.value)) {
            const value = Number(parameter.value)
            if (Number.isSafeInteger(value)) matches.push({ start: match.index!, end: match.index! + token.length, entry, value })
          } else if (shieldBashKeywordIds.has(parameter.id)) {
            const variant = shieldParameterEntry(parameter.id, parameter.value, rules)
            if (variant) matches.push({ start: match.index!, end: match.index! + token.length, entry: variant })
          }
          continue
        }
        // Unknown/duplicate parameters and paired value tags are not plain self-closing keywords.
        if (/\bvalue\s*=/.test(tagAt(token) ?? '')) continue
        const id = /\bid\s*=\s*["']([^"']+)["']/.exec(token)?.[1] ?? /^<link\s*=\s*["']([^"']+)["']/.exec(token)?.[1]
        entry = id ? byId.get(id.replace(/^Hat:/, '')) : undefined
        if (!entry) continue
        self = /^<HatKeyword(?:Link)?\b[^>]*\/\s*>$/.test(token)
        label = token.replace(/<[^>]+>/g, '').trim()
        if (entry.id === 'Hat_Enchantments_ShieldBash_Keyword' && !self) {
          const value = label.match(/[:：]([\s\S]*)$/)?.[1]
          if (value !== undefined) entry = shieldParameterEntry(entry.id, value, rules) ?? entry
        }
      } else {
        entry = entries.find((e) => new RegExp(`^(?:${valuePattern(e)}|\\[\\s*${valuePattern(e)}\\s*\\]|【\\s*${valuePattern(e)}\\s*】|\\(\\s*${valuePattern(e)}\\s*\\))$`, 'u').test(label))
      }
      if (!entry) continue
      const unwrapped = label.replace(/^[\[【(]\s*|\s*[\]】)]$/g, '')
      if (!self && !new RegExp(`^${valuePattern(entry)}$`, 'u').test(unwrapped)) continue
      const numeric = group.numeric ? /[:：]\s*(\d+)\s*$/.exec(unwrapped)?.[1] : undefined
      matches.push({ start: match.index!, end: match.index! + token.length, entry, value: numeric ? Number(numeric) : undefined })
    }
    // A single condition/amount/type remains exactly where the author put it, even if metadata disagrees.
    if (matches.length === 1 || (!matches.length && !group.metadataId)) continue
    const selected = (group.metadataId ? rules.get(group.metadataId) : undefined) ?? matches[0]?.entry
    if (!selected) continue
    const values = matches.map((m) => m.value).filter((value): value is number => value !== undefined)
    if (group.numeric && !values.length) continue // No invented numeric values for self-closing tags.
    let body = text
    for (const match of [...matches].reverse()) body = body.slice(0, match.start) + body.slice(match.end)
    const prefix = group.numeric ? `<HatKeyword id="${selected.id}">${selected.name}:${Math.max(...values)}</HatKeyword>` : `<HatKeyword id="${selected.id}"/>`
    text = prefix + (body.trim() ? ' ' + body.trim() : '')
  }
  return text
}
