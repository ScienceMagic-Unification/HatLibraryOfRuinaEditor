// HTML4 named entities accepted by the plugin's System.Net.WebUtility.HtmlDecode.
import entities from './keywordEntities.json'

/** Consume whole quoted tags, including delimiters inside attribute values. */
export const nativeTagPattern = String.raw`<(?:[^<>"']|"[^"]*"|'[^']*')*>`
const waveTagPattern = String.raw`\(~(?:[^~"']|~(?!\))|"[^"]*"|'[^']*')*~\)`
export const markupTokens = (): RegExp => new RegExp(String.raw`<noparse>[\s\S]*?(?:</noparse>|$)|\(~noparse~\)[\s\S]*?(?:\(~/noparse~\)|$)|${nativeTagPattern}|${waveTagPattern}`, 'g')
const tagStart = new RegExp(`^(?:${nativeTagPattern}|${waveTagPattern})`)
export const tagAt = (text: string): string | undefined => tagStart.exec(text)?.[0]

/** Convert tag delimiters only: attribute text and noparse examples stay literal. */
export function normalizeKeywordTags(source: string): string {
  return source.replace(markupTokens(), (token) => {
    if (token.startsWith('(~noparse~)')) return '<noparse>' + token.slice(11).replace(/\(~\/noparse~\)$/, '</noparse>')
    if (token.startsWith('<noparse>')) return token
    return token.startsWith('(~') ? '<' + token.slice(2, -2) + '>' : token
  })
}

/** Decode the inner attribute once, after the document reader decodes outer XML. */
export function decodeKeywordAttribute(value: string): string {
  return value.replace(/&(#(?:x|X)[0-9a-fA-F]+|#\d+|[A-Za-z][A-Za-z0-9]+);/g, (entity, key: string) => {
    if (!key.startsWith('#')) return Object.hasOwn(entities, key) ? entities[key as keyof typeof entities] : entity
    const point = /^#x/i.test(key) ? parseInt(key.slice(2), 16) : Number(key.slice(1))
    return point >= 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : entity
  })
}

export function parseKeywordValue(token: string): { id: string; value: string } | undefined {
  const native = token.startsWith('(~') ? '<' + token.slice(2, -2) + '>' : token
  const match = /^<HatKeyword([\s\S]*)\/>$/.exec(native)
  if (!match || tagAt(token) !== token) return undefined
  const attributes = match[1]
  const attribute = /\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/y
  const values = new Map<string, string>()
  let position = 0
  while (attributes.slice(position).trim()) {
    attribute.lastIndex = position
    const next = attribute.exec(attributes)
    if (!next || !['id', 'value'].includes(next[1]) || values.has(next[1])) return undefined
    values.set(next[1], decodeKeywordAttribute(next[2] ?? next[3]))
    position = attribute.lastIndex
  }
  const id = values.get('id'), value = values.get('value')
  return id && !/["<>]/.test(id) && value !== undefined ? { id, value } : undefined
}

export const encodeKeywordAttribute = (value: string): string => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
