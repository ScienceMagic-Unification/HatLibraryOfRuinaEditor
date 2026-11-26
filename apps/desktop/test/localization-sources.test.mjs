import { describe, expect, it } from 'vitest'
import { parseXml, listEntities, serializeXml, inferEntitySchema, createEntity, insertEntity, getFieldValue, setFieldValue, getAllText, setAllText } from '@ruina/editor-core'
import { detectLang } from '../src/renderer/src/lib/lang'
import { entitySchemaForRow, localizedIndex, rowKey, sameLanguageSources } from '../src/renderer/src/lib/localizationSources'
import { cardNameModule, effectTextModule } from '@ruina/schemas'

describe('split localization sources', () => {
  it('uses the localization directory even with a conflicting filename or ancestor', () => {
    expect(detectLang('C:/cn/mod/Assemblies/Localize/en/PassiveDesc/example_cn.xml', '中文').lang).toBe('en')
    expect(detectLang('C:/mod/SomeFile_cn.xml', '').lang).toBe('cn')
  })
  it('limits lookups to the same language and table, resolving duplicate IDs in the chosen source first', () => {
    const doc = (file, lang = 'cn', table = 'StageName') => ({
      path: [lang, table, file].join('/'), lang, root: 'CharactersNameRoot',
      doc: parseXml('<CharactersNameRoot><Name ID="1">' + file + '</Name></CharactersNameRoot>')
    })
    const a = doc('A.xml'), b = doc('B.xml')
    const sources = sameLanguageSources([a, doc('A.xml','en'), doc('A.xml','cn','DropBooks'), b], 'cn', b.path)
    expect(sources).toEqual([b,a])
    const schema = { root: a.root, entity: 'Name', idAttr: 'ID', fields: [] }
    expect(localizedIndex(sources, schema).get('1').path).toBe(b.path)
    expect(sameLanguageSources([a,b], '__none__', b.path)).toEqual([])
  })
  it('distinguishes the same ID in the plain and extra effect lists and across files', () => {
    const doc = parseXml('<BattleEffectTextRootExtra><effectTextList><BattleEffectText ID="A"/></effectTextList><extraTextList><BattleEffectTextExtra ID="A"/></extraTextList></BattleEffectTextRootExtra>')
    const refs = listEntities(doc, effectTextModule.entity)
    expect(new Set(['one','two'].flatMap((source) => refs.map((ref) => rowKey({ ...ref, source })))).size).toBe(4)
    expect(entitySchemaForRow(effectTextModule.entity, refs[0]).containerPath).toEqual(['effectTextList'])
  })
  it('keeps comments and attributes when editing or collapsing repeated description lines', () => {
    const node = parseXml('<Ability><Desc flag="1">a<!--inline-->b</Desc><!--between--><Desc><!--note-->c</Desc><Other/></Ability>')[0]
    expect(getAllText(node, 'Desc')).toBe('ab\nc')
    setAllText(node, 'Desc', 'updated')
    const xml = serializeXml([node])
    for (const part of ['flag="1"', '<!--inline-->', '<!--between-->', '<!--note-->', '<Other']) expect(xml).toContain(part)
    expect(getAllText(node, 'Desc')).toBe('updated')
  })
  it('inserts into an empty source and edits text-only localization without losing sibling comments', () => {
    const blank = parseXml('<BattleCardDescRoot><!--empty--></BattleCardDescRoot>')
    insertEntity(blank, cardNameModule.entity, createEntity(cardNameModule.entity, '21'))
    expect(listEntities(blank, cardNameModule.entity)[0].id).toBe('21')
    expect(serializeXml(blank)).toContain('<!--empty-->')
    const doc = parseXml('<localize><!--note--><text id="k" keep="yes">before</text></localize>')
    const schema = inferEntitySchema(doc)
    const node = listEntities(doc, schema)[0].node
    expect(getFieldValue(node, schema.fields[0])).toBe('before')
    setFieldValue(node, schema.fields[0], 'after')
    expect(serializeXml(doc)).toMatch(/<!--note-->[\s\S]*keep="yes">after<\/text>/)
  })
})
