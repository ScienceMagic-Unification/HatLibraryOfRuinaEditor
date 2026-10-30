import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createEntity, findChildNode, getAttr, getFieldValue, getListRows, getNodeText, getTextField, listEntities, makeElement, parseXml, serializeXml, setFieldValue, setListRows, setNodeText, validateEntities, type ListFieldDef } from '../src/index'
import { workspaceModules, namesModule, stageModule, battleDialogModule, deckModule, emotionCardModule, giftModule } from '../../schemas/src/workspaces'
import { enemyModule } from '../../schemas/src/enemy'

const fixtureRoot = new URL('../../../docs/verification/workspaces-mod/', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('manifest.json', fixtureRoot), 'utf8')) as { id: string; file: string }[]
const load = (id: string) => parseXml(readFileSync(new URL(manifest.find((entry) => entry.id === id)!.file, fixtureRoot), 'utf8'))

describe('BaseMod workspace schemas', () => {
  for (const module of [...workspaceModules, enemyModule]) it(`${module.id}: identifies original records and survives serialization`, () => {
    const doc = load(module.id)
    const before = listEntities(doc, module.entity)
    expect(before.length).toBeGreaterThan(0)
    expect(before.every((ref) => ref.id !== '')).toBe(true)
    const restored = parseXml(serializeXml(doc))
    expect(listEntities(restored, module.entity).map((ref) => ref.id)).toEqual(before.map((ref) => ref.id))
    expect(validateEntities(restored, module.entity).filter((issue) => issue.severity === 'error')).toEqual([])
  })

  it('edits nested waves without dropping repeated enemies, extension attributes or siblings', () => {
    const doc = parseXml('<StageXmlRoot><Stage id="1"><Wave Extra="keep"><Unit Pid="mod">2</Unit><!--keep--><Unit>2</Unit><Future>extension</Future></Wave><MapInfo>A</MapInfo></Stage></StageXmlRoot>')
    const node = listEntities(doc, stageModule.entity)[0].node
    const waveField = stageModule.entity.fields.find((field) => field.name === 'Wave') as ListFieldDef
    const waves = getListRows(node, waveField)
    const unitField = waveField.fields!.find((field) => field.name === 'Unit') as ListFieldDef
    const units = getListRows(waves[0], unitField)
    setNodeText(units[1], '21')
    setListRows(waves[0], unitField, [...units, makeElement('Unit', undefined, '2')])
    setListRows(node, waveField, waves)
    const saved = serializeXml(doc)
    expect(saved).toContain('Extra="keep"')
    expect(saved).toContain('Pid="mod"')
    expect(saved).toContain('<!--keep-->')
    expect(getTextField(waves[0], 'Future')).toBe('extension')
    expect(getTextField(node, 'MapInfo')).toBe('A')
    expect(getListRows(waves[0], unitField).map(getNodeText)).toEqual(['2', '21', '2'])
    expect(getAttr(listEntities(parseXml(saved), stageModule.entity)[0].node, 'ID')).toBeUndefined()
  })

  it('clears list rows while retaining container metadata and extension nodes', () => {
    const node = makeElement('Entry')
    const field: ListFieldDef = { kind: 'list', name: 'Container', item: 'Item', attrs: [] }
    const parsed = parseXml('<Root><Entry ID="1"><Container Future="yes"><Item>1</Item><Extension>keep</Extension></Container><Name>keep</Name></Entry></Root>')
    const entry = listEntities(parsed, { root: 'Root', entity: 'Entry', idAttr: 'ID', fields: [] })[0].node
    setListRows(entry, field, [])
    expect(getListRows(entry, field)).toEqual([])
    expect(getAttr(findChildNode(entry, 'Container')!, 'Future')).toBe('yes')
    expect(getTextField(findChildNode(entry, 'Container')!, 'Extension')).toBe('keep')
    setListRows(node, field, [])
    expect(findChildNode(node, 'Container')).toBeNull()
  })

  it('writes direct localized text without introducing a nested Text element', () => {
    const doc = load('character-stage-names')
    const node = listEntities(doc, namesModule.entity)[0].node
    const field = namesModule.entity.fields[0]
    setFieldValue(node, field, '名称 & <关键词>')
    const restored = listEntities(parseXml(serializeXml(doc)), namesModule.entity)[0].node
    expect(getFieldValue(restored, field)).toBe('名称 & <关键词>')
    expect(findChildNode(restored, 'Text')).toBeNull()
    expect(findChildNode(createEntity(namesModule.entity, '21'), 'Text')).toBeNull()
  })

  it('keeps duplicate cards in deck order', () => {
    const doc = parseXml('<DeckXmlRoot><Deck ID="1"><Card>2</Card><Card>2</Card><Card>21</Card></Deck></DeckXmlRoot>')
    const node = listEntities(doc, deckModule.entity)[0].node
    const field = deckModule.entity.fields[0] as ListFieldDef
    const rows = getListRows(node, field)
    setListRows(node, field, [rows[2], rows[0], rows[1]])
    expect(getListRows(node, field).map(getNodeText)).toEqual(['21', '2', '2'])
  })

  it('validates numeric values inside nested rows', () => {
    const doc = parseXml('<StageXmlRoot><Stage id="1"><Wave><Unit>bad-id</Unit></Wave></Stage></StageXmlRoot>')
    expect(validateEntities(doc, stageModule.entity).some((issue) => issue.message.includes('bad-id'))).toBe(true)
  })

  it('preserves enemy emotion text, repeated key pages and decimal drop bonuses', () => {
    const doc = parseXml('<EnemyUnitClassRoot><Enemy ID="1"><BookId>2</BookId><BookId>21</BookId><DropBonus>0.5</DropBonus><Emotion Level="1" State="Negative">1022003</Emotion><Emotion>2</Emotion></Enemy></EnemyUnitClassRoot>')
    const node = listEntities(doc, enemyModule.entity)[0].node
    const emotion = enemyModule.entity.fields.find((field) => field.name === 'Emotion') as ListFieldDef
    const rows = getListRows(node, emotion)
    setNodeText(rows[1], '3'); setListRows(node, emotion, rows)
    expect(getListRows(node, emotion).map(getNodeText)).toEqual(['1022003', '3'])
    expect(getAttr(rows[0], 'State')).toBe('Negative')
    expect(getFieldValue(node, enemyModule.entity.fields.find((field) => field.name === 'DropBonus')!)).toBe('0.5')
    expect(getListRows(node, enemyModule.entity.fields.find((field) => field.name === 'BookId') as ListFieldDef).map(getNodeText)).toEqual(['2', '21'])
    expect(validateEntities(doc, enemyModule.entity).filter((issue) => issue.severity === 'error')).toEqual([])
  })

  it('reads multiple scripts, floor restrictions and gift passives', () => {
    const emotion = listEntities(parseXml('<EmotionCardXmlRoot><EmotionCard ID="1"><Script>a</Script><Script>b</Script></EmotionCard></EmotionCardXmlRoot>'), emotionCardModule.entity)[0].node
    expect(getFieldValue(emotion, emotionCardModule.entity.fields.find((field) => field.name === 'Script')!)).toEqual(['a', 'b'])
    const stage = listEntities(parseXml('<StageXmlRoot><Stage id="1"><FloorOnly>Hod</FloorOnly><FloorOnly>Keter</FloorOnly></Stage></StageXmlRoot>'), stageModule.entity)[0].node
    expect(getFieldValue(stage, stageModule.entity.fields.find((field) => field.name === 'FloorOnly')!)).toEqual(['Hod', 'Keter'])
    const gift = listEntities(parseXml('<GiftXmlRoot><Gift ID="1"><Passive>100</Passive><Passive>101</Passive></Gift></GiftXmlRoot>'), giftModule.entity)[0].node
    expect(getListRows(gift, giftModule.entity.fields.find((field) => field.name === 'Passive') as ListFieldDef).map(getNodeText)).toEqual(['100', '101'])
  })

  it('edits dialogue text without losing its event ID or root group', () => {
    const doc = load('battledialog')
    const node = listEntities(doc, battleDialogModule.entity)[0].node
    const types = getListRows(node, battleDialogModule.entity.fields[0] as ListFieldDef)
    const field = (battleDialogModule.entity.fields[0] as ListFieldDef).fields![0] as ListFieldDef
    const lines = getListRows(types[0], field)
    const id = getAttr(lines[0], 'ID')
    setNodeText(lines[0], '测试对白')
    setListRows(types[0], field, lines)
    expect(getAttr(lines[0], 'ID')).toBe(id)
    expect(serializeXml(doc)).toContain('<GroupName>AwlOfNight</GroupName>')
    expect(serializeXml(doc)).toContain('测试对白')
  })
})
