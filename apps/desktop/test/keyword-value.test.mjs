import { describe, expect, it } from 'vitest'
import { parseKeywordPreview, keywordMarkup } from '../src/renderer/src/lib/keywordPreview'
import { parseKeywordValue, normalizeKeywordTags } from '../src/renderer/src/lib/keywordValue'
import { getBuiltinRegexEntries, parseRegexXml } from '../src/renderer/src/lib/previewRules'
import { aggregateDiceKeywordText, numericKeywordIds, exhaustDescriptionId } from '../src/renderer/src/lib/keywordAggregation'
import { parseXml, serializeXml } from '../../../packages/editor-core/src/index'

const id = 'Hat_Enchantments_MultipleHit_Keyword'
const rulesFor = (language = 'cn') => new Map(getBuiltinRegexEntries('singularity', language).map((entry) => [entry.id, entry]))
const flat = (nodes) => nodes.map((n) => typeof n === 'string' ? n : flat(n.children)).join('')
const tokens = (nodes) => nodes.flatMap((n) => typeof n === 'string' ? [] : [n, ...tokens(n.children)])

describe('HatKeyword value contract', () => {
  it('renders the reported MultipleHit value in all four languages with the original styling entry', () => {
    for (const language of ['cn', 'en', 'jp', 'kr']) {
      const rules = rulesFor(language), entry = rules.get(id)
      for (const source of [`<HatKeyword id="${id}" value="2"/>`, `(~HatKeyword value='2' id='${id}' /~)`]) {
        const result = parseKeywordPreview(`次元裂隙 的骰子具有 ${source}`, rules)
        expect(flat(result.nodes)).toBe(`次元裂隙 的骰子具有 ${entry.name}:2`)
        expect(tokens(result.nodes)).toEqual([{ tag: 'HatKeyword', value: id, parameter: '2', entry, children: [entry.name + ':2'] }])
        expect(result.diagnostics).toEqual([])
      }
    }
  })
  it('keeps arbitrary values literal, including spaces, delimiters and nested markup', () => {
    const rules = rulesFor(), name = rules.get(id).name
    for (const value of ['0', '-2', '1.5', '斩击', 'X+1', '{heal}', '', ' A B ', '3~5', 'a>b', 'a~)b', '<b>text</b>', '</noparse><HatKeyword id="other"/>', '(~b~)text(~/b~)', '&quot;', 'A&B "C"', "'\n\t😀"]) {
      const markup = keywordMarkup(id, 'hat', undefined, value)
      expect(parseKeywordValue(markup)).toEqual({ id, value })
      const result = parseKeywordPreview(markup, rules, 'dice')
      expect(flat(result.nodes)).toBe(name + ':' + value)
      expect(tokens(result.nodes)).toHaveLength(1)
      expect(result.diagnostics).toEqual([])
    }
    for (const source of [`<HatKeyword id="${id}" value="a>b"/>`, `(~HatKeyword value="a~)b" id="${id}"/~)`, `<HatKeyword id="${id}" value="<b>text</b>"/>`]) {
      expect(parseKeywordValue(source)).toBeDefined()
      expect(tokens(parseKeywordPreview(source, rules).nodes)).toHaveLength(1)
    }
  })
  it('decodes attribute entities once and preserves the XML save/load layer', () => {
    const rules = rulesFor(), name = rules.get(id).name
    const source = `(~HatKeyword id="${id}" value="&amp;quot; &quot; &amp; &lt;b&gt; &#x1F600; &copy; &Alpha; &alpha;"/~)`
    const outer = source.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    const xml = `<BattleEffectTextRootExtra><extraTextList><BattleEffectTextExtra ID="Mine"><Name>Mine</Name><Desc>${outer}</Desc></BattleEffectTextExtra></extraTextList></BattleEffectTextRootExtra>`
    for (const text of [xml, serializeXml(parseXml(xml))]) {
      const desc = parseRegexXml(text)[0].desc
      expect(desc).toBe(source)
      expect(flat(parseKeywordPreview(desc, rules).nodes)).toBe(name + ':&quot; " & <b> 😀 © Α α')
    }
  })
  it('leaves unknown, duplicate, extra, paired and non-HatKeyword value formats unexpanded', () => {
    const rules = rulesFor()
    for (const source of [
      `<HatKeyword id="Missing" value="2"/>`,
      `<HatKeyword id="${id}" value="2" value="3"/>`,
      `<HatKeyword id="${id}" id="${id}" value="2"/>`,
      `<HatKeyword id="${id}" value="2" custom="x"/>`,
      `<HatKeyword id="${id}" value="2">literal</HatKeyword>`,
      `<HatKeywordIcon id="${id}" value="2"/>`,
      `<HatKeywordLink id="${id}" value="2"/>`,
      `<custom value='<HatKeyword id="${id}" value="2"/>'/>`
    ]) {
      const result = parseKeywordPreview(source, rules, 'dice')
      expect(flat(result.nodes)).toBe(source)
      expect(tokens(result.nodes)).toHaveLength(0)
      expect(aggregateDiceKeywordText(source, rules, [])).toBe(source)
    }
    expect(flat(parseKeywordPreview(`<HatKeyword id="${id}" value="2"/>`, rules, 'ability', false).nodes)).toBe(`<HatKeyword id="${id}" value="2"/>`)
  })
  it('does not parse or normalize values inside noparse examples, including an unclosed block', () => {
    const tag = `(~HatKeyword id="${id}" value="<b>2</b> a~)b"/~)`
    for (const [open, close] of [['<noparse>', '</noparse>'], ['(~noparse~)', '(~/noparse~)']]) {
      for (const end of ['', close]) {
        const result = parseKeywordPreview(open + tag + end, rulesFor(), 'dice')
        expect(flat(result.nodes)).toBe(tag)
        expect(tokens(result.nodes)).toHaveLength(0)
      }
    }
  })
  it('preserves single parameter conditions and only aggregates recognizable unsigned integers', () => {
    for (const language of ['cn', 'en', 'jp', 'kr']) for (const key of numericKeywordIds) {
      const rules = rulesFor(language), name = rules.get(key).name
      const single = `若满足条件 <HatKeyword id="${key}" value="2"/> 后文`
      expect(aggregateDiceKeywordText(single, rules, [])).toBe(single)
      const formula = `<HatKeyword id="${key}" value="X+1"/>`
      const source = `${single} <HatKeyword value='5' id='${key}'/> ${formula}`
      const result = parseKeywordPreview(source, rules, 'dice')
      const keywordNodes = tokens(result.nodes).filter((node) => node.value === key)
      expect(keywordNodes.map((node) => flat(node.children))).toEqual([name + ':5', name + ':X+1'])
      expect(flat(result.nodes)).toContain('若满足条件')
      expect(flat(result.nodes)).toContain('后文')
    }
  })
  it('recognizes localized shield type parameters, keeps unknown types and respects the first real script', () => {
    const base = 'Hat_Enchantments_ShieldBash_Keyword', slash = 'Hat_Enchantments_ShieldBash_Slash_Keyword'
    for (const language of ['cn', 'en', 'jp', 'kr']) {
      const rules = rulesFor(language), value = rules.get(slash).name.slice(rules.get(base).name.length + 1)
      const parameter = normalizeKeywordTags(keywordMarkup(base, 'hat', undefined, value))
      const original = `条件 ${parameter} 后文`
      expect(aggregateDiceKeywordText(original, rules, ['Hat_Enchantments_ShieldBash_Dice'])).toBe(original)
      const unknown = `<HatKeyword id="${base}" value="unknown"/>`
      const merged = aggregateDiceKeywordText(`${original} <HatKeyword id="${slash}"/> ${unknown}`, rules, ['Hat_Enchantments_ShieldBash_Hit_Dice', 'Hat_Enchantments_ShieldBash_Dice'])
      expect(merged.startsWith('<HatKeyword id="Hat_Enchantments_ShieldBash_Hit_Keyword"/>')).toBe(true)
      expect(merged).toContain(unknown)
      expect(merged).toContain('条件')
    }
  })
  it('keeps values on parameterless unique keywords and filters only applicable known parameter fragments', () => {
    const rules = rulesFor()
    for (const key of [exhaustDescriptionId, 'Hat_Enchantments_Throughout_Dice_Keyword']) {
      const tag = `<HatKeyword id="${key}" value="2"/>`
      expect(aggregateDiceKeywordText(`${tag} ${tag}`, rules, [])).toBe(`${tag} ${tag}`)
    }
    const shield = '<HatKeyword id="Hat_Enchantments_ShieldBash_Keyword" value="斩击"/>'
    const numeric = `<HatKeyword id="${id}" value="2"/>`
    const formula = `<HatKeyword id="${id}" value="X+1"/>`
    for (const [detail, expected] of [['Guard', ['盾击:斩击', '连击:X+1']], ['Slash', ['连击:2', '连击:X+1']]]) {
      const nodes = parseKeywordPreview(`${shield} ${numeric} ${formula} 抽牌`, rules, 'dice', true, [], { type: detail === 'Guard' ? 'Def' : 'Atk', detail, source: 'enchantment' }).nodes
      expect(tokens(nodes).map((node) => flat(node.children))).toEqual(expected)
      expect(flat(nodes)).toContain('抽牌')
    }
  })
})
