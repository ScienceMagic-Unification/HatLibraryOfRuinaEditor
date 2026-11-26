import { GroupToggle, GroupedRows, type RowGrouping } from './RowGroups'
import { useAnnotations, useTagNavigation, projectKey, emptyProject, tagName, rowTargets, targetKey } from '../lib/annotations'
import { rowKey, sourceName, sourceCaption, type ListRow } from '../lib/localizationSources'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n'
import { observeElementOffset, useVirtualizer } from '@tanstack/react-virtual'
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
  rows,
  schema,
  selectedId,
  onSelect,
  accentLookup,
  localizedNames,
  localizedRender,
  scrollKey,
  dirtyIds,
  annotationPath,
  annotationModule, grouping
}: {
  doc: OrderedDoc
  rows?: ListRow[]
  schema: EntitySchema
  selectedId: string | null
  onSelect: (id: string) => void
  accentLookup?: (id: string) => string | undefined
  localizedNames?: Record<string, string>
  localizedRender?: (id: string, row: ListRow) => ReactNode
  scrollKey?: string
  annotationPath?: string
  grouping?: RowGrouping
  annotationModule?: string
  dirtyIds?: Set<string>
}): JSX.Element {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const parentRef = useRef<HTMLDivElement>(null)
  const plainRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef(new Map<string, HTMLDivElement>())
  const lastScrolledRef = useRef<string | null>(null)
  const scrollTopRef = useRef(0)
  const syncScrollOffset = useRef<((offset: number, scrolling: boolean) => void) | null>(null)
  const listScroll = useAppStore((s) => s.listScroll)
  const setListScroll = useAppStore((s) => s.setListScroll)
  const localizedView = useAppStore((s) => s.localizedView)
  const setLocalizedView = useAppStore((s) => s.setLocalizedView)
  const viewKey = scrollKey ?? 'default'
  const useLocalized = localizedView[viewKey] ?? false
  const displayField = schema.displayField ?? 'Name'
  const idOnly = schema.idOnlyList === true
  const hasDesc = schema.fields.some((f) => f.name === 'Desc')

  const displayText = (node: any): string => {
    const v = (getFieldValue(node, schema.fields.find((f) => f.name === displayField) ?? { kind: 'text', name: displayField }) as string | undefined) ?? ''
    const oneLine = v.replace(/[\r\n\t]+/g, ' ').trim()
    return oneLine.length > 36 ? oneLine.slice(0, 36) + '…' : oneLine || '（空）'
  }

  const refs: ListRow[] = useMemo(() => rows ?? listEntities(doc, schema), [rows, doc, schema])
  const modPath = useAppStore((s) => s.modPath)
  const mode = useAnnotations((s) => s.enabled)
  const project = useAnnotations((s) => s.projects[projectKey(modPath ?? '')] ?? emptyProject)
  const rowTags = useMemo(() => {
    const map = new Map<string, typeof project.tags>()
    if (!mode || !annotationModule) return map
    const targets = rowTargets(annotationModule, annotationPath ?? '', refs)
    refs.forEach((row, i) => {
      const ids = project.links[targetKey(targets[i])]
      if (ids) map.set(rowKey(row), project.tags.filter((tag) => ids.includes(tag.id)))
    })
    return map
  }, [mode, annotationModule, annotationPath, refs, project])
  const lookupTag = useTagNavigation((s) => s.open)
  const chips = (row: ListRow) => rowTags.has(rowKey(row)) && <span className="mt-0.5 flex flex-wrap gap-1">
    {rowTags.get(rowKey(row))?.map((tag) => <button key={tag.id} type="button" title={t('tags.lookup') + ' · ' + tagName(tag, t)} onClick={(e) => { e.stopPropagation(); lookupTag(tag.id) }} style={{ borderColor: tag.color }} className="rounded border-l-2 bg-secondary px-1.5 text-[10px] text-foreground hover:bg-accent">{tagName(tag, t)}</button>)}
  </span>
  const variableHeight = Boolean(rows) || rowTags.size > 0 || idOnly
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return refs
    return refs.filter((r) => {
      if (r.source && sourceName(r.source).toLowerCase().includes(q)) return true
      if (idOnly) {
        const descField = schema.fields.find((f) => f.name === 'Desc')
        const desc = descField ? (getAllText(r.node, descField.name) ?? '').toLowerCase() : ''
        return r.id.toLowerCase().includes(q) || desc.includes(q)
      }
      const name = String(getFieldValue(r.node, schema.fields.find((f) => f.name === displayField) ?? { kind: 'text', name: displayField }) ?? '').toLowerCase()
      const localizedName = localizedNames?.[r.id]?.toLowerCase() ?? ''
      const desc = hasDesc ? (getAllText(r.node, 'Desc') ?? '').toLowerCase() : ''
      return r.id.toLowerCase().includes(q) || name.includes(q) || localizedName.includes(q) || desc.includes(q)
    })
  }, [refs, search, schema, displayField, idOnly, hasDesc, localizedNames])

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    observeElementOffset: (instance, callback) => {
      syncScrollOffset.current = callback
      const cleanup = observeElementOffset(instance, callback)
      return () => { syncScrollOffset.current = null; cleanup?.() }
    },
    estimateSize: () => variableHeight ? 54 : ROW_HEIGHT,
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
    if (!refs.some((r) => rowKey(r) === selectedId)) return
    if (!filtered.some((r) => rowKey(r) === selectedId)) {
      if (search.trim() !== '') setSearch('')
      return
    }
    const index = filtered.findIndex((r) => rowKey(r) === selectedId)
    if (index < 0) return
    // Record the selection before the animation frame: a quick search must not
    // be cleared merely because scrolling has not painted yet (hidden windows).
    lastScrolledRef.current = selectedId
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
        const item = virtualizer.getVirtualItems().find((v) => v.index === index)
        if (!item || item.start < box.scrollTop || item.end > box.scrollTop + box.clientHeight) {
          virtualizer.scrollToIndex(index, { align: 'center' })
          // Programmatic navigation must paint the target rows immediately,
          // even when Electron defers the native scroll event.
          syncScrollOffset.current?.(box.scrollTop, false)
        }
      }
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, filtered, refs, search, isPlainList])

  const rowBody = (ref: ListRow) => {
    const name = useLocalized && localizedNames?.[ref.id] ? localizedNames[ref.id] : displayText(ref.node)
    const rarityColor = accentLookup ? (accentLookup(ref.id) ?? '#ffffff') : cardAccent(ref.node)
    return <div className="min-w-0 flex-1">
      {idOnly ? <span className="block break-all font-mono text-xs leading-5 text-foreground">{ref.id}</span> : (
        <div className="flex items-baseline gap-2">
          <span className="shrink-0 font-mono text-xs text-muted-foreground">#{ref.id}</span>
          <span className="min-w-0 truncate" style={{ color: rarityColor ?? undefined }}>{name}</span>
        </div>
      )}
      {!grouping?.enabled && ref.source && <small title={ref.source} className="block break-all text-[11px] text-muted-foreground">{sourceCaption(ref.source)}</small>}
      {chips(ref)}
    </div>
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col border-r border-border bg-card">
      <div className="space-y-2 border-b border-border p-3">
        <div className="relative">
          <div className="flex items-center gap-1.5">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={idOnly ? t('search.idDesc') : hasDesc ? t('search.idNameDesc') : t('search.idName')} className="pl-8" />
            </div>
            {localizedNames || localizedRender ? (
              <button
                type="button"
                onClick={() => setLocalizedView(viewKey, !useLocalized)}
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
          <GroupToggle g={grouping}/>
        </div>
      </div>
      {grouping?.enabled ? <GroupedRows key={grouping.scope} g={grouping} filtered={filtered} searching={Boolean(search.trim())} selected={selectedId} onSelect={(ref) => onSelect(rowKey(ref))} render={(ref) => (
        <div className="flex cursor-pointer items-center gap-2 border-b border-border/50 px-2 py-2 text-sm hover:bg-secondary/40">
          {dirtyIds?.has(rowKey(ref)) && <span className="size-1.5 shrink-0 rounded-full bg-red-500"/>}
          {useLocalized && localizedRender ? <div className="min-w-0 flex-1">{localizedRender(ref.id, ref)}{chips(ref)}</div> : rowBody(ref)}
        </div>
      )}/> : useLocalized && localizedRender ? (
        <div
          ref={plainRef}
          data-scrollkey={scrollKey}
          onScroll={(e) => {
            scrollTopRef.current = e.currentTarget.scrollTop
          }}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {filtered.map((ref) => {
            const active = rowKey(ref) === selectedId
            return (
              <div
                key={rowKey(ref)}
                ref={(el) => {
                  if (el) rowRefs.current.set(rowKey(ref), el)
                  else rowRefs.current.delete(rowKey(ref))
                }}
                onClick={() => onSelect(rowKey(ref))}
                className={`flex cursor-pointer items-start gap-2 border-b border-border/50 px-3 py-2 text-sm transition-colors ${active ? 'bg-accent' : 'hover:bg-secondary/40'}`}
              >
                {dirtyIds?.has(rowKey(ref)) ? <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-red-500" aria-label="未保存" /> : null}
                <span className="min-w-0 flex-1 break-words">{localizedRender(ref.id, ref)}{chips(ref)}{ref.source && <small title={ref.source} className="block truncate text-muted-foreground">{sourceCaption(ref.source)}</small>}</span>
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
            const active = rowKey(ref) === selectedId
            return (
              <div
                key={`${rowKey(ref)}-${ref.index}`}
                data-index={v.index}
                ref={variableHeight ? virtualizer.measureElement : undefined}
                title={[ref.id, ref.source].filter(Boolean).join('\n')}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: variableHeight ? undefined : v.size, minHeight: ROW_HEIGHT, transform: `translateY(${v.start}px)` }}
                className={`flex cursor-pointer items-center gap-2 border-b border-border/50 px-3 py-1.5 text-sm transition-colors ${
                  active ? 'bg-accent' : 'hover:bg-secondary/40'
                }`}
                onClick={() => onSelect(rowKey(ref))}
              >
                {dirtyIds?.has(rowKey(ref)) ? <span className="size-1.5 shrink-0 rounded-full bg-red-500" aria-label="未保存" /> : null}
                {rowBody(ref)}
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




