import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { EntitySchema, OrderedDoc } from '@ruina/editor-core'
import { getAllText, getFieldValue, listEntities } from '@ruina/editor-core'
import { Input } from '@ruina/ui'
import { Search } from 'lucide-react'
import { cardAccent } from '../lib/cardAccent'
import { useAppStore } from '../store'

/** 列表固定行高（与虚拟滚动 estimateSize 保持一致） */
const ROW_HEIGHT = 36

export function DataPanel({
  doc,
  schema,
  selectedId,
  onSelect,
  accentLookup,
  localizedNames,
  localizedRender,
  scrollKey
}: {
  doc: OrderedDoc
  schema: EntitySchema
  selectedId: string | null
  onSelect: (id: string) => void
  accentLookup?: (id: string) => string | undefined
  localizedNames?: Record<string, string>
  localizedRender?: (id: string) => ReactNode
  scrollKey?: string
}): JSX.Element {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [useLocalized, setUseLocalized] = useState(false)
  const parentRef = useRef<HTMLDivElement>(null)
  const plainRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const lastScrolledRef = useRef<string | null>(null)
  const scrollTopRef = useRef(0)
  const listScroll = useAppStore((s) => s.listScroll)
  const setListScroll = useAppStore((s) => s.setListScroll)
  const displayField = schema.displayField ?? 'Name'
  const idOnly = schema.idOnlyList === true
  const hasDesc = schema.fields.some((f) => f.name === 'Desc')

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
      const desc = hasDesc ? (getAllText(r.node, 'Desc') ?? '').toLowerCase() : ''
      return r.id.toLowerCase().includes(q) || name.includes(q) || desc.includes(q)
    })
  }, [refs, search])

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12
  })

  useEffect(() => {
    const el = parentRef.current ?? plainRef.current
    if (el && scrollKey) el.scrollTop = listScroll[scrollKey] ?? 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollKey])

  useEffect(() => {
    return () => {
      if (scrollKey) setListScroll(scrollKey, scrollTopRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollKey, setListScroll])

  const isPlainList = useLocalized && Boolean(localizedRender)

  // 切换「普通 / 本地化」视图后，允许对当前选中项重新定位一次
  useEffect(() => {
    lastScrolledRef.current = null
  }, [isPlainList])

  /**
   * 选中项变化时把它滚动进可视范围（例如从战斗书页预览点击本地化名称 / 能力文本跳转过来）。
   * - 目标被搜索条件过滤掉时先清空搜索，下一轮再滚动；
   * - 目标已经在可视范围内就不滚动，避免打断用户当前的浏览位置。
   */
  useEffect(() => {
    if (!selectedId || lastScrolledRef.current === selectedId) return
    if (!refs.some((r) => r.id === selectedId)) return
    if (!filtered.some((r) => r.id === selectedId)) {
      if (search.trim() !== '') setSearch('')
      return
    }
    const index = filtered.findIndex((r) => r.id === selectedId)
    if (index < 0) return
    const raf = requestAnimationFrame(() => {
      if (isPlainList) {
        const box = plainRef.current
        const node = rowRefs.current.get(selectedId)
        if (!box || !node) return
        const boxRect = box.getBoundingClientRect()
        const nodeRect = node.getBoundingClientRect()
        if (nodeRect.top < boxRect.top || nodeRect.bottom > boxRect.bottom) {
          box.scrollTop += nodeRect.top - boxRect.top - Math.max(0, (box.clientHeight - nodeRect.height) / 2)
        }
      } else {
        const box = parentRef.current
        if (!box) return
        const top = index * ROW_HEIGHT
        if (top < box.scrollTop || top + ROW_HEIGHT > box.scrollTop + box.clientHeight) {
          virtualizer.scrollToIndex(index, { align: 'center' })
        }
      }
      lastScrolledRef.current = selectedId
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, filtered, refs, search, isPlainList])

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col border-r border-border bg-card">
      <div className="space-y-2 border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <div className="flex items-center gap-1.5">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={idOnly ? t('search.idDesc') : hasDesc ? t('search.idNameDesc') : t('search.idName')} className="pl-8" />
            </div>
            {localizedNames || localizedRender ? (
              <button
                type="button"
                onClick={() => setUseLocalized((v) => !v)}
                className={`shrink-0 rounded-md border px-2 py-1 text-[11px] transition-colors ${
                  useLocalized ? 'border-primary/60 bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                {t('list.localize')}
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {t('total', { n: refs.length })}
            {filtered.length !== refs.length ? `，${t('hits', { n: filtered.length })}` : ''}
          </span>
        </div>
      </div>
      {useLocalized && localizedRender ? (
        <div
          ref={plainRef}
          data-scrollkey={scrollKey}
          onScroll={(e) => {
            scrollTopRef.current = e.currentTarget.scrollTop
          }}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {filtered.map((ref) => {
            const active = ref.id === selectedId
            return (
              <div
                key={ref.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(ref.id, el)
                  else rowRefs.current.delete(ref.id)
                }}
                onClick={() => onSelect(ref.id)}
                className={`cursor-pointer border-b border-border/50 px-3 py-2 text-sm transition-colors ${active ? 'bg-accent' : 'hover:bg-secondary/40'}`}
              >
                {localizedRender(ref.id)}
              </div>
            )
          })}
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">{t('noMatch')}</div>
          ) : null}
        </div>
      ) : (
      <div ref={parentRef} data-scrollkey={scrollKey} onScroll={(e) => { scrollTopRef.current = e.currentTarget.scrollTop }} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((v) => {
            const ref = filtered[v.index]
            const name = useLocalized && localizedNames?.[ref.id] ? localizedNames[ref.id] : displayText(ref.node)
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
      )}
    </div>
  )
}




