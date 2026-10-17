import { describe, expect, it } from 'vitest'
import { aggregateDiceKeywordText, numericKeywordIds, exhaustDescriptionId } from '../src/renderer/src/lib/keywordAggregation'
import { keywordMigrations, keywordSearchAliases } from '../src/renderer/src/lib/keywordMigrations'
import { getBuiltinRegexEntries } from '../src/renderer/src/lib/previewRules'
import { shieldBashKeywordIds } from '../src/renderer/src/lib/shieldBash'
import { parseKeywordPreview } from '../src/renderer/src/lib/keywordPreview'
import { pluginImageResources } from '../src/renderer/src/lib/builtinIcons'

describe('3.9 keyword migration and aggregation', () => {
  const rulesFor = (language) => new Map([...getBuiltinRegexEntries('vanilla', language), ...getBuiltinRegexEntries('singularity', language)].map((e) => [e.id, e]))
  const uniqueIds = ['Hat_Enchantments_Throughout_Dice_Keyword', exhaustDescriptionId, ...shieldBashKeywordIds]
  it('preserves single conditions, numbers, styles, types and position in all four languages', () => {
    for (const language of ['cn', 'en', 'jp', 'kr']) {
      const rules = rulesFor(language)
      for (const id of [...numericKeywordIds, ...uniqueIds]) {
        const label = rules.get(id).name + (numericKeywordIds.includes(id) ? ':2' : '')
        for (const tag of [`<HatKeyword id="${id}"><i>${label}</i></HatKeyword>`, `<HatKeyword id="${id}"/>`, `<link="Hat:${id}">${label}</link>`]) {
          const original = `前文\n满足条件时  ${tag} 后文  `
          // Metadata must not turn a single fixed shield keyword into another type.
          const scripts = shieldBashKeywordIds.has(id) ? ['Hat_Enchantments_ShieldBash_Dice'] : []
          expect(aggregateDiceKeywordText(original, rules, scripts)).toBe(original)
        }
      }
    }
  })
  it('combines duplicate numeric labels using the highest visible value and preserves other effects', () => {
    for (const language of ['cn', 'en', 'jp', 'kr']) for (const id of numericKeywordIds) {
      const rules = rulesFor(language), name = rules.get(id).name
      const original = `命中时抽牌 <HatKeyword id="${id}">${name}:2</HatKeyword>\n<b>${name}:5</b>\n命中时抽牌`
      const result = aggregateDiceKeywordText(original, rules, [])
      expect(result).toBe(`<HatKeyword id="${id}">${name}:5</HatKeyword> 命中时抽牌 \n<b></b>\n命中时抽牌`)
      expect(aggregateDiceKeywordText(`${name}:2`, rules, [])).toBe(`${name}:2`)
    }
  })
  it('protects mixed tag bodies, foreign links, noparse and attribute contents', () => {
    const rules = rulesFor('cn'), id = numericKeywordIds[0]
    const text = `<noparse>精准:3 精准:5</noparse><link="foreign">精准:3 精准:5</link><HatKeyword id="${id}">精准:4，抽1张牌</HatKeyword><color="精准:4">普通正文</color>`
    expect(aggregateDiceKeywordText(text, rules, [])).toBe(text)
  })
  it('deduplicates only the dedicated exhaustion identity, never bare page exhaustion', () => {
    const rules = rulesFor('cn'), tag = `<HatKeyword id="${exhaustDescriptionId}"/>`
    expect(aggregateDiceKeywordText(`条件 ${tag} [佚亡] [佚亡]`, rules, [])).toBe(`条件 ${tag} [佚亡] [佚亡]`)
    expect(aggregateDiceKeywordText(`条件 ${tag} ${tag} [佚亡]`, rules, [])).toBe(`${tag} 条件   [佚亡]`)
    const entry = rules.get(exhaustDescriptionId)
    expect(entry).toMatchObject({ name: '佚亡', keywordIconId: 'Exhaust', isChangeAbility: false, isChangePassive: false, isChangeSelf: false, isAutoLink: true })
    expect(rules.get('Hat_Enchantments_ExhaustDice_Keyword').name).not.toBe(entry.name)
  })
  it('supplements missing metadata descriptions and deduplicates families only on repeats', () => {
    const rules = rulesFor('cn'), shield = '<HatKeyword id="Hat_Enchantments_ShieldBash_Keyword"/>', slash = '<HatKeyword id="Hat_Enchantments_ShieldBash_Slash_Keyword"/>'
    expect(aggregateDiceKeywordText(`正文 ${slash}`, rules, ['Hat_Enchantments_ShieldBash_Dice'])).toBe(`正文 ${slash}`)
    expect(aggregateDiceKeywordText(`正文 ${slash} ${shield}`, rules, ['Hat_Enchantments_ShieldBash_Dice'])).toBe(`${shield} 正文`)
    expect(aggregateDiceKeywordText('正文', rules, ['Hat_Enchantments_ShieldBash_Dice'])).toBe(`${shield} 正文`)
    const through = '<HatKeyword id="Hat_Enchantments_Throughout_Dice_Keyword"/>'
    expect(aggregateDiceKeywordText(`条件 ${through} ${through}`, rules, [])).toBe(`${through} 条件`)
  })
  it('offers current identities and legacy search aliases without modifying private references', () => {
    const rules = rulesFor('en')
    for (const [oldId, newId] of Object.entries(keywordMigrations)) {
      expect(rules.has(oldId)).toBe(false)
      expect(rules.has(newId)).toBe(true)
      expect(keywordSearchAliases(newId)).toContain(oldId)
      const result = parseKeywordPreview(`<HatKeyword id="${oldId}"/>`, rules, 'ability')
      expect(result.nodes[0].value).toBe(oldId)
      expect(result.diagnostics[0].detail).toContain(`${oldId} → ${newId}`)
    }
    expect(rules.get('Hat_Enchantments_Harmonious_Keyword').desc).toMatch(/(?:round|rounded).*up/i)
    for (const id of ['Hat_Enchantments_Insight', 'Hat_Enchantments_MultipleHit', 'Hat_Enchantments_Harmonious']) expect(pluginImageResources.filter((r) => r.id === id)).toHaveLength(1)
    expect(rules.get('Hat_Enchantments_BrowseCard_Keyword').keywordIconId).toContain('Discover')
  })
})
