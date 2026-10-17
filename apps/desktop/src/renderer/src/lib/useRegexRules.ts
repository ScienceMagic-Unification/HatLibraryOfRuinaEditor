import { useEffect, useMemo } from 'react'
import { useAppStore } from '../store'
import { getBuiltinRegexEntries, extractEffectTextEntries, normalizeKeywordLanguage, type BattleEffectTextEntry } from './previewRules'
import { workspaceLanguage } from './workspaceLanguage'

/**
 * 当前生效的正则词条表（ID -> BattleEffectTextEntry）。
 * 仅开启帽子奇点时才返回非空；词条来源：原版正则 + 奇点正则 + 模组正则。
 * 模组正则直接读取 store 中共享的 BattleEffectTextRootExtra 文档，
 * 因此“效果文本”与“模组正则”修改任意一侧都会同步生效。
 */
export function useRegexRules(language?: string): Map<string, BattleEffectTextEntry> {
  const hatEnabled = useAppStore((s) => s.hatEnabled)
  const primaryLang = useAppStore((s) => s.primaryLang)
  const docs = useAppStore((s) => s.docs)
  const activeModuleId = useAppStore((s) => s.activeModuleId)
  const primaryDocPath = useAppStore((s) => s.primaryDocPath)
  const ensureModuleDocs = useAppStore((s) => s.ensureModuleDocs)

  const modDocs = useMemo(
    () => Object.values(docs).filter((d) => d.root === 'BattleEffectTextRootExtra'),
    [docs]
  )
  const preferredDocLang = language ? normalizeKeywordLanguage(language) : workspaceLanguage(docs, activeModuleId, primaryLang[activeModuleId], primaryDocPath[activeModuleId])
  const modLang = preferredDocLang

  useEffect(() => {
    void ensureModuleDocs('mod-regex')
  }, [ensureModuleDocs])

  const modEntries = useMemo(() => {
    if (!hatEnabled || modLang === '__none__') return []
    const entries = new Map<string, BattleEffectTextEntry>()
    const priority = (language?: string): number => normalizeKeywordLanguage(language ?? '') === modLang ? 0 : language === 'cn' ? 1 : language === 'en' ? 2 : 3
    for (const doc of [...modDocs].sort((a, b) => priority(a.lang) - priority(b.lang))) {
      for (const e of extractEffectTextEntries(doc.doc)) if (!entries.has(e.id)) entries.set(e.id, { ...e, plugin: 'Mod', language: normalizeKeywordLanguage(doc.lang ?? ''), requestedLanguage: modLang })
    }
    return [...entries.values()]
  }, [hatEnabled, modLang, modDocs])

  return useMemo(() => {
    if (!hatEnabled) return new Map<string, BattleEffectTextEntry>()
    const map = new Map<string, BattleEffectTextEntry>()
    const add = (entries: BattleEffectTextEntry[]): void => {
      for (const e of entries) if (!map.has(e.id)) map.set(e.id, e)
    }
    const vanillaLang = primaryLang['vanilla-regex']
    if (vanillaLang !== '__none__') add(getBuiltinRegexEntries('vanilla', preferredDocLang))
    const singularLang = primaryLang['singularity-regex']
    if (singularLang !== '__none__') add(getBuiltinRegexEntries('singularity', preferredDocLang))
    add(modEntries)
    return map
  }, [hatEnabled, primaryLang, modEntries, preferredDocLang])
}
