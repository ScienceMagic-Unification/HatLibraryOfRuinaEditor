import { useEffect, useMemo } from 'react'
import { useAppStore } from '../store'
import { getBuiltinRegexEntries, extractEffectTextEntries, type BattleEffectTextEntry } from './previewRules'
import { editorLangToDocLang } from './lang'

/**
 * 当前生效的正则词条表（ID -> BattleEffectTextEntry）。
 * 仅开启帽子奇点时才返回非空；词条来源：原版正则 + 奇点正则 + 模组正则。
 * 模组正则直接读取 store 中共享的 BattleEffectTextRootExtra 文档，
 * 因此“效果文本”与“模组正则”修改任意一侧都会同步生效。
 */
export function useRegexRules(): Map<string, BattleEffectTextEntry> {
  const hatEnabled = useAppStore((s) => s.hatEnabled)
  const primaryLang = useAppStore((s) => s.primaryLang)
  const docs = useAppStore((s) => s.docs)
  const ensureModuleDocs = useAppStore((s) => s.ensureModuleDocs)

  const modDocs = useMemo(
    () => Object.values(docs).filter((d) => d.root === 'BattleEffectTextRootExtra'),
    [docs]
  )
  const editorLang = typeof localStorage !== 'undefined' ? localStorage.getItem('editorLang') ?? 'zh' : 'zh'
  const preferredDocLang = editorLangToDocLang(editorLang)
  const modLang = primaryLang['mod-regex'] ?? primaryLang['effecttext'] ?? modDocs.find((d) => d.lang === preferredDocLang)?.lang ?? modDocs[0]?.lang ?? 'cn'

  useEffect(() => {
    void ensureModuleDocs('mod-regex')
  }, [ensureModuleDocs])

  const modEntries = useMemo(() => {
    if (!hatEnabled || modLang === '__none__') return []
    return modDocs
      .filter((d) => d.lang === modLang)
      .flatMap((d) => extractEffectTextEntries(d.doc))
  }, [hatEnabled, modLang, modDocs])

  return useMemo(() => {
    if (!hatEnabled) return new Map<string, BattleEffectTextEntry>()
    const map = new Map<string, BattleEffectTextEntry>()
    const add = (entries: BattleEffectTextEntry[]): void => {
      for (const e of entries) if (!map.has(e.id)) map.set(e.id, e)
    }
    const vanillaLang = primaryLang['vanilla-regex']
    if (vanillaLang !== '__none__') add(getBuiltinRegexEntries('vanilla', vanillaLang ?? 'cn'))
    const singularLang = primaryLang['singularity-regex']
    if (singularLang !== '__none__') add(getBuiltinRegexEntries('singularity', singularLang ?? 'cn'))
    add(modEntries)
    return map
  }, [hatEnabled, primaryLang, modEntries])
}