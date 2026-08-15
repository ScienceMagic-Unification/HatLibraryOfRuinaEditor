import { useEffect, useMemo, useRef, useState } from 'react'
import { listEntities } from '@ruina/editor-core'
import { api, type ImageAssetInfo } from '../api'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'

export type AutocompleteSource = 'page-artwork' | 'page-ability'


export function AutocompleteInput({
  source,
  value,
  onChange,
  placeholder,
  className,
  compact
}: {
  source: AutocompleteSource
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  compact?: boolean
}): JSX.Element {
  const { t } = useI18n()
  const modPath = useAppStore((s) => s.modPath)
  const modules = useAppStore((s) => s.modules)
  const docs = useAppStore((s) => s.docs)
  const primaryLang = useAppStore((s) => s.primaryLang)

  const [artworkOptions, setArtworkOptions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  const abilityOptions = useMemo(() => {
    if (source !== 'page-ability') return []
    const module = modules.find((m) => m.id === 'cardability')
    if (!module) return []
    const lang = primaryLang['cardability']
    const primaries = Object.values(docs).filter((d) => d.bindings['cardability']?.kind === 'primary')
    const chosen = primaries.find((d) => d.lang === lang) ?? primaries[0]
    if (!chosen) return []
    const ids = new Set<string>()
    for (const ref of listEntities(chosen.doc, module.entity)) {
      if (ref.id) ids.add(ref.id)
    }
    return Array.from(ids).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  }, [source, modules, docs, primaryLang])

  useEffect(() => {
    if (source !== 'page-artwork' || !modPath) return
    let alive = true
    const dir = [modPath, 'Resource', 'CombatPageArtwork'].join('\\')
    void (api.listImages(dir) as Promise<ImageAssetInfo[]>).then((list) => {
      if (!alive) return
      const names = Array.from(new Set(list.map((i) => i.name))).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      )
      setArtworkOptions(names)
    })
    return () => {
      alive = false
    }
  }, [source, modPath])

  const allOptions = source === 'page-artwork' ? artworkOptions : abilityOptions

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase()
    const list = q ? allOptions.filter((o) => o.toLowerCase().includes(q)) : allOptions
    return list.slice(0, 60)
  }, [allOptions, value])

  useEffect(() => {
    setHighlight(0)
  }, [value, open])

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [])

  const choose = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`relative ${className ?? ''}`}>
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setOpen(true)
            return
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlight((h) => Math.min(h + 1, Math.max(0, filtered.length - 1)))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlight((h) => Math.max(0, h - 1))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            if (filtered[highlight]) choose(filtered[highlight])
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        placeholder={placeholder ?? (source === 'page-artwork' ? '选择或输入图片名称…' : '选择或输入能力 ID…')}
        className={`flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${compact ? 'h-8 text-xs' : ''}`}
      />
      {open ? (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-2 py-2 text-xs text-muted-foreground">{t('noMatch')}</div>
          ) : (
            filtered.map((o, i) => (
              <button
                key={o}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                className={`flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm ${
                  i === highlight ? 'bg-accent text-accent-foreground' : 'text-popover-foreground'
                }`}
              >
                <span className="truncate">{o}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}