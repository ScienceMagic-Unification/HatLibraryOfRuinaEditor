import { normalizeKeywordLanguage } from './previewRules'

/** Document selection wins; interface language is intentionally not an input. */
export function workspaceLanguage(
  docs: Record<string, { lang?: string; bindings: Record<string, { kind: string }> }>,
  moduleId: string, selected?: string, path?: string
): string {
  if (selected === '__none__') return selected
  const explicit = path ? docs[path] : undefined
  if (explicit?.bindings[moduleId]?.kind === 'primary' && explicit.lang) return normalizeKeywordLanguage(explicit.lang)
  if (selected) return normalizeKeywordLanguage(docs[selected]?.lang ?? selected)
  const candidates = Object.values(docs).filter((d) => d.bindings[moduleId]?.kind === 'primary')
  return normalizeKeywordLanguage(candidates.find((d) => d.lang === 'cn')?.lang ?? candidates[0]?.lang ?? 'cn')
}
