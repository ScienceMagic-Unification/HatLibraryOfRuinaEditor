import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n'
import type { BattleEffectTextEntry } from '../lib/previewRules'
import { keywordMarkup } from '../lib/keywordPreview'
import { pluginIconResources, resolveBuiltinIconUrl } from '../lib/builtinIcons'
import { RegexText } from './RegexText'
import { keywordSearchAliases } from '../lib/keywordMigrations'
import { parseKeywordValue } from '../lib/keywordValue'
import { numericKeywordIds } from '../lib/keywordAggregation'

export function KeywordPicker({ rules, selectedText, onInsert, onClose }: {
  rules: Map<string, BattleEffectTextEntry>; selectedText: string; onInsert: (text: string) => void; onClose: () => void
}): JSX.Element {
  const { t } = useI18n()
  const editing = useMemo(() => parseKeywordValue(selectedText), [selectedText])
  const [query, setQuery] = useState('')
  const [plugin, setPlugin] = useState('')
  const [selected, setSelected] = useState(editing?.id ?? '')
  const [kind, setKind] = useState<'hat' | 'icon' | 'link'>('hat')
  const [wrap, setWrap] = useState(Boolean(selectedText) && !editing)
  const [parameterEnabled, setParameterEnabled] = useState<boolean | undefined>(editing ? true : undefined)
  const [parameter, setParameter] = useState(editing?.value ?? '')
  const entries = useMemo(() => {
    const rows = [...rules.values()]
    for (const r of pluginIconResources) {
      if (!rows.some((e) => e.id === r.id)) rows.push({ id: r.id, name: r.id, plugin: r.plugin, resourceName: r.name, keywordIconId: r.id, desc: '', recognizeName: '', cardPreview: [], color: '', hasBracket: false, isUnderline: false, isBold: false, isItalic: false, isChangeSelf: false, isChangeAbility: false, isChangePassive: false, isAutoLink: false, isCardPreview: false })
    }
    return rows.filter((e) => !/["<>\r\n]/.test(e.id))
  }, [rules])
  const filtered = entries.filter((e) => (!plugin || e.plugin === plugin) && [e.id, e.name, e.recognizeName, ...(e.recognizeNames ?? []), ...keywordSearchAliases(e.id), e.plugin].some((s) => s?.toLowerCase().includes(query.toLowerCase())))
  const entry = filtered.find((e) => e.id === selected) ?? filtered[0]
  const iconOnly = entry && !rules.has(entry.id)
  const effectiveKind = iconOnly ? 'icon' : kind
  const withParameter = effectiveKind === 'hat' && !wrap && (parameterEnabled ?? numericKeywordIds.some((id) => id === entry?.id))
  const markup = entry ? keywordMarkup(entry.id, effectiveKind, wrap && effectiveKind !== 'icon' ? selectedText : undefined, withParameter ? parameter : undefined) : ''
  return createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-8" onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}>
    <section role="dialog" aria-modal="true" aria-label={t('keyword.library')} className="flex max-h-[85vh] w-[900px] max-w-full flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-xl">
      <div className="flex justify-between"><h2 className="font-semibold">{t('keyword.library')}</h2><button onClick={onClose} aria-label={t('keyword.close')}>✕</button></div>
      <div className="flex gap-2">
        <input autoFocus aria-label={t('keyword.search')} placeholder={t('keyword.search')} value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 flex-1 rounded border border-border bg-background p-2 text-sm" />
        <select aria-label={t('keyword.plugin')} value={plugin} onChange={(e) => setPlugin(e.target.value)} className="max-w-[260px] rounded border border-border bg-background p-2 text-sm">
          <option value="">{t('keyword.allPlugins')}</option>{[...new Set(entries.map((e) => e.plugin).filter(Boolean))].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
        <div className="h-[360px] overflow-y-auto rounded border border-border">
          {filtered.map((e) => <button key={e.id} onClick={() => { setSelected(e.id); setParameterEnabled(undefined) }} className={`block w-full border-b border-border p-2 text-left text-sm ${entry?.id === e.id ? 'bg-primary/20' : 'hover:bg-accent'}`}>
            <div>{e.name || e.recognizeName || e.id}</div><div className="break-all font-mono text-xs text-muted-foreground">{e.id}</div><div className="text-[10px] text-muted-foreground">{e.plugin || t('keyword.mod')}</div>
          </button>)}{filtered.length === 0 ? <p className="p-4 text-sm">{t('noMatch')}</p> : null}
        </div>
        <div className="min-w-0 space-y-3 overflow-y-auto text-sm">
          {entry ? <>
            <div className="whitespace-pre-wrap rounded border border-border p-3"><RegexText text={markup} rules={rules} /></div>
            <div className="break-all text-xs text-muted-foreground">{entry.plugin || t('keyword.mod')} · {entry.language || '—'}<br />{entry.resourceName}</div>
            <div className="whitespace-pre-wrap text-xs"><RegexText text={entry.desc} rules={rules} /></div>
            <select aria-label={t('keyword.format')} value={effectiveKind} disabled={iconOnly} onChange={(e) => setKind(e.target.value as typeof kind)} className="rounded border border-border bg-background p-2">
              <option value="hat">HatKeyword</option><option value="link">HatKeywordLink</option><option value="icon">HatKeywordIcon</option>
            </select>
            <label className="ml-2 text-xs"><input type="checkbox" checked={wrap} disabled={effectiveKind === 'icon'} onChange={(e) => setWrap(e.target.checked)} /> {t('regexAutocomplete.wrap')}</label>
            {effectiveKind === 'hat' ? <div className="flex items-center gap-2">
              <label className="shrink-0 text-xs"><input type="checkbox" checked={withParameter} disabled={wrap} onChange={(e) => setParameterEnabled(e.target.checked)} /> {t('keyword.value')}</label>
              {withParameter ? <input type="text" aria-label={t('keyword.value')} value={parameter} onChange={(e) => setParameter(e.target.value)} className="min-w-0 flex-1 rounded border border-border bg-background p-2" /> : null}
            </div> : null}
            <pre className="whitespace-pre-wrap break-all rounded bg-background p-2 text-xs">{markup}</pre>
            {entry.keywordIconId && !resolveBuiltinIconUrl(entry.iconName || entry.keywordIconId, undefined, entry.plugin, entry.iconSheetName) ? <p className="text-xs text-amber-400">{t('keyword.warning.icon')}: {entry.keywordIconId}</p> : null}
          </> : null}
        </div>
      </div>
      <div className="flex justify-end"><button disabled={!markup} onClick={() => { onInsert(markup); onClose() }} className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">{t('keyword.insert')}</button></div>
    </section>
  </div>, document.body)
}
