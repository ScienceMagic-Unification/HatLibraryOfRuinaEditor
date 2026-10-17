import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { parseKeywordPreview, keywordMarkup } from '../src/renderer/src/lib/keywordPreview'
import { getBuiltinRegexEntries, getBuiltinRegexLanguages, parseRegexXml, writeKeywordEntry } from '../src/renderer/src/lib/previewRules'
import { resolveBuiltinIconUrl, pluginIconResources, pluginImageResources } from '../src/renderer/src/lib/builtinIcons'
import { parseXml, serializeXml, listEntities } from '../../../packages/editor-core/src/index'

const entry = parseRegexXml('<BattleEffectTextRootExtra><extraTextList><BattleEffectTextExtra ID="Test"><Name>Display</Name><RecognizeName>Word</RecognizeName><RecognizeName>Alias</RecognizeName><Color>#123456</Color><IsUnderline>true</IsUnderline><IsBold>true</IsBold><IsItalic>true</IsItalic><IsChangeAbility>true</IsChangeAbility><KeepRecognizeName>true</KeepRecognizeName></BattleEffectTextExtra></extraTextList></BattleEffectTextRootExtra>')[0]
const rules = new Map([[entry.id, entry]])
const flat = (nodes) => nodes.map((n) => typeof n === 'string' ? n : flat(n.children)).join('')
const tokens = (nodes) => nodes.flatMap((n) => typeof n === 'string' ? [] : [n, ...tokens(n.children)])
describe('installed keyword semantics', () => {
  it('parses native and XML-friendly self, pair, link and icon forms', () => {
    const p = parseKeywordPreview('<HatKeyword id="Test"/> (~HatKeywordLink id="Test"~)custom(~/HatKeywordLink~)<HatKeywordIcon id="Test"/>', rules)
    expect(flat(p.nodes)).toBe('Display custom')
    expect(tokens(p.nodes).map((n) => n.tag)).toEqual(['HatKeyword', 'HatKeywordLink', 'HatKeywordIcon'])
    expect(p.diagnostics).toEqual([])
  })
  it('preserves nested styles, lines and explicit nested keywords without matching paired custom text', () => {
    const p = parseKeywordPreview('<b>A<i>B</i>C</b>\n<HatKeyword id="Test">Word <HatKeyword id="Test"/></HatKeyword> tail', rules)
    expect(flat(p.nodes)).toBe('ABC\nWord Display tail')
    expect(tokens(p.nodes).filter((n) => n.tag === 'HatKeyword')).toHaveLength(2)
  })
  it('noparse suppresses all keyword and rich-text interpretation', () => {
    const p = parseKeywordPreview('(~noparse~)(~HatKeyword id="Test"/~)<b>Word</b>(~/noparse~)', rules)
    expect(flat(p.nodes)).toBe('(~HatKeyword id="Test"/~)<b>Word</b>')
    expect(tokens(p.nodes)).toEqual([])
  })
  it('keeps the Singularity switch effective while retaining ordinary rich text', () => {
    const p = parseKeywordPreview('<HatKeyword id="Test"/><b>Word</b>', rules, 'ability', false)
    expect(flat(p.nodes)).toBe('<HatKeyword id="Test"/>Word')
    expect(tokens(p.nodes).map((n) => n.tag)).toEqual(['b'])
  })
  it('uses multiple RecognizeName values and KeepRecognizeName with case-sensitive scopes', () => {
    expect(tokens(parseKeywordPreview('Word Alias word Display', rules).nodes).filter((n) => n.tag === 'HatKeyword')).toHaveLength(2)
    expect(flat(parseKeywordPreview('Word Alias', rules).nodes)).toBe('Word Alias')
    expect(tokens(parseKeywordPreview('Word Alias', rules, 'passive').nodes)).toEqual([])
  })
  it('requires brackets when configured and recognizes all five plugin bracket pairs', () => {
    const r = new Map([['Test', { ...entry, hasBracket: true }]])
    const p = parseKeywordPreview('Word [Word] “Word” 「Word」 \'Word\' "Word"', r)
    expect(tokens(p.nodes).filter((n) => n.tag === 'HatKeyword')).toHaveLength(5)
    expect(flat(p.nodes)).toBe('Word Word Word Word Word Word')
  })
  it('matches Name only for an absent recognition list, keeping explicit empty lists disabled', () => {
    const absent = { ...entry, recognizeName: '', recognizeNames: [], hasBracket: true }
    expect(tokens(parseKeywordPreview('[Display]', new Map([['Test', absent]])).nodes)[0].tag).toBe('HatKeyword')
    const empty = { ...absent, recognizeNames: [''] }
    expect(tokens(parseKeywordPreview('[Display]', new Map([['Test', empty]])).nodes).some((n) => n.tag === 'HatKeyword')).toBe(false)
    const xml = '<BattleEffectTextRootExtra><extraTextList><BattleEffectTextExtra ID="Empty"><Name>Display</Name><RecognizeName/><IsChangeAbility>true</IsChangeAbility></BattleEffectTextExtra></extraTextList></BattleEffectTextRootExtra>'
    expect(parseRegexXml(xml)[0].recognizeNames).toEqual([''])
    expect(tokens(parseKeywordPreview('Display', new Map([['Empty', parseRegexXml(xml)[0]]])).nodes)).toHaveLength(0)
  })
  it('does not match ordinary words inside an unknown custom tag or tag attributes', () => {
    const p = parseKeywordPreview('<custom value="Word">Word</custom> Word', rules)
    expect(tokens(p.nodes).filter((n) => n.tag === 'HatKeyword')).toHaveLength(1)
    expect(flat(p.nodes)).toBe('<custom value="Word">Word</custom> Word')
  })
  it('keeps malformed closing tags and trailing text with diagnostics', () => {
    const p = parseKeywordPreview('before</b>after<HatKeyword id="Missing"/>tail', rules)
    expect(flat(p.nodes)).toBe('before</b>afterMissingtail')
    expect(p.diagnostics.map((d) => d.code)).toEqual(['closing', 'unknown'])
  })
  it('resolves current cn/en plugin data separately and reports fallback', () => {
    const cn = getBuiltinRegexEntries('singularity', 'cn').find((e) => e.id === 'Hat_Tags_Trait')
    const en = getBuiltinRegexEntries('singularity', 'en').find((e) => e.id === 'Hat_Tags_Trait')
    expect(cn.name).toBe('特性'); expect(en.name).toBe('Trait')
    const jp = getBuiltinRegexEntries('singularity', 'ja').find((e) => e.id === cn.id)
    expect(jp.language).toBe('jp')
    expect(parseKeywordPreview(keywordMarkup(jp.id, 'hat'), new Map([[jp.id, jp]])).diagnostics).toEqual([])
    const unknown = getBuiltinRegexEntries('singularity', 'unknown').find((e) => e.id === cn.id)
    expect(unknown.language).toBe('en')
    expect(parseKeywordPreview(keywordMarkup(unknown.id, 'hat'), new Map([[unknown.id, unknown]])).diagnostics[0].code).toBe('fallback')
    expect(getBuiltinRegexLanguages('singularity')).toEqual(expect.arrayContaining(['cn', 'en', 'jp', 'kr']))
  })
  it('resolves plugin icons by resource ownership and refuses unknown legacy atlases', () => {
    expect(resolveBuiltinIconUrl('Hat_Tags_Trait', undefined, 'HatSingularity.Tags')).toBeTruthy()
    expect(resolveBuiltinIconUrl('Hat_Tags_Trait', undefined, 'HatSingularity.Tags', 'OldMissingAtlas')).toBeUndefined()
    expect(pluginIconResources.some((r) => r.id === 'TraitGlow')).toBe(false)
  })
  it('exposes every current embedded image in the browser without treating UI textures as keyword icons', () => {
    const base = new URL('../src/renderer/src/assets/plugins/', import.meta.url)
    const manifest = JSON.parse(readFileSync(new URL('manifest.json', base), 'utf8'))
    expect(pluginImageResources.length).toBe(manifest.resources.filter((r) => r.kind === 'image').length)
    expect(pluginImageResources.every((r) => Boolean(r.url))).toBe(true)
    for (const id of ['Exhaust', 'Hat_Enchantments_UnsealDice', 'Hat_Enchantments_Ammo_Set', 'Hat_ParryingValueUp', 'Hat_Tags_Trait', 'TraitGlow', 'SidebarBackground']) expect(pluginImageResources.some((r) => r.id === id)).toBe(true)
    expect(resolveBuiltinIconUrl('Exhaust', undefined, 'HatSingularity.KeywordView')).toBeTruthy()
    expect(resolveBuiltinIconUrl('Exhaust', undefined, 'HatSingularity.Enchantments')).toBeTruthy()
  })
  it('keeps raw per-language descriptions and native references through preview and XML export', () => {
    for (const language of ['cn', 'en']) {
      const source = `Before ${keywordMarkup('Hat_Tags_Trait', 'link', language === 'cn' ? '自定义' : 'Custom')}\n<HatKeywordIcon id="Hat_Tags_Trait"/>`
      const xml = `<BattleEffectTextRootExtra><extraTextList><BattleEffectTextExtra ID="Mine"><Name>${language}</Name><Desc>${source.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</Desc><RecognizeName>A</RecognizeName><RecognizeName>B</RecognizeName><CardPreview pid="plugin">123</CardPreview><Future keep="true"/></BattleEffectTextExtra></extraTextList></BattleEffectTextRootExtra>`
      const doc = parseXml(xml)
      const e = parseRegexXml(xml)[0]
      parseKeywordPreview(e.desc, new Map(getBuiltinRegexEntries('singularity', language).map((e) => [e.id, e])))
      const node = listEntities(doc, { root: 'BattleEffectTextRootExtra', containerPath: ['extraTextList'], entity: 'BattleEffectTextExtra', idAttr: 'ID', fields: [] })[0].node
      writeKeywordEntry(node, { ...e, color: '#ffffff' })
      const exported = serializeXml(doc)
      expect(parseRegexXml(exported)[0].desc).toBe(source)
      expect(parseRegexXml(exported)[0].recognizeNames).toEqual(['A', 'B'])
      expect(exported).toContain('pid="plugin"'); expect(exported).toContain('<Future keep="true"/>')
      expect(exported).not.toMatch(/hat-resource:|data:image|assets\/plugins/)
    }
  })
  it('snapshot payloads match their recorded SHA256', () => {
    const base = new URL('../src/renderer/src/assets/plugins/', import.meta.url)
    const manifest = JSON.parse(readFileSync(new URL('manifest.json', base), 'utf8'))
    for (const r of manifest.resources.filter((r) => r.path)) expect(createHash('sha256').update(readFileSync(new URL(r.path, base))).digest('hex')).toBe(r.sha256)
  })
})
