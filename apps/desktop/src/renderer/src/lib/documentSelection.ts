/** The visible document and mutation target must resolve the same way, including the explicit None state. */
export function selectPrimaryDocument<T extends { path: string; lang?: string; bindings: Record<string, { kind: string }> }>(
  docs: Record<string, T>, moduleId: string, language?: string, path?: string, preferredLanguage = 'cn'
): T | undefined {
  if (language === '__none__') return undefined
  const candidates = Object.values(docs).filter((d) => d.bindings[moduleId]?.kind === 'primary')
  return candidates.find((d) => d.path === path) ?? candidates.find((d) => d.lang === language) ?? candidates.find((d) => d.lang === preferredLanguage) ?? candidates.find((d) => d.lang === 'cn') ?? candidates[0]
}
