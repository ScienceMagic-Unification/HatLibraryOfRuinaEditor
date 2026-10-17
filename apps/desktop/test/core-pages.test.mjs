import { describe, expect, it } from 'vitest'
import { createEntity, parseXml, serializeXml, listEntities, getFieldValue, setFieldValue, getTextField, getAttr, getNodeText } from '../../../packages/editor-core/src/index'
import { equipPageEnemyModule, equipPageLibrarianModule } from '../../../packages/schemas/src/equippage'
import { corePageModuleForFile, editReference, referenceNodes, resistanceRates, corePageProblems } from '../src/renderer/src/lib/corePages'
import { selectPrimaryDocument } from '../src/renderer/src/lib/documentSelection'

const schema = equipPageEnemyModule.entity
const read = () => parseXml('<BookXmlRoot><Book ID="101"><Name>Alpha</Name><TextId>902</TextId><SpeedDiceNum>2</SpeedDiceNum><CharacterSkin>A</CharacterSkin><CharacterSkin>B</CharacterSkin><EquipEffect><SpeedDiceNum>9</SpeedDiceNum><SpeedMin>2</SpeedMin><Speed>5</Speed><Passive Pid="Other.Mod" Future="keep">11</Passive><Passive Pid="@origin">12</Passive><Extension x="untouched"/><Card Emotion="3" Level="2">20</Card></EquipEffect><FutureRoot/></Book></BookXmlRoot>')
describe('core page semantics and lossless edits', () => {
  it('targets the selected path when multiple data files have the same language, and honors None', () => {
    const docs = { a: { path: 'a', lang: 'cn', bindings: { core: { kind: 'primary' } } }, b: { path: 'b', lang: 'cn', bindings: { core: { kind: 'primary' } } } }
    expect(selectPrimaryDocument(docs, 'core', 'cn', 'b')).toBe(docs.b)
    expect(selectPrimaryDocument(docs, 'core', '__none__', 'a')).toBeUndefined()
  })
  it('groups split files by actual side without mistaking enemy unit files for books', () => {
    expect(corePageModuleForFile('EquipPage_Enemy.xml')).toBe('equippage-enemy')
    expect(corePageModuleForFile('Folder/EQUIPPAGE_LIBRARIAN_extra.xml')).toBe('equippage-librarian')
    expect(corePageModuleForFile('EnemyUnitInfo.xml')).toBeUndefined()
  })
  it('uses game BookOption and complete resistance enums on both sides', () => {
    for (const module of [equipPageEnemyModule, equipPageLibrarianModule]) {
      expect(module.entity.fields.find((f) => f.name === 'Option').values).toEqual(['None', 'Basic', 'MultiDeck'])
      expect(module.entity.fields.find((f) => f.name === 'SResist').field.values).toContain('Resist')
      expect(module.entity.locked?.TextId).toBeUndefined()
    }
    expect(resistanceRates).toMatchObject({ Weak: 2, Vulnerable: 1.5, Endure: 0.5, Resist: 0.25 })
    const book = createEntity(schema, '1')
    expect(getFieldValue(book, schema.fields.find((f) => f.name === 'StartPlayPoint'))).toBe('3')
    expect(getFieldValue(book, schema.fields.find((f) => f.name === 'MaxPlayPoint'))).toBe('3')
  })
  it('keeps root/effect speed fields separate, repeated skins and existing TextId intact', () => {
    const doc = read(), book = listEntities(doc, schema)[0].node
    setFieldValue(book, schema.fields.find((f) => f.name === 'SpeedDiceNum'), '3')
    expect(getFieldValue(book, schema.fields.find((f) => f.name === 'EquipSpeedDiceNum'))).toBe('9')
    expect(getFieldValue(book, schema.fields.find((f) => f.name === 'CharacterSkin'))).toBe('A')
    expect(getTextField(book, 'TextId')).toBe('902')
  })
  it('can add and edit passives without filtering drafts or destroying package/extension data', () => {
    const doc = read(), book = listEntities(doc, schema)[0].node
    editReference(book, 'Passive', -1, 'add')
    expect(referenceNodes(book, 'Passive')).toHaveLength(3)
    editReference(book, 'Passive', 0, { id: '111' })
    const first = referenceNodes(book, 'Passive')[0]
    expect(getAttr(first, 'Pid')).toBe('Other.Mod')
    expect(getAttr(first, 'Future')).toBe('keep')
    editReference(book, 'Passive', 2, { id: '', Pid: 'Another.Mod' })
    expect(referenceNodes(book, 'Passive')).toHaveLength(3)
    expect(corePageProblems(book)).toContain('referenceId')
    editReference(book, 'Passive', 2, { id: '55' })
    editReference(book, 'Passive', 1, 'delete')
    expect(referenceNodes(book, 'Passive').map(getNodeText)).toEqual(['111', '55'])
    const xml = serializeXml(doc)
    expect(xml).toContain('untouched')
    expect(xml).toContain('FutureRoot')
    expect(referenceNodes(book, 'Card')[0]).toMatchObject({ ':@': { '@_Emotion': '3', '@_Level': '2' } })
  })
  it('checks speed ordering without silently fixing authored data', () => {
    const doc = read(), book = listEntities(doc, schema)[0].node
    setFieldValue(book, schema.fields.find((f) => f.name === 'SpeedMin'), '6')
    expect(corePageProblems(book)).toContain('speedOrder')
    expect(getFieldValue(book, schema.fields.find((f) => f.name === 'SpeedMin'))).toBe('6')
  })
})
