import { describe, expect, it } from 'vitest'
import { workspaceLanguage } from '../src/renderer/src/lib/workspaceLanguage'
import { builtinAbilityDescription } from '../src/renderer/src/lib/singularityAbilities'
import { getBuiltinRegexEntries } from '../src/renderer/src/lib/previewRules'
import { parseKeywordPreview } from '../src/renderer/src/lib/keywordPreview'
import { shieldBashAppliesTo, throughoutAppliesTo } from '../src/renderer/src/lib/diceApplicability'
import { detectLang } from '../src/renderer/src/lib/lang'

const shield = 'Hat_Enchantments_ShieldBash_Keyword', through = 'Hat_Enchantments_Throughout_Dice_Keyword'
const flat = (nodes) => nodes.map((n) => typeof n === 'string' ? n : flat(n.children)).join('')
const tokens = (nodes) => nodes.flatMap((n) => typeof n === 'string' ? [] : [n, ...tokens(n.children)])
describe('document language and enchantment applicability', () => {
  it('resolves explicit document paths, aliases, language-only workspaces and None', () => {
    const docs = { cn: { lang: 'cn', bindings: { cardability: { kind: 'primary' } } }, korean: { lang: 'ko', bindings: { cardability: { kind: 'primary' } } } }
    expect(workspaceLanguage(docs, 'cardability', 'cn', 'korean')).toBe('kr')
    expect(workspaceLanguage(docs, 'cardability', '__none__', 'korean')).toBe('__none__')
    expect(workspaceLanguage(docs, 'singularity-abilities', 'ja')).toBe('jp')
    expect(workspaceLanguage(docs, 'cardability', 'en')).toBe('en')
    expect(detectLang('Ability_kr.xml', '<Desc>English ID</Desc>').lang).toBe('kr')
  })
  it('uses four-language resources and English fallback without stale Chinese translations', () => {
    for (const language of ['cn', 'en', 'jp', 'kr']) {
      for (const set of ['vanilla', 'singularity']) {
        const entries = getBuiltinRegexEntries(set, language)
        for (const entry of entries.filter((e) => e.language)) expect(entry.language).toBe(language)
      }
      expect(builtinAbilityDescription('Hat_Enchantments_SharedCounter_Dice', language)).toBeTruthy()
    }
    expect(builtinAbilityDescription('Hat_Enchantments_SharedCounter_Dice', 'ko')).toBe(builtinAbilityDescription('Hat_Enchantments_SharedCounter_Dice', 'kr'))
    expect(builtinAbilityDescription('Hat_Enchantments_SharedCounter_Dice', 'ru')).toBe('Shared counter die')
    expect(getBuiltinRegexEntries('singularity', 'cn').find((e) => e.id === 'Hat_Enchantments_BrowseCard_Keyword').name).toBe('查阅')
  })
  it('filters only inapplicable granted fragments and restores them when dice types change', () => {
    const rules = new Map(getBuiltinRegexEntries('singularity', 'cn').map((e) => [e.id, e]))
    const source = `<HatKeyword id="${shield}"/> <HatKeyword id="${through}"/>\n<b>命中时抽1张书页</b>`
    for (const type of ['Atk', 'Def', 'Standby']) for (const detail of ['Slash', 'Penetrate', 'Hit', 'Guard', 'Evasion', 'None']) {
      const context = { type, detail, source: 'enchantment' }
      const nodes = parseKeywordPreview(source, rules, 'dice', true, ['Hat_Enchantments_ShieldBash_Dice'], context).nodes
      const ids = tokens(nodes).map((n) => n.entry?.id)
      expect(ids.includes(shield)).toBe(detail === 'Guard' && ['Def', 'Standby'].includes(type))
      expect(ids.includes(through)).toBe(['Slash', 'Penetrate', 'Hit'].includes(detail))
      expect(shieldBashAppliesTo(context)).toBe(ids.includes(shield))
      expect(throughoutAppliesTo(context)).toBe(ids.includes(through))
      expect(flat(nodes)).toContain('命中时抽1张书页')
      const native = tokens(parseKeywordPreview(source, rules, 'dice', true, [], { ...context, source: 'native' }).nodes).map((n) => n.entry?.id)
      expect(native).toEqual(expect.arrayContaining([shield, through]))
    }
    expect(source).toContain(`<HatKeyword id="${shield}"/>`)
    const mixed = `<HatKeyword id="${shield}">盾击，命中时抽1张书页</HatKeyword>`
    expect(flat(parseKeywordPreview(mixed, rules, 'dice', true, [], { type: 'Atk', detail: 'Slash', source: 'enchantment' }).nodes)).toBe('盾击，命中时抽1张书页')
  })
})
