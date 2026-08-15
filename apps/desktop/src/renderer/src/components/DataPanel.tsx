import { useMemo, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { EntitySchema, OrderedDoc } from '@ruina/editor-core'
import { getAllText, getFieldValue, listEntities } from '@ruina/editor-core'
import { Input } from '@ruina/ui'
import { Search } from 'lucide-react'
import { cardAccent } from '../lib/cardAccent'

export function DataPanel({
  doc,
  schema,
  selectedId,
  onSelect,
  accentLookup
}: {
  doc: OrderedDoc
  schema: EntitySchema
  selectedId: string | null
  onSelect: (id: string) => void
  accentLookup?: (id: string) => string | undefined
}): JSX.Element {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const parentRef = useRef<HTMLDivElement>(null)
  const displayField = schema.displayField ?? 'Name'
  const idOnly = schema.idOnlyList === true

  const displayText = (node: any): string => {
    const v = (getFieldValue(node, { kind: 'text', name: displayField }) as string | undefined) ?? ''
    const oneLine = v.replace(/[\r\n\t]+/g, ' ').trim()
    return oneLine.length > 36 ? oneLine.slice(0, 36) + '…' : oneLine || '（空）'
  }

  const refs = useMemo(() => listEntities(doc, schema), [doc])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return refs
    return refs.filter((r) => {
      if (idOnly) {
        const descField = schema.fields.find((f) => f.name === 'Desc')
        const desc = descField ? (getAllText(r.node, descField.name) ?? '').toLowerCase() : ''
        return r.id.toLowerCase().includes(q) || desc.includes(q)
      }
      const name = displayText(r.node).toLowerCase()
      return r.id.toLowerCase().includes(q) || name.includes(q)
    })
  }, [refs, search])

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 12
  })

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col border-r border-border bg-card">
      <div className="space-y-2 border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={idOnly ? t('search.idDesc') : t('search.idName')} className="pl-8" />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {t('total', { n: refs.length })}
            {filtered.length !== refs.length ? `，${t('hits', { n: filtered.length })}` : ''}
          </span>
        </div>
      </div>
      <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((v) => {
            const ref = filtered[v.index]
            const name = displayText(ref.node)
            const rarityColor = accentLookup ? (accentLookup(ref.id) ?? '#ffffff') : cardAccent(ref.node)
            const active = ref.id === selectedId
            return (
              <div
                key={`${ref.id}-${ref.index}`}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: v.size, transform: `translateY(${v.start}px)` }}
                className={`flex cursor-pointer items-center gap-2 border-b border-border/50 px-3 py-1.5 text-sm transition-colors ${
                  active ? 'bg-accent' : 'hover:bg-secondary/40'
                }`}
                onClick={() => onSelect(ref.id)}
              >
                {idOnly ? (
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{ref.id}</span>
                ) : (
                  <>
                    <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">#{ref.id}</span>
                    <span className="min-w-0 flex-1 truncate" style={rarityColor ? { color: rarityColor } : undefined}>
                      {name}
                    </span>
                  </>
                )}
              </div>
            )
          })}
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">{t('noMatch')}</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}




