import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  inferEntitySchema,
  parseXml,
  serializeXml,
  serializeNode,
  parseSingleNode,
  listEntities,
  getTextField,
  setTextField,
  getMulti,
  setMulti,
  hasMarker,
  setMarker,
  getListRows,
  setListRows,
  makeElement,
  getAttr,
  setAttr,
  getFieldValue,
  setFieldValue,
  createEntity,
  insertEntity,
  removeEntity,
  removeField,
  getRootChildren,
  validateEntities,
  previewRegex,
  applyRegex,
  SnapshotHistory
} from '../src/index'
import type { EntitySchema, ModuleDefinition } from '../src/index'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = readFileSync(join(here, 'fixtures', 'cardinfo-sample.xml'), 'utf8')

const schema: EntitySchema = {
  root: 'DiceCardXmlRoot',
  entity: 'Card',
  idAttr: 'ID',
  fields: [
    { kind: 'text', name: 'Name', required: true },
    { kind: 'int', name: 'TextId' },
    { kind: 'text', name: 'Artwork' },
    { kind: 'enum', name: 'Rarity', values: ['Common', 'Uncommon', 'Rare', 'Unique'] },
    {
      kind: 'attrs',
      name: 'Spec',
      attrs: [
        { kind: 'enum', name: 'Range', values: ['Near', 'Far', 'FarArea', 'FarAreaEach', 'Instance', 'Special'] },
        { kind: 'int', name: 'Cost' },
        { kind: 'enum', name: 'Affection', values: ['One', 'All'] },
        { kind: 'int', name: 'EmotionLimit' }
      ]
    },
    {
      kind: 'list',
      name: 'BehaviourList',
      item: 'Behaviour',
      attrs: [
        { kind: 'int', name: 'Min' },
        { kind: 'int', name: 'Dice' },
        { kind: 'enum', name: 'Type', values: ['Atk', 'Def', 'Standby'] }
      ]
    },
    { kind: 'multi', name: 'Option', values: ['Personal', 'OnlyPage', 'NoInventory', 'EgoPersonal', 'ExhaustOnUse'] },
    { kind: 'marker', name: 'SpecialEffect' }
  ]
}

describe('XML 保真读写', () => {
  it('解析后序列化：注释、实体数、属性、多值与空标记全部保留', () => {
    const doc = parseXml(fixture)
    const out = serializeXml(doc)
    expect((out.match(/<!--/g) ?? []).length).toBe((fixture.match(/<!--/g) ?? []).length)
    expect((out.match(/<Card /g) ?? []).length).toBe(2)
    expect(out).toContain('Range="Far"')
    expect(out).toContain('<SpecialEffect/>')
    expect(out).toContain('<Option>OnlyPage</Option>')
    expect(out).toContain('<Keyword>onlypage_Test</Keyword>')
    const reparsed = listEntities(parseXml(out), schema)
    expect(reparsed.length).toBe(2)
    expect(reparsed[0].id).toBe('1')
    expect(reparsed[1].id).toBe('2')
  })

  it('实体片段序列化与解析可往返', () => {
    const doc = parseXml(fixture)
    const ref = listEntities(doc, schema)[0]
    const chunk = serializeNode(ref.node)
    expect(chunk).toContain('<Card ID="1">')
    const parsed = parseSingleNode(chunk, 'Card')
    expect(parsed).not.toBeNull()
    expect(getTextField(parsed!, 'Name')).toBe('常规弹')
  })
})

describe('字段读写', () => {
  it('文本字段读取与写入', () => {
    const doc = parseXml(fixture)
    const ref = listEntities(doc, schema)[0]
    expect(getTextField(ref.node, 'Name')).toBe('常规弹')
    setTextField(ref.node, 'Name', '新名字')
    expect(serializeXml(doc)).toContain('<Name>新名字</Name>')
  })

  it('多值与标记', () => {
    const doc = parseXml(fixture)
    const ref = listEntities(doc, schema)[1]
    expect(getMulti(ref.node, 'Option')).toEqual(['NoInventory', 'OnlyPage'])
    setMulti(ref.node, 'Option', ['Personal'])
    expect(getMulti(ref.node, 'Option')).toEqual(['Personal'])
    expect(hasMarker(ref.node, 'SpecialEffect')).toBe(false)
    setMarker(ref.node, 'SpecialEffect', true)
    expect(hasMarker(ref.node, 'SpecialEffect')).toBe(true)
  })

  it('属性组与列表行', () => {
    const doc = parseXml(fixture)
    const ref = listEntities(doc, schema)[0]
    const spec = getFieldValue(ref.node, schema.fields[4]) as Record<string, string>
    expect(spec.Range).toBe('Far')
    setFieldValue(ref.node, schema.fields[4], { Range: 'Near', Cost: '2', Affection: 'All', EmotionLimit: '3' })
    expect(serializeXml(doc)).toContain('Range="Near"')
    const rows = getListRows(ref.node, schema.fields[5] as any)
    expect(rows.length).toBe(1)
    const newRow = makeElement('Behaviour', { Min: '9', Dice: '9', Type: 'Atk' })
    setListRows(ref.node, schema.fields[5] as any, [...rows, newRow])
    expect(getListRows(ref.node, schema.fields[5] as any).length).toBe(2)
    setFieldValue(ref.node, schema.fields[5] as any, [])
    expect(getListRows(ref.node, schema.fields[5] as any).length).toBe(0)
    setFieldValue(ref.node, schema.fields[5] as any, [newRow])
    expect(getListRows(ref.node, schema.fields[5] as any).length).toBe(1)
  })

  it('新增、删除实体', () => {
    const doc = parseXml(fixture)
    const fresh = createEntity(schema, '99')
    setTextField(fresh, 'Name', '新卡')
    insertEntity(doc, schema, fresh)
    let refs = listEntities(doc, schema)
    expect(refs.length).toBe(3)
    removeEntity(doc, schema, refs[2].index)
    expect(listEntities(doc, schema).length).toBe(2)
  })

  it('根节点属性保留（命名空间）', () => {
    const doc = parseXml(fixture)
    const rootChildren = getRootChildren(doc, 'DiceCardXmlRoot')
    const rootNode = doc.find((n) => n && typeof n === 'object' && Object.keys(n)[0] === 'DiceCardXmlRoot') as any
    expect(getAttr(rootNode, 'xmlns:xsd')).toBe('http://www.w3.org/2001/XMLSchema')
    expect(rootChildren.length).toBeGreaterThan(0)
  })
})

describe('校验', () => {
  it('重复 ID 与非法枚举、必填缺失', () => {
    const doc = parseXml(fixture)
    const ref = listEntities(doc, schema)[1]
    setAttr(ref.node, 'ID', '1')
    setTextField(ref.node, 'Rarity', 'Legendary')
    setTextField(ref.node, 'Name', '')
    const issues = validateEntities(doc, schema)
    expect(issues.some((i) => i.message.includes('必须唯一'))).toBe(true)
    expect(issues.some((i) => i.message.includes('Legendary'))).toBe(true)
    expect(issues.some((i) => i.message.includes('必填'))).toBe(true)
  })
})

describe('正则引擎', () => {
  it('预览命中并应用替换', () => {
    const text = '<Name>常规弹</Name>\n<Name>狙击弹</Name>'
    const prev = previewRegex(text, '<Name>', 'g')
    expect(prev.count).toBe(2)
    const applied = applyRegex(text, '<Name>', '<Skill>', 'g')
    expect(applied.count).toBe(2)
    expect(applied.text).toContain('<Skill>常规弹</Name>')
  })

  it('非法正则返回错误', () => {
    const prev = previewRegex('abc', '([', 'g')
    expect(prev.error).toBeTruthy()
  })
})

describe('撤销/重做', () => {
  it('快照栈往返', () => {
    const h = new SnapshotHistory()
    h.push('v0')
    expect(h.undo('v1')).toBe('v0')
    expect(h.canRedo).toBe(true)
    expect(h.redo('v0')).toBe('v1')
    expect(h.canUndo).toBe(true)
  })
})


describe('自适应 Schema 推断', () => {
  it('忽略注释并推断实体、ID 属性与字段', () => {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<StageXmlRoot>
  <Version>1.1</Version>
  <!-- 章节注释 -->
  <Stage id="1">
    <Name>测试关卡</Name>
    <FloorNum>1</FloorNum>
    <Chapter>6</Chapter>
    <Wave>
      <Unit>11</Unit>
      <Unit>12</Unit>
    </Wave>
    <Marker />
  </Stage>
  <Stage id="2"><Name>第二关</Name></Stage>
</StageXmlRoot>`
    const schema = inferEntitySchema(parseXml(xml))
    expect(schema).not.toBeNull()
    expect(schema!.entity).toBe('Stage')
    expect(schema!.idAttr).toBe('id')
    expect(schema!.fields.map((f) => f.name)).toContain('Name')
    expect(schema!.fields.map((f) => f.name)).toContain('Marker')
    expect(schema!.displayField).toBe('Name')
  })
})
describe('锁定字段与 attr 属性字段', () => {
  const schema2: EntitySchema = {
    root: 'DiceCardXmlRoot',
    entity: 'Card',
    idAttr: 'ID',
    locked: { TextId: '-1' },
    defaults: { Range: 'Near', Cost: '0' },
    fields: [
      { kind: 'text', name: 'Name' },
      { kind: 'attr', element: 'Spec', attr: 'Range', name: 'Range', field: { kind: 'enum', name: 'Range', values: ['Near', 'Far'] } },
      { kind: 'attr', element: 'Spec', attr: 'Cost', name: 'Cost', field: { kind: 'int', name: 'Cost', digitsOnly: true } }
    ]
  }

  it('新建实体写入锁定值 TextId=-1 与默认值', () => {
    const node = createEntity(schema2, '10')
    expect(getTextField(node, 'TextId')).toBe('-1')
    expect(getFieldValue(node, schema2.fields[1])).toBe('Near')
    expect(getFieldValue(node, schema2.fields[2])).toBe('0')
  })

  it('attr 字段读写到 Spec 元素属性', () => {
    const node = createEntity(schema2, '11')
    setFieldValue(node, schema2.fields[1], 'Far')
    setFieldValue(node, schema2.fields[2], '3')
    expect(getFieldValue(node, schema2.fields[1])).toBe('Far')
    expect(getFieldValue(node, schema2.fields[2])).toBe('3')
  })
})
describe('移除字段', () => {
  it('removeField 从实体中移除 SpecialEffect', () => {
    const doc = parseXml('<Card ID="1"><SpecialEffect /><Name>测试</Name></Card>')
    const node = doc.find((n) => n && typeof n === 'object' && Object.keys(n)[0] === 'Card')
    removeField(node as any, 'SpecialEffect')
    expect(serializeXml(doc)).not.toContain('SpecialEffect')
  })
})


describe('child 容器子元素字段', () => {
  const childSchema: EntitySchema = {
    root: 'BookXmlRoot',
    entity: 'Book',
    idAttr: 'ID',
    fields: [
      { kind: 'child', element: 'EquipEffect', name: 'HP', field: { kind: 'int', name: 'HP', digitsOnly: true } },
      { kind: 'child', element: 'EquipEffect', name: 'SResist', field: { kind: 'enum', name: 'SResist', values: ['Normal', 'Endure', 'Weak', 'Vulnerable', 'Immune'] } },
      { kind: 'child', element: 'EquipEffect', name: 'CustomOnlyCard', field: { kind: 'multi', name: 'CustomOnlyCard' } },
      { kind: 'child', element: 'TextList', name: 'Desc', field: { kind: 'multiline', name: 'Desc', multiLineElements: true } }
    ]
  }

  it('读取并写入嵌套容器中的标量/枚举/多值/多行字段', () => {
    const doc = parseXml('<BookXmlRoot><Book ID="1"><EquipEffect><HP>280</HP><SResist>Endure</SResist><CustomOnlyCard>107</CustomOnlyCard><CustomOnlyCard>109</CustomOnlyCard></EquipEffect><TextList><Desc>第一段</Desc><Desc>第二段</Desc></TextList></Book></BookXmlRoot>')
    const ref = listEntities(doc, childSchema)[0]
    expect(getFieldValue(ref.node, childSchema.fields[0])).toBe('280')
    setFieldValue(ref.node, childSchema.fields[0], '300')
    expect(serializeXml(doc)).toContain('<HP>300</HP>')
    expect(getFieldValue(ref.node, childSchema.fields[1])).toBe('Endure')
    setFieldValue(ref.node, childSchema.fields[1], 'Immune')
    expect(serializeXml(doc)).toContain('<SResist>Immune</SResist>')
    expect(getFieldValue(ref.node, childSchema.fields[2])).toEqual(['107', '109'])
    setFieldValue(ref.node, childSchema.fields[2], ['201'])
    expect(getFieldValue(ref.node, childSchema.fields[2])).toEqual(['201'])
    expect(getFieldValue(ref.node, childSchema.fields[3])).toBe('第一段\n第二段')
    setFieldValue(ref.node, childSchema.fields[3], 'A\nB\nC')
    expect(serializeXml(doc)).toContain('<Desc>A</Desc>')
    expect(getFieldValue(ref.node, childSchema.fields[3])).toBe('A\nB\nC')
  })

  it('容器缺失时返回默认值，写入时自动创建容器', () => {
    const doc = parseXml('<BookXmlRoot><Book ID="2"><Name>空</Name></Book></BookXmlRoot>')
    const ref = listEntities(doc, childSchema)[0]
    expect(getFieldValue(ref.node, childSchema.fields[0])).toBeUndefined()
    expect(getFieldValue(ref.node, childSchema.fields[2])).toEqual([])
    setFieldValue(ref.node, childSchema.fields[0], '100')
    expect(serializeXml(doc)).toContain('<EquipEffect>')
    expect(serializeXml(doc)).toContain('<HP>100</HP>')
  })
})
