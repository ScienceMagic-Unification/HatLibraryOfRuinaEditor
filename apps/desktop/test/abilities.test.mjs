import { describe, expect, it } from 'vitest'
import { abilityAudit, builtinScriptIds, builtinAbilityDescription, abilityXmlExample } from '../src/renderer/src/lib/singularityAbilities'
import { getBuiltinRegexEntries } from '../src/renderer/src/lib/previewRules'
import { parseKeywordPreview } from '../src/renderer/src/lib/keywordPreview'
import { pluginIconResources, resolveBuiltinIconUrl } from '../src/renderer/src/lib/builtinIcons'
import { parseXml, listEntities, getFieldValue } from '../../../packages/editor-core/src/index'
import { cardInfoModule } from '../../../packages/schemas/src/cardinfo'
import { shieldBashScripts, shieldBashKeywordIds } from '../src/renderer/src/lib/shieldBash'

const tokens = (nodes) => nodes.flatMap((n) => typeof n === 'string' ? [] : [n, ...tokens(n.children)])
describe('verified Singularity abilities', () => {
  it('offers all eight registered die IDs and no invented card Script', () => {
    expect(builtinScriptIds('dice').sort()).toEqual(['Hat_Enchantments_BasicAmmo_Dice', 'Hat_Enchantments_Exhaust_Dice', 'Hat_Enchantments_SharedCounter_Dice', 'Hat_Enchantments_Throughout_Dice', ...shieldBashScripts].sort())
    expect(builtinScriptIds('card')).toEqual([])
    expect(abilityAudit.plugins.find((p) => p.plugin === 'HatSingularity.Enchantments')).toMatchObject({ source: 'project', scripts: expect.arrayContaining(shieldBashScripts) })
  })
  it('generates complete cards with IDs only in die Script, without card exhaustion or invented XML fields', () => {
    for (const id of builtinScriptIds('dice')) {
      const xml = abilityXmlExample(id)
      const entities = listEntities(parseXml(xml), cardInfoModule.entity)
      expect(entities).toHaveLength(1)
      expect(getFieldValue(entities[0].node, cardInfoModule.entity.fields.find((f) => f.name === 'Script')) || '').toBe('')
      expect(xml).toContain(`Script="${id}"`)
      expect(xml).not.toMatch(/ExhaustOnUse|<Ammo|<Keyword/)
      expect(xml).toContain('</DiceCardXmlRoot>')
    }
  })
  it('rejects C# extension method names as directly usable Scripts', () => {
    expect(() => abilityXmlExample('EnchantmentDiceAbility.CanRollDice')).toThrow()
  })
  it('connects Throughout to its shipped bilingual keyword, icon, and offensive die example', () => {
    const id = 'Hat_Enchantments_Throughout_Dice', keyword = id + '_Keyword'
    for (const [language, name, color] of [['cn', '贯通', '#93a3c5'], ['en', 'Piercing', '#93a3c5'], ['jp', '突破', '#93a3c5'], ['kr', '돌파', '#93a3c5']]) {
      const description = builtinAbilityDescription(id, language)
      expect(description).toBe(`(~HatKeyword id="${keyword}"/~)`)
      const rules = new Map(getBuiltinRegexEntries('singularity', language).map((e) => [e.id, e]))
      const result = parseKeywordPreview(description, rules, 'dice', true, [id])
      expect(result.diagnostics).toEqual([])
      expect(tokens(result.nodes)[0].entry).toMatchObject({ id: keyword, name, color, keywordIconId: id })
      expect(resolveBuiltinIconUrl(id, undefined, 'HatSingularity.Enchantments')).toBeTruthy()
      expect(tokens(parseKeywordPreview(description, rules, 'dice', false).nodes)).toEqual([])
    }
    expect(abilityXmlExample(id)).toContain('Type="Atk" Detail="Penetrate" Motion="Z"')
    expect(builtinScriptIds('card')).not.toContain(id)
  })
  it('preserves each shield bash XML description and starts examples with a guard die', () => {
    const rules = new Map(getBuiltinRegexEntries('singularity', 'cn').map((e) => [e.id, e]))
    for (const id of shieldBashScripts) {
      const keyword = id.replace(/_Dice$/, '_Keyword')
      for (const language of ['cn', 'en']) expect(builtinAbilityDescription(id, language)).toBe(`(~HatKeyword id="${keyword}"/~)`)
      expect(abilityXmlExample(id)).toContain('Type="Def" Detail="Guard" Motion="G"')
      expect(rules.get(keyword)?.keywordIconId).toBe('Hat_Enchantments_ShieldBash')
      expect(tokens(parseKeywordPreview(builtinAbilityDescription(id, 'cn'), rules, 'dice').nodes)[0].entry.id).toBe(keyword)
    }
  })
  it('keeps the first shield keyword before other text without prioritizing fixed variants', () => {
    const rules = new Map(getBuiltinRegexEntries('singularity', 'cn').map((e) => [e.id, e]))
    for (const first of shieldBashScripts) {
      const order = [first, ...shieldBashScripts.filter((id) => id !== first), first]
      const text = '正文\n' + order.map((id) => builtinAbilityDescription(id, 'cn')).join('\n') + '\n[佚亡]'
      const result = parseKeywordPreview(text, rules, 'dice')
      expect(result.nodes[0].entry.id).toBe(first.replace(/_Dice$/, '_Keyword'))
      expect(tokens(result.nodes).filter((n) => shieldBashKeywordIds.has(n.entry?.id))).toHaveLength(1)
      expect(result.diagnostics).toEqual([])
      expect(tokens(parseKeywordPreview(text, rules, 'ability').nodes).filter((n) => shieldBashKeywordIds.has(n.entry?.id))).toHaveLength(5)
      expect(tokens(parseKeywordPreview(text, rules, 'dice', false).nodes).filter((n) => shieldBashKeywordIds.has(n.entry?.id))).toEqual([])
      const reversed = parseKeywordPreview(text, rules, 'dice', true, [...order].reverse().slice(1))
      expect(reversed.nodes[0].entry.id).toBe(order[order.length - 2].replace(/_Dice$/, '_Keyword'))
    }
  })
  it('preserves actual shipped exhaustion text and sidebar-only keyword flags', () => {
    for (const lang of ['cn', 'en', 'jp', 'kr']) expect(builtinAbilityDescription('Hat_Enchantments_Exhaust_Dice', lang)).toBe('(~HatKeyword id="Hat_Enchantments_ExhaustDice_Description_Keyword"/~)')
    const entry = getBuiltinRegexEntries('singularity', 'cn').find((e) => e.id === 'Hat_Enchantments_ExhaustDice_Keyword')
    expect(entry).toMatchObject({ isChangeSelf: true, isChangeAbility: false, isChangePassive: false, isAutoLink: false, keywordIconId: 'Exhaust' })
    expect(pluginIconResources.some((r) => r.id === 'Hat_Enchantments_ExhaustDice_Keyword')).toBe(false)
  })
  it('retains effects inside paired keyword tags, rich text, and noparse during shield aggregation', () => {
    const rules = new Map(getBuiltinRegexEntries('singularity', 'cn').map((e) => [e.id, e]))
    const id = 'Hat_Enchantments_ShieldBash_Keyword'
    const paired = `<HatKeyword id="${id}">盾击，命中时施加2层流血</HatKeyword>`
    const literal = `<HatKeyword id="${id}"/>`
    const body = `${paired}\n<b>命中时抽1张书页</b>\n<noparse>${literal}</noparse>`
    const result = parseKeywordPreview(body, rules, 'dice', true, ['Hat_Enchantments_ShieldBash_Dice'])
    const flat = (nodes) => nodes.map((n) => typeof n === 'string' ? n : flat(n.children)).join('')
    expect(flat(result.nodes)).toBe(`盾击 盾击，命中时施加2层流血\n命中时抽1张书页\n${literal}`)
    expect(tokens(result.nodes).find((n) => n.tag === 'b')?.children).toEqual(['命中时抽1张书页'])
  })
  it('applies the installed global exhaustion rule to both page and die ability text', () => {
    const rules = new Map([...getBuiltinRegexEntries('vanilla', 'cn'), ...getBuiltinRegexEntries('singularity', 'cn')].map((e) => [e.id, e]))
    const die = parseKeywordPreview('[佚亡]', rules, 'dice')
    expect(tokens(die.nodes).find((n) => n.tag === 'HatKeyword')?.entry).toMatchObject({ id: 'ExhaustOnUse_Keyword', keywordIconId: 'Exhaust', isUnderline: true })
    expect(die.diagnostics).toEqual([])
    const card = parseKeywordPreview('[佚亡]', rules, 'ability')
    expect(tokens(card.nodes).some((n) => n.entry?.id === 'ExhaustOnUse_Keyword')).toBe(true)
  })
})
