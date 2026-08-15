import type { OrderedDoc, OrderedNode } from './xml'
import { parseSingleNode, serializeNode } from './xml'
import type { EntitySchema, FieldDef, ListFieldDef } from './schema'

export interface EntityRef {
  index: number
  id: string
  node: OrderedNode
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/** 元素节点的自身 key（排除属性对象），如 Card、Spec */
export function nodeKey(node: OrderedNode): string | undefined {
  return Object.keys(node).find((k) => !k.startsWith(':'))
}

/** 元素节点的 children 数组 */
export function nodeChildren(node: OrderedNode): unknown[] {
  const key = nodeKey(node)
  if (!key) return []
  const v = (node as any)[key]
  return Array.isArray(v) ? v : []
}

/** 在节点的 children 中查找指定名称的元素节点 */
function findChildNode(node: OrderedNode, name: string): OrderedNode | null {
  const children = nodeChildren(node)
  const idx = children.findIndex((c) => isRecord(c) && Object.keys(c)[0] === name)
  return idx < 0 ? null : (children[idx] as OrderedNode)
}

export function getAttr(node: OrderedNode, name: string): string | undefined {
  const a = (node as any)[':@']
  if (!isRecord(a)) return undefined
  const v = a['@_' + name]
  return typeof v === 'string' ? v : v === undefined ? undefined : String(v)
}

export function setAttr(node: OrderedNode, name: string, value: string | undefined): void {
  let a = (node as any)[':@']
  if (!isRecord(a)) {
    a = {}
    ;(node as any)[':@'] = a
  }
  if (value === undefined || value === '') delete a['@_' + name]
  else a['@_' + name] = value
}

export function childArray(node: OrderedNode, name: string): unknown[] {
  const v = (node as any)[name]
  return Array.isArray(v) ? v : []
}

export function getRootChildren(doc: OrderedDoc, rootName: string): unknown[] {
  const rootNode = doc.find((n) => isRecord(n) && Object.keys(n)[0] === rootName)
  if (!rootNode) return []
  return childArray(rootNode as OrderedNode, rootName)
}

export function getContainerChildren(doc: OrderedDoc, schema: EntitySchema): unknown[] {
  let list = getRootChildren(doc, schema.root)
  for (const seg of schema.containerPath ?? []) {
    const idx = list.findIndex((c) => isRecord(c) && Object.keys(c)[0] === seg)
    if (idx < 0) return []
    list = childArray(list[idx] as OrderedNode, seg)
  }
  return list
}

export function listEntities(doc: OrderedDoc, schema: EntitySchema): EntityRef[] {
  const list = getContainerChildren(doc, schema)
  const refs: EntityRef[] = []
  for (let i = 0; i < list.length; i++) {
    const node = list[i]
    if (!isRecord(node)) continue
    if (Object.keys(node)[0] === schema.entity) {
      refs.push({ index: i, id: getAttr(node as OrderedNode, schema.idAttr) ?? '', node: node as OrderedNode })
    }
  }
  return refs
}

export function insertEntity(doc: OrderedDoc, schema: EntitySchema, node: OrderedNode, at?: number): void {
  const list = getContainerChildren(doc, schema)
  if (at === undefined || at < 0 || at > list.length) list.push(node)
  else list.splice(at, 0, node)
}

export function removeEntity(doc: OrderedDoc, schema: EntitySchema, index: number): void {
  const list = getContainerChildren(doc, schema)
  if (index >= 0 && index < list.length) list.splice(index, 1)
}

export function moveEntity(doc: OrderedDoc, schema: EntitySchema, from: number, to: number): void {
  const list = getContainerChildren(doc, schema)
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) return
  const [item] = list.splice(from, 1)
  list.splice(to, 0, item)
}

export function makeElement(name: string, attrs?: Record<string, string>, text?: string): OrderedNode {
  const node: any = { [name]: text === undefined ? [] : [{ '#text': text }] }
  if (attrs && Object.keys(attrs).length) {
    node[':@'] = Object.fromEntries(Object.entries(attrs).map(([k, v]) => ['@_' + k, String(v)]))
  }
  return node
}

/** 读取实体子元素的文本值 */
export function getTextField(node: OrderedNode, name: string): string | undefined {
  const el = findChildNode(node, name)
  if (!el) return undefined
  const arr = nodeChildren(el)
  for (const c of arr) {
    if (isRecord(c) && '#text' in c) return c['#text'] === undefined ? '' : String(c['#text'])
  }
  return undefined
}

/** 写入实体子元素的文本值（不存在则追加） */
export function setTextField(node: OrderedNode, name: string, value: string): void {
  const children = nodeChildren(node)
  const idx = children.findIndex((c) => isRecord(c) && Object.keys(c)[0] === name)
  if (idx < 0) {
    children.push(makeElement(name, undefined, value))
    return
  }
  const el = children[idx] as OrderedNode
  const arr = nodeChildren(el)
  const textNode = arr.find((c) => isRecord(c) && '#text' in c)
  if (textNode) (textNode as any)['#text'] = value
  else arr.push({ '#text': value })
}

export function getAllText(node: OrderedNode, name: string): string {
  const children = nodeChildren(node)
  const out: string[] = []
  for (const c of children) {
    if (!isRecord(c) || Object.keys(c)[0] !== name) continue
    for (const t of nodeChildren(c as OrderedNode)) {
      if (isRecord(t) && '#text' in t) out.push(String((t as any)['#text']))
    }
  }
  return out.join('\n')
}

export function setAllText(node: OrderedNode, name: string, text: string): void {
  removeField(node, name)
  const lines = text.split(/\r?\n/)
  for (const line of lines) nodeChildren(node).push(makeElement(name, undefined, line))
}

export function removeField(node: OrderedNode, name: string): void {
  const children = nodeChildren(node)
  for (let i = children.length - 1; i >= 0; i--) {
    const c = children[i]
    if (isRecord(c) && Object.keys(c)[0] === name) children.splice(i, 1)
  }
}

export function getMulti(node: OrderedNode, name: string): string[] {
  const children = nodeChildren(node)
  const out: string[] = []
  for (const c of children) {
    if (!isRecord(c) || Object.keys(c)[0] !== name) continue
    for (const t of nodeChildren(c as OrderedNode)) {
      if (isRecord(t) && '#text' in t) out.push(String((t as any)['#text']))
    }
  }
  return out
}

export function setMulti(node: OrderedNode, name: string, values: string[]): void {
  const children = nodeChildren(node)
  for (let i = children.length - 1; i >= 0; i--) {
    const c = children[i]
    if (isRecord(c) && Object.keys(c)[0] === name) children.splice(i, 1)
  }
  for (const v of values) children.push(makeElement(name, undefined, v))
}

export function hasMarker(node: OrderedNode, name: string): boolean {
  return findChildNode(node, name) !== null
}

export function setMarker(node: OrderedNode, name: string, on: boolean): void {
  if (on) {
    if (!findChildNode(node, name)) nodeChildren(node).push(makeElement(name))
  } else {
    removeField(node, name)
  }
}

export function getListRows(node: OrderedNode, field: ListFieldDef): OrderedNode[] {
  const listEl = findChildNode(node, field.name)
  if (!listEl) return []
  return nodeChildren(listEl).filter((c) => isRecord(c) && Object.keys(c)[0] === field.item) as OrderedNode[]
}

export function setListRows(node: OrderedNode, field: ListFieldDef, rows: OrderedNode[]): void {
  removeField(node, field.name)
  if (rows.length === 0) return
  const listEl = makeElement(field.name)
  const arr = nodeChildren(listEl)
  for (const r of rows) arr.push(r)
  nodeChildren(node).push(listEl)
}

/** 按 schema 读取字段值 */
export function getFieldValue(node: OrderedNode, field: FieldDef): unknown {
  switch (field.kind) {
    case 'attrs': {
      const container = findChildNode(node, field.name)
      if (!container) return {}
      const out: Record<string, string> = {}
      for (const a of field.attrs) {
        const v = getAttr(container, a.name)
        if (v !== undefined) out[a.name] = v
      }
      return out
    }
    case 'multi':
      return getMulti(node, field.name)
    case 'marker':
      return hasMarker(node, field.name)
    case 'list':
      return getListRows(node, field)
    case 'multiline':
      if (field.multiLineElements) return getAllText(node, field.name)
      return getTextField(node, field.name)
    case 'attr': {
      const container = findChildNode(node, field.element)
      if (!container) return undefined
      return getAttr(container, field.attr)
    }
    default:
      return getTextField(node, field.name)
  }
}

/** 写入字段值（list 请使用行编辑函数） */
export function setFieldValue(node: OrderedNode, field: FieldDef, value: unknown): void {
  switch (field.kind) {
    case 'attrs': {
      let container = findChildNode(node, field.name)
      if (!container) {
        container = makeElement(field.name)
        nodeChildren(node).push(container)
      }
      const values = (value ?? {}) as Record<string, string>
      for (const a of field.attrs) {
        const v = values[a.name]
        setAttr(container, a.name, v === undefined || v === '' ? undefined : String(v))
      }
      return
    }
    case 'multi':
      setMulti(node, field.name, Array.isArray(value) ? value.map(String) : [])
      return
    case 'marker':
      setMarker(node, field.name, Boolean(value))
      return
    case 'list':
      setListRows(node, field, Array.isArray(value) ? (value as OrderedNode[]) : [])
      return
    case 'multiline':
      if (field.multiLineElements) {
        setAllText(node, field.name, value === undefined ? '' : String(value))
        return
      }
      setTextField(node, field.name, value === undefined ? '' : String(value))
      return
    case 'attr': {
      let container = findChildNode(node, field.element)
      if (!container) {
        container = makeElement(field.element)
        nodeChildren(node).push(container)
      }
      const v = value === undefined || value === '' ? undefined : String(value)
      setAttr(container, field.attr, v)
      return
    }
    default:
      if ((field as any).omitWhenEmpty && (value === undefined || value === '')) {
        removeField(node, field.name)
        return
      }
      setTextField(node, field.name, value === undefined ? '' : String(value))
  }
}

/** 创建带默认值的新实体 */
export function createEntity(schema: EntitySchema, id: string): OrderedNode {
  const node: any = { [schema.entity]: [], ':@': { ['@_' + schema.idAttr]: id } }
  for (const f of schema.fields) {
    switch (f.kind) {
      case 'text':
      case 'multiline':
        setTextField(node, f.name, '')
        break
      case 'int':
        if (!(f as any).optional) setTextField(node, f.name, '0')
        break
      case 'enum':
        setTextField(node, f.name, f.values[0] ?? '')
        break
      case 'attrs':
        nodeChildren(node).push(makeElement(f.name))
        break
      default:
        break
    }
  }
  for (const [name, value] of Object.entries(schema.defaults ?? {})) {
    const field = schema.fields.find((f) => f.name === name)
    if (field) setFieldValue(node, field, value)
  }
  for (const [name, value] of Object.entries(schema.locked ?? {})) {
    setTextField(node, name, value)
  }
  return node
}

export function replaceEntityNode(doc: OrderedDoc, schema: EntitySchema, index: number, newNode: OrderedNode): void {
  const list = getContainerChildren(doc, schema)
  if (index >= 0 && index < list.length) list[index] = newNode
}

export function serializeEntity(_entityName: string, node: OrderedNode): string {
  return serializeNode(node)
}

export function parseEntityChunk(text: string, entityName: string): OrderedNode | null {
  return parseSingleNode(text, entityName)
}
