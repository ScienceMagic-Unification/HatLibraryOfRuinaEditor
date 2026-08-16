import { Fragment, useMemo, type ReactNode } from 'react'
import { useAppStore } from '../store'
import type { BattleEffectTextEntry } from '../lib/previewRules'
import { resolveBuiltinIconUrl } from '../lib/builtinIcons'

const SELF_KEYWORD = /^\(~(HatKeyword|HatKeywordLink|HatKeywordIcon)\s+id="([^"]+)"\/~\)/
const OPEN_KEYWORD = /^\(~(HatKeyword|HatKeywordLink|HatKeywordIcon)\s+id="([^"]+)"~\)/
const CLOSE_KEYWORD = /^\(~\/HatKeyword~\)/
const OPEN_COLOR = /^\(~color=(#[0-9A-Fa-f]{3,8})~\)/
const CLOSE_COLOR = /^\(~\/color~\)/
const OPEN_STYLE = /^\(~(u|b|i)~\)/
const CLOSE_STYLE = /^\(~\/(u|b|i)~\)/

type Scope = 'ability' | 'passive' | 'self' | 'all'
type RecPair = [string, BattleEffectTextEntry]

interface RenderResult {
  nodes: ReactNode[]
  index: number
}

function scopeMatch(entry: BattleEffectTextEntry, scope: Scope): boolean {
  if (scope === 'all') return entry.isChangeSelf || entry.isChangeAbility || entry.isChangePassive
  if (scope === 'ability') return entry.isChangeAbility
  if (scope === 'passive') return entry.isChangePassive
  return entry.isChangeSelf
}

function tokenStyle(entry: BattleEffectTextEntry): React.CSSProperties {
  return {
    color: entry.color || undefined,
    fontWeight: entry.isBold ? 700 : undefined,
    fontStyle: entry.isItalic ? 'italic' : undefined,
    textDecoration: entry.isUnderline ? 'underline' : undefined
  }
}

function htmlStyle(tag: string): React.CSSProperties {
  if (tag === 'u') return { textDecoration: 'underline' }
  if (tag === 'b') return { fontWeight: 700 }
  return { fontStyle: 'italic' }
}

function iconNode(entry: BattleEffectTextEntry, k: string, extra?: Record<string, string>): ReactNode {
  const icon = resolveBuiltinIconUrl(entry.keywordIconId, extra)
  return icon ? (
    <img key={`icon-${k}`} src={icon} alt="" className="inline-block size-4 shrink-0 object-contain align-[-3px]" draggable={false} />
  ) : null
}

function keywordToken(entry: BattleEffectTextEntry, children: ReactNode[] | null, k: string, extra?: Record<string, string>): ReactNode {
  return (
    <Fragment key={k}>
      {iconNode(entry, k, extra)}
      <span style={tokenStyle(entry)}>{children ?? (entry.name || entry.recognizeName || entry.id)}</span>
    </Fragment>
  )
}

function renderSegments(
  text: string,
  rules: Map<string, BattleEffectTextEntry>,
  bare: RecPair[],
  bracket: RecPair[],
  extra: Record<string, string> | undefined,
  start: number,
  stop: number
): RenderResult {
  const nodes: ReactNode[] = []
  let i = start
  while (i < stop) {
    if (CLOSE_KEYWORD.test(text.slice(i)) || CLOSE_COLOR.test(text.slice(i)) || CLOSE_STYLE.test(text.slice(i))) {
      return { nodes, index: i }
    }
    if (text.slice(i, i + 2) === '(~') {
      const self = SELF_KEYWORD.exec(text.slice(i))
      if (self) {
        const tag = self[1]
        const id = self[2]
        const entry = rules.get(id)
        if (entry) {
          nodes.push(tag === 'HatKeywordIcon' ? <Fragment key={`k-${i}`}>{iconNode(entry, `k-${i}`, extra)}</Fragment> : keywordToken(entry, null, `k-${i}`, extra))
        } else {
          nodes.push(self[0])
        }
        i += self[0].length
        continue
      }
      const open = OPEN_KEYWORD.exec(text.slice(i))
      if (open) {
        const tag = open[1]
        const id = open[2]
        const entry = rules.get(id)
        const sub = renderSegments(text, rules, bare, bracket, extra, i + open[0].length, stop)
        const close = CLOSE_KEYWORD.exec(text.slice(sub.index))
        const closeLen = close ? close[0].length : 0
        if (entry) {
          nodes.push(tag === 'HatKeywordIcon' ? <Fragment key={`k-${i}`}>{iconNode(entry, `k-${i}`, extra)}{sub.nodes}</Fragment> : keywordToken(entry, sub.nodes, `k-${i}`, extra))
        } else {
          nodes.push(open[0])
          nodes.push(...sub.nodes)
          if (close) nodes.push(close[0])
        }
        i = sub.index + closeLen
        continue
      }
      const col = OPEN_COLOR.exec(text.slice(i))
      if (col) {
        const sub = renderSegments(text, rules, bare, bracket, extra, i + col[0].length, stop)
        const close = CLOSE_COLOR.exec(text.slice(sub.index))
        const closeLen = close ? close[0].length : 0
        nodes.push(
          <span key={`c-${i}`} style={{ color: col[1] }}>
            {sub.nodes}
          </span>
        )
        i = sub.index + closeLen
        continue
      }
      const st = OPEN_STYLE.exec(text.slice(i))
      if (st) {
        const sub = renderSegments(text, rules, bare, bracket, extra, i + st[0].length, stop)
        const close = CLOSE_STYLE.exec(text.slice(sub.index))
        const closeLen = close ? close[0].length : 0
        nodes.push(
          <span key={`s-${i}`} style={htmlStyle(st[1])}>
            {sub.nodes}
          </span>
        )
        i = sub.index + closeLen
        continue
      }
    }
    if (text[i] === '[') {
      const b = /^\[([^\]]+)\]/.exec(text.slice(i))
      if (b) {
        const key = b[1]
        const hit = bracket.find(([rec]) => rec === key) ?? bracket.find(([rec]) => rec.toLowerCase() === key.toLowerCase())
        if (hit) {
          nodes.push(keywordToken(hit[1], null, `b-${i}`, extra))
          i += b[0].length
          continue
        }
        nodes.push(
          <span key={`b-${i}`} className="text-yellow-400">
            {key + '\u2009'}
          </span>
        )
        i += b[0].length
        continue
      }
    }
    let matched = false
    for (const [rec, entry] of bare) {
      if (text.slice(i, i + rec.length) === rec) {
        nodes.push(keywordToken(entry, null, `r-${i}`, extra))
        i += rec.length
        matched = true
        break
      }
    }
    if (matched) continue
    nodes.push(text[i])
    i += 1
  }
  return { nodes, index: i }
}

/** 奇点正则渲染：原生 HTML（(~u~)/(~b~)/(~i~)/(~color=#RRGGBB~)）与 [X] 始终生效；(~HatKeyword...) 仅在规则存在时替换。 */
export function RegexText({
  text,
  rules,
  scope = 'ability',
  extraIcons
}: {
  text: string
  rules: Map<string, BattleEffectTextEntry>
  scope?: Scope
  extraIcons?: Record<string, string>
}): JSX.Element {
  const buffIcons = useAppStore((s) => s.buffIcons)
  const effectiveExtra = extraIcons ?? buffIcons
  const { bare, bracket } = useMemo(() => {
    const bare = new Map<string, BattleEffectTextEntry>()
    const bracket = new Map<string, BattleEffectTextEntry>()
    for (const entry of rules.values()) {
      if (!scopeMatch(entry, scope)) continue
      const rec = entry.recognizeName
      if (!rec) continue
      if (entry.hasBracket) bracket.set(rec, entry)
      else bare.set(rec, entry)
    }
    const sort = (m: Map<string, BattleEffectTextEntry>): RecPair[] => [...m.entries()].sort((a, b) => b[0].length - a[0].length)
    return { bare: sort(bare), bracket: sort(bracket) }
  }, [rules, scope])

  const { nodes } = renderSegments(text, rules, bare, bracket, effectiveExtra, 0, text.length)
  return <>{nodes}</>
}