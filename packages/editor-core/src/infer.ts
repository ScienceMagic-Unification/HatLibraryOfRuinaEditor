import type { OrderedDoc, OrderedNode } from './xml'
import type { EntitySchema, FieldDef, ScalarFieldDef } from './schema'
import { getRootChildren, nodeChildren } from './document'

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/** 取文档的根节点名（跳过 XML 声明与注释） */
export function findRootName(doc: OrderedDoc): string | null {
  for (const n of doc) {
    if (!isRecord(n)) continue
    const key = Object.keys(n)[0]
    if (!key.startsWith('?') && key !== '#text' && key !== '#comment') return key
  }
  return null
}

/** 从一个实体节点的属性对象中还原属性名（去掉 @_ 前缀） */
function attrNames(node: OrderedNode): string[] {
  const a = (node as any)[':@']
  if (!isRecord(a)) return []
  return Object.keys(a)
    .map((k) => (k.startsWith('@_') ? k.slice(2) : k))
    .filter((k) => k !== 'xmlns:xsd' && k !== 'xmlns:xsi')
}

function elementChildren(node: OrderedNode): OrderedNode[] {
  return nodeChildren(node).filter((c) => isRecord(c) && Object.keys(c)[0] !== '#text' && Object.keys(c)[0] !== '#comment') as OrderedNode[]
}

function textOf(node: OrderedNode): string {
  const arr = nodeChildren(node)
  for (const c of arr) {
    if (isRecord(c) && '#text' in c) return String((c as any)['#text'])
  }
  return ''
}

function inferScalar(name: string, sampleText: string): ScalarFieldDef {
  if (/^-?\d+$/.test(sampleText.trim())) return { kind: 'int', name }
  if (sampleText.includes('\n')) return { kind: 'multiline', name }
  return { kind: 'text', name }
}

/**
 * 自适应 Schema 推断：用于未在注册表中声明根节点的 XML，
 * 让任意 Mod XML 都能自动生成一个可编辑工作区。
 */
export function inferEntitySchema(doc: OrderedDoc, rootName?: string): EntitySchema | null {
  const root = rootName ?? findRootName(doc)
  if (!root) return null
  const rootChildren = getRootChildren(doc, root)
  const rootElements = rootChildren.filter((c) => isRecord(c) && Object.keys(c)[0] !== '#text' && Object.keys(c)[0] !== '#comment') as OrderedNode[]

  // 找出出现次数最多的实体名
  const counts = new Map<string, { count: number; sample: OrderedNode }>()
  for (const el of rootElements) {
    const key = Object.keys(el)[0]
    const cur = counts.get(key)
    if (cur) cur.count++
    else counts.set(key, { count: 1, sample: el })
  }
  let entity = ''
  let sample: OrderedNode | null = null
  let containerPath: string[] | undefined
  for (const [key, info] of counts) {
    if (key === 'Version' && info.count === 1) continue
    if (info.count > (counts.get(entity)?.count ?? 0)) {
      entity = key
      sample = info.sample
    }
  }
  if (!entity || !sample) return null

  // 实体不在根节点直属时，找容器（例如 cardDescList）
  if (!rootElements.some((el) => Object.keys(el)[0] === entity)) {
    for (const el of rootElements) {
      const inner = elementChildren(el)
      if (inner.some((c) => Object.keys(c)[0] === entity)) {
        containerPath = [Object.keys(el)[0]]
        sample = inner.find((c) => Object.keys(c)[0] === entity) ?? sample
        break
      }
    }
  }

  const attrs = attrNames(sample)
  const idAttr = attrs.includes('ID') ? 'ID' : attrs.includes('id') ? 'id' : attrs[0] ?? 'ID'

  const children = elementChildren(sample)
  const groups = new Map<string, OrderedNode[]>()
  for (const c of children) {
    const key = Object.keys(c)[0]
    const arr = groups.get(key) ?? []
    arr.push(c)
    groups.set(key, arr)
  }

  const fields: FieldDef[] = []
  for (const [name, nodes] of groups) {
    const first = nodes[0]
    const firstAttrs = attrNames(first)
    const text = textOf(first)
    const hasElementChildren = elementChildren(first).length > 0
    if (firstAttrs.length === 0 && text.trim() === '' && !hasElementChildren) {
      fields.push({ kind: 'marker', name })
    } else if (firstAttrs.length > 0 && text.trim() === '' && !hasElementChildren) {
      fields.push({
        kind: 'attrs',
        name,
        attrs: firstAttrs.map((a) => inferScalar(a, String((first as any)[':@']['@_' + a] ?? '')))
      })
    } else if (hasElementChildren) {
      const inner = elementChildren(first)
      const item = inner.find((c) => !Object.keys(c)[0].startsWith('#')) ?? inner[0]
      const itemName = Object.keys(item)[0]
      fields.push({
        kind: 'list',
        name,
        item: itemName,
        attrs: attrNames(item).map((a) => inferScalar(a, String((item as any)[':@']['@_' + a] ?? '')))
      })
    } else if (nodes.length > 1) {
      fields.push({ kind: 'multi', name })
    } else {
      fields.push(inferScalar(name, text))
    }
  }

  const displayField = fields.some((f) => f.name === 'Name')
    ? 'Name'
    : fields.find((f) => f.kind === 'text' || f.kind === 'multiline')?.name
  const quickFields = (displayField ? [displayField] : []).concat(
    fields
      .filter((f) => (f.kind === 'text' || f.kind === 'int' || f.kind === 'enum' || f.kind === 'attrs') && f.name !== displayField)
      .slice(0, 4)
      .map((f) => f.name)
  )

  return { root, entity, idAttr, containerPath, displayField, quickFields, fields }
}