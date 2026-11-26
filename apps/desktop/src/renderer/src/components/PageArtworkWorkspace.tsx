import { useMemo, useState } from 'react'
import type { ModuleDefinition } from '@ruina/editor-core'
import { Button, Input } from '@ruina/ui'
import { useI18n } from '../i18n'
import { findVanillaArtwork, vanillaArtwork } from '../lib/vanillaArtwork'
import { useAppStore } from '../store'
import { ImageWorkspace } from './ImageWorkspace'

export function PageArtworkWorkspace({ module }: { module: ModuleDefinition }) {
  const { t } = useI18n()
  const pick = useAppStore((s) => s.assetPick)
  const complete = useAppStore((s) => s.completeAssetPick)
  const cancel = useAppStore((s) => s.cancelAssetPick)
  const initial = pick?.vanilla && findVanillaArtwork(pick.initialAssetName ?? '')
  const [native, setNative] = useState(Boolean(initial))
  const [query, setQuery] = useState(initial ? initial.keys[0] : '')
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return vanillaArtwork.filter((entry) => [...entry.names, ...entry.keys].some((value) => value.toLowerCase().includes(needle)))
  }, [query])
  return <div className="flex min-h-0 flex-1 flex-col">
    <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2">
      <Button variant={native ? 'ghost' : 'secondary'} size="sm" aria-pressed={!native} onClick={() => setNative(false)}>Mod</Button>
      <Button variant={native ? 'secondary' : 'ghost'} size="sm" aria-pressed={native} onClick={() => setNative(true)}>{t('tab.vanilla')}</Button>
      {native && <><Input value={query} onChange={(e) => setQuery(e.target.value)} className="ml-auto w-60" type="search" aria-label={t('search.idName')} placeholder={t('search.idName')}/>
        <span className="text-xs text-muted-foreground">{t('total', { n: filtered.length })}</span>
        {pick && <Button variant="ghost" size="sm" onClick={cancel}>{t('image.cancelPick')}</Button>}</>}
    </div>
    {native ? <div className="min-h-0 flex-1 overflow-y-auto p-3">
      {filtered.length === 0 && <div className="text-sm text-muted-foreground">{t('noMatch')}</div>}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">{filtered.map((entry) =>
        <div key={entry.file} className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
          <img src={entry.url} alt={entry.names[0] ?? entry.keys[0]} loading="lazy" width={410} height={310} className="aspect-[41/31] w-full object-contain"/>
          <div className="space-y-1 p-2 text-xs">
            {entry.names.length > 0 && <div className="break-words font-medium">{entry.names.join(' / ')}</div>}
            {entry.keys.map((key) => pick
              ? <button key={key} onClick={() => void complete(key)} className="block w-full break-all rounded border border-border p-1 text-left font-mono hover:border-primary">{key}</button>
              : <div key={key} className="break-all font-mono text-muted-foreground">{key}</div>)}
          </div>
        </div>)}</div>
    </div> : <ImageWorkspace module={module}/>}
  </div>
}
