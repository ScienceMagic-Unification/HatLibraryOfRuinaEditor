import { useEffect, useMemo, useState } from 'react'
import type { EntitySchema, OrderedDoc } from '@ruina/editor-core'
import { getTextField, listEntities } from '@ruina/editor-core'
import { Input } from '@ruina/ui'
import { Search } from 'lucide-react'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'
import { useRegexRules } from '../lib/useRegexRules'
import { resolveBuiltinIconUrl } from '../lib/builtinIcons'

/** 效果文本列表：参照模组正则列表，上为本地化名称，下为实际 ID（不带 #）。 */
export function EffectTextListPanel({
  doc,
  schema,
  selectedId,
  onSelect
}: {
  doc: OrderedDoc
  schema: EntitySchema
  selectedId: string | null
  onSelect: (id: string) => void
}): JSX.Element {
  const { t } = useI18n()
  const rules = useRegexRules()
  const hatEnabled = useAppStore((s) => s.hatEnabled)
  const buffIcons = useAppStore((s) => s.buffIcons)
  const loadBuffIcons = useAppStore((s) => s.loadBuffIcons)
  const [search, setSearch] = useState('')

  useEffect(() => {
    void loadBuffIcons()
  }, [loadBuffIcons])

  const refs = useMemo(() => listEntities(doc, schema), [doc])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return refs
    return refs.filter((r) => {
      const name = (getTextField(r.node, 'Name') ?? '').toLowerCase()
      const desc = (getTextField(r.node, 'Desc') ?? '').toLowerCase()
      return r.id.toLowerCase().includes(q) || name.includes(q) || desc.includes(q)
    })
  }, [refs, search])

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col border-r border-border bg-card">
      <div className="space-y-2 border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search.idNameDesc')} className="pl-8" />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {t('total', { n: refs.length })}
            {filtered.length !== refs.length ? `，${t('hits', { n: filtered.length })}` : ''}
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">{search ? t('noMatch') : t('list.noContent')}</div>
        ) : (
          filtered.map((r) => {
            const name = getTextField(r.node, 'Name') ?? ''
            const id = r.id
            const active = id === selectedId
            const mod = hatEnabled ? rules.get(id) : undefined
            const icon = mod ? resolveBuiltinIconUrl(mod.keywordIconId, buffIcons) : undefined
            const style = mod
              ? {
                  color: mod.color || undefined,
                  fontWeight: mod.isBold ? 700 : undefined,
                  fontStyle: mod.isItalic ? 'italic' : undefined
                }
              : undefined
            return (
              <button
                key={id}
                onClick={() => onSelect(id)}
                className={`flex w-full flex-col items-start gap-0.5 border-b border-border/60 px-3 py-2 text-left transition-colors ${
                  active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {icon ? <img src={icon} alt="" className="size-4 shrink-0 object-contain align-[-3px]" draggable={false} /> : null}
                  <span className="min-w-0 truncate text-sm font-medium text-foreground" style={style}>
                    {name || t('empty')}
                  </span>
                </span>
                <span className="block min-w-0 truncate font-mono text-[10px] text-muted-foreground">{id}</span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}