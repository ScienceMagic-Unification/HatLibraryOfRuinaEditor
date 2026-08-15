import { XMLParser, XMLBuilder } from 'fast-xml-parser'

/**
 * 以 fast-xml-parser 的 preserveOrder 数组结构作为 AST。
 * 结构示例：
 *   [{ "?xml": [...], ":@": {...} }, { "DiceCardXmlRoot": [ { "#text":"\n" }, { "Card": [...], ":@": {"@_ID":"1"} } ] }]
 */
export type OrderedNode = Record<string, unknown>
export type OrderedDoc = unknown[]

const PARSER_OPTIONS = {
  ignoreAttributes: false,
  preserveOrder: true,
  commentPropName: '#comment',
  textNodeName: '#text',
  trimValues: false,
  processEntities: true,
  parseTagValue: false,
  parseAttributeValue: false,
  attributeNamePrefix: '@_'
} as const

const BUILDER_OPTIONS = {
  ignoreAttributes: false,
  preserveOrder: true,
  commentPropName: '#comment',
  textNodeName: '#text',
  format: true,
  indentBy: '  ',
  suppressEmptyNode: true,
  processEntities: true,
  attributeNamePrefix: '@_'
} as const

function normalizeComments(node: unknown): void {
  if (Array.isArray(node)) {
    for (const n of node) normalizeComments(n)
    return
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    for (const k of Object.keys(obj)) {
      if (k === '#comment' && typeof obj[k] === 'string') {
        obj[k] = [{ '#text': obj[k] }]
      } else {
        normalizeComments(obj[k])
      }
    }
  }
}

/** 移除仅含空白的 #text 节点（保留 PI 与注释内部），交给格式化器统一缩进 */
function stripWhitespaceText(node: unknown): void {
  if (Array.isArray(node)) {
    for (let i = node.length - 1; i >= 0; i--) {
      const n = node[i]
      if (
        n &&
        typeof n === 'object' &&
        !Array.isArray(n) &&
        Object.keys(n).length === 1 &&
        typeof (n as Record<string, unknown>)['#text'] === 'string' &&
        String((n as Record<string, unknown>)['#text']).trim() === ''
      ) {
        node.splice(i, 1)
        continue
      }
      stripWhitespaceText(n)
    }
    return
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    for (const k of Object.keys(obj)) {
      if (k.startsWith('?')) continue
      stripWhitespaceText(obj[k])
    }
  }
}

export function parseXml(text: string): OrderedDoc {
  const parser = new XMLParser(PARSER_OPTIONS)
  const doc = parser.parse(text)
  normalizeComments(doc)
  return doc as OrderedDoc
}

export function serializeXml(doc: OrderedDoc): string {
  const clone = structuredClone(doc)
  stripWhitespaceText(clone)
  const builder = new XMLBuilder(BUILDER_OPTIONS)
  let out = builder.build(clone)
  if (!out.endsWith('\n')) out += '\n'
  return out
}

/** 将单个实体节点（如 Card）序列化为独立 XML 片段 */
export function serializeNode(node: OrderedNode): string {
  const clone = structuredClone([node])
  stripWhitespaceText(clone)
  const builder = new XMLBuilder(BUILDER_OPTIONS)
  let out = builder.build(clone)
  return out.trimEnd() + '\n'
}

/** 从独立片段中解析回单个节点（取第一个元素节点） */
export function parseSingleNode(text: string, expectedName?: string): OrderedNode | null {
  const doc = parseXml(text)
  for (const n of doc) {
    if (n && typeof n === 'object' && !Array.isArray(n)) {
      const key = Object.keys(n)[0]
      if (key.startsWith('#text') || key.startsWith('?')) continue
      if (!expectedName || key === expectedName) return n as OrderedNode
    }
  }
  return null
}
