export interface RegexMatchItem {
  start: number
  end: number
  line: number
  preview: string
}

export interface RegexPreviewResult {
  count: number
  matches: RegexMatchItem[]
  error?: string
}

export interface RegexApplyResult {
  text: string
  count: number
  error?: string
}

function lineInfo(text: string, index: number): { line: number; preview: string } {
  const before = text.slice(0, index)
  const line = before.split('\n').length
  const lineStart = text.lastIndexOf('\n', index - 1) + 1
  let lineEnd = text.indexOf('\n', index)
  if (lineEnd < 0) lineEnd = text.length
  const full = text.slice(lineStart, lineEnd)
  const preview = full.length > 120 ? full.slice(0, 120) + '…' : full
  return { line, preview }
}

export function previewRegex(text: string, pattern: string, flags = 'g'): RegexPreviewResult {
  let re: RegExp
  try {
    const f = flags.includes('g') ? flags : flags + 'g'
    re = new RegExp(pattern, f)
  } catch (e) {
    return { count: 0, matches: [], error: e instanceof Error ? e.message : String(e) }
  }
  const matches: RegexMatchItem[] = []
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0
    const end = start + m[0].length
    const info = lineInfo(text, start)
    matches.push({ start, end, line: info.line, preview: info.preview })
  }
  return { count: matches.length, matches }
}

export function applyRegex(text: string, pattern: string, replacement: string, flags = 'g'): RegexApplyResult {
  let re: RegExp
  try {
    const f = flags.includes('g') ? flags : flags + 'g'
    re = new RegExp(pattern, f)
  } catch (e) {
    return { text, count: 0, error: e instanceof Error ? e.message : String(e) }
  }
  let count = 0
  const out = text.replace(re, () => {
    count++
    return replacement
  })
  return { text: out, count }
}
