import { useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent, type ReactNode } from 'react'
import { ChevronDown, ChevronRight, FolderTree, GripVertical, Pencil, Plus, X } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Button, Input } from '@ruina/ui'
import type { ModuleDefinition } from '@ruina/editor-core'
import { useI18n } from '../i18n'
import { useAppStore, type DocState } from '../store'
import { emptyProject, projectKey, rowTargets, targetKey, useAnnotations, type GroupLayout } from '../lib/annotations'
import { rowKey, sourceCaption, sourceGroup, type ListRow } from '../lib/localizationSources'
import { moveListRows } from '../lib/moveListRow'

const initial: GroupLayout = { enabled: false, order: [], names: {}, collapsed: [] }
const loose = '__ungrouped__'

export function useRowGroups(module: ModuleDefinition, path: string, rows: ListRow[], sources?: DocState[], manual = false, onMove?: (row: ListRow) => void, blockMove = false) {
  const { t } = useI18n()
  const project = useAppStore((s) => s.modPath ?? '')
  const tags = useAnnotations((s) => s.enabled)
  const data = useAnnotations((s) => s.projects[projectKey(project)] ?? emptyProject)
  const scope = JSON.stringify([module.id, sources ? 'sources' : 'manual', sources ? sourceGroup(sources[0]) : path])
  const layout = data.layouts?.[scope] ?? initial
  const update = (fn: (current: GroupLayout) => GroupLayout) => useAnnotations.getState().update(project, (p) =>
    ({ ...p, layouts: { ...p.layouts, [scope]: fn(p.layouts?.[scope] ?? initial) } }))
  const available = Boolean(project && (sources || (tags && manual && path)))
  const enabled = available && layout.enabled
  const keys = useMemo(() => {
    const targets = enabled && !sources ? rowTargets(module.id, path, rows) : []
    return new Map(targets.map((v, i) => [rowKey(rows[i]), targetKey(v)]))
  }, [enabled, module.id, path, rows, sources])
  const placement = (r: ListRow) => data.placements?.[keys.get(rowKey(r)) ?? '']
  const groupOf = (r: ListRow) => {
    if (sources) return r.source!
    const group = placement(r)?.group
    return group && layout.names[group] ? group : loose
  }
  const ids = sources ? sources.map((s) => s.path) : [...Object.keys(layout.names), loose]
  const order = [...layout.order.filter((id) => ids.includes(id)), ...ids.filter((id) => !layout.order.includes(id))]
  const buckets = useMemo(() => {
    const groups = new Map<string, ListRow[]>()
    if (enabled) {
      for (const row of rows) {
        const id = groupOf(row)
        const list = groups.get(id) ?? []
        list.push(row); groups.set(id, list)
      }
      if (!sources) for (const list of groups.values()) list.sort((a,b) => (placement(a)?.rank ?? Infinity) - (placement(b)?.rank ?? Infinity))
    }
    return groups
  }, [enabled, rows, keys, data.placements, sources, layout.names])
  const rename = (id: string | undefined, value: string) => {
    const name = value.trim()
    if (!name || Object.entries(layout.names).some(([k,v]) => k !== id && v === name) || name === t('groups.loose')) return false
    const key = id ?? crypto.randomUUID()
    update((l) => ({ ...l, names: { ...l.names, [key]: name }, order: id ? l.order : [...order.filter((v) => v !== loose), key, loose] }))
    return true
  }
  const remove = (id: string) => useAnnotations.getState().update(project, (p) => {
    const names = { ...layout.names }; delete names[id]
    const placements = { ...p.placements }
    for (const key of keys.values()) if (placements[key]?.group === id) delete placements[key]
    return { ...p, placements, layouts: { ...p.layouts, [scope]: { ...layout, names, order: order.filter((v) => v !== id), collapsed: layout.collapsed.filter((v) => v !== id) } } }
  })
  const dropRows = (moving: ListRow[], focus: ListRow, id: string, anchor?: ListRow, after = false): ListRow[] | undefined => {
    const movingKeys = new Set(moving.map(rowKey))
    if (anchor && movingKeys.has(rowKey(anchor))) return
    if (sources) {
      const state = useAppStore.getState()
      if (blockMove) { state.setStatus(t('groups.draft'), 'error'); return }
      const result = moveListRows(module, moving, id, focus, anchor, after)
      if ('error' in result) { state.setStatus(t(result.error, { id: result.id ?? focus.id }), 'error'); return }
      onMove?.(result.rows[moving.indexOf(focus)])
      return result.rows
    }
    if (moving.some((row) => !keys.has(rowKey(row)))) return
    const members = (buckets.get(id) ?? []).filter((row) => !movingKeys.has(rowKey(row)))
    const at = anchor ? members.findIndex((row) => rowKey(row) === rowKey(anchor)) + Number(after) : members.length
    members.splice(at, 0, ...moving)
    useAnnotations.getState().update(project, (p) => {
      const placements = { ...p.placements }
      members.forEach((v, rank) => { placements[keys.get(rowKey(v))!] = { group: id, rank } })
      return { ...p, placements }
    })
    return moving
  }
  return { scope, available, enabled, manual: !sources, layout, order, buckets, groupOf, rename, remove, dropRows,
    toggle: () => update((l) => ({ ...l, enabled: !l.enabled })),
    title: (id: string) => sources ? sourceCaption(id) : layout.names[id] ?? t('groups.loose'),
    collapse: (id: string) => update((l) => ({ ...l, collapsed: l.collapsed.includes(id) ? l.collapsed.filter((k) => k !== id) : [...l.collapsed, id] })),
    reorder: (id: string, dest: string, after: boolean) => {
      if (id === dest) return
      const next = order.filter((k) => k !== id)
      next.splice(next.indexOf(dest) + Number(after), 0, id)
      update((l) => ({ ...l, order: next }))
    } }
}
export type RowGrouping = ReturnType<typeof useRowGroups>

export function GroupToggle({ g }: { g?: RowGrouping }) {
  const { t } = useI18n()
  if (!g?.available) return null
  return <Button size="sm" variant={g.enabled ? 'secondary' : 'ghost'} className="h-6 gap-1 px-1.5 text-xs" aria-pressed={g.enabled} onClick={g.toggle}><FolderTree size={14}/>{t('groups.mode')}</Button>
}

export function GroupedRows({ g, filtered, searching, selected, onSelect, render }: { g: RowGrouping; filtered: ListRow[]; searching: boolean; selected: string | null; onSelect: (row: ListRow) => void; render: (r: ListRow) => ReactNode }) {
  const { t } = useI18n()
  const [edit, setEdit] = useState<string | null>(null), [name, setName] = useState('')
  const [over, setOver] = useState(''), [invalid, setInvalid] = useState(false)
  const drag = useRef<{ group: string } | { rows: ListRow[]; focus: ListRow } | null>(null)
  const [selection, setSelection] = useState<{ focus: string; anchor: string; keys: Set<string> } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const lastSelect = useRef(selected)
  const visible = useMemo(() => new Set(filtered.map(rowKey)), [filtered])
  const items: { id: string; row?: ListRow; count: number }[] = []
  for (const id of g.order) {
    const members = g.buckets.get(id) ?? [], hits = searching ? members.filter((r) => visible.has(rowKey(r))) : members
    if (searching && !hits.length) continue
    items.push({ id, count: hits.length })
    if (searching || !g.layout.collapsed.includes(id)) for (const row of hits) items.push({ id, row, count: 0 })
  }
  // Use display order, including off-screen virtual rows, but exclude filtered and folded rows.
  const displayed = items.flatMap((item) => item.row ? [item.row] : [])
  const current = selection?.focus === selected ? selection : null
  const selectedKeys = current?.keys ?? new Set(selected ? [selected] : [])
  const selectClick = (event: MouseEvent, row: ListRow) => {
    const key = rowKey(row)
    const additive = event.ctrlKey || event.metaKey
    const keys = additive ? new Set(displayed.map(rowKey).filter((k) => selectedKeys.has(k))) : new Set<string>()
    const anchor = current?.anchor ?? selected
    const start = event.shiftKey && anchor ? displayed.findIndex((r) => rowKey(r) === anchor) : -1
    if (start >= 0) {
      const end = displayed.indexOf(row)
      for (const r of displayed.slice(Math.min(start, end), Math.max(start, end) + 1)) keys.add(rowKey(r))
    } else if (additive && keys.has(key)) keys.delete(key)
    else keys.add(key)
    const focus = keys.size && !keys.has(key) ? displayed.find((r) => keys.has(rowKey(r)))! : row
    setSelection({ focus: rowKey(focus), anchor: start >= 0 ? anchor! : key, keys })
    onSelect(focus)
  }

  const key = (item: typeof items[number]) => item.row ? 'r:' + rowKey(item.row) : 'g:' + item.id
  const list = useVirtualizer({ count: items.length, getScrollElement: () => box.current, estimateSize: (i) => items[i].row ? 44 : 34,
    getItemKey: (i) => key(items[i]), overscan: 10 })
  useEffect(() => {
    if (!selected || selected === lastSelect.current) return
    const row = filtered.find((r) => rowKey(r) === selected)
    if (!row) return
    const id = g.groupOf(row)
    if (!searching && g.layout.collapsed.includes(id)) { g.collapse(id); return }
    lastSelect.current = selected
    const i = items.findIndex((item) => item.row === row || (item.row && rowKey(item.row) === selected))
    if (i >= 0) list.scrollToIndex(i, { align: 'auto' })
  }, [selected, items])
  const start = (e: DragEvent, value: NonNullable<typeof drag.current>) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', 'group' in value ? value.group : value.rows.map((r) => r.id).join('\n'))
    drag.current = value
  }
  const startRows = (event: DragEvent, row: ListRow) => {
    const rows = selectedKeys.has(rowKey(row)) ? displayed.filter((r) => selectedKeys.has(rowKey(r))) : [row]
    start(event, { rows, focus: row })
  }
  const drop = (event: DragEvent, id: string, anchor: ListRow | undefined, after: boolean) => {
    const payload = drag.current
    if (!payload) return
    event.preventDefault()
    if ('group' in payload) {
      if (!anchor) g.reorder(payload.group, id, after)
    } else {
      const moved = g.dropRows(payload.rows, payload.focus, id, anchor, after)
      if (moved) {
        const focus = moved[payload.rows.indexOf(payload.focus)]
        const key = rowKey(focus)
        setSelection({ focus: key, anchor: key, keys: new Set(moved.map(rowKey)) })
        if (g.manual) onSelect(focus)
      }
    }
    end()
  }
  const end = () => { drag.current = null; setOver('') }
  const begin = (id: string) => { setEdit(id); setName(id ? g.title(id) : ''); setInvalid(false) }
  const save = () => { if (g.rename(edit || undefined, name)) setEdit(null); else setInvalid(true) }
  return <div className="flex min-h-0 flex-1 flex-col">
    {g.manual && <div className="border-b border-border px-2 py-1">{edit === null
      ? <Button size="sm" variant="ghost" className="h-7" onClick={() => begin('')}><Plus/>{t('groups.new')}</Button>
      : <form className="flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); save() }}><Input autoFocus value={name} aria-invalid={invalid} aria-label={t('groups.name')} placeholder={t('groups.name')} onKeyDown={(e) => { if (e.key === 'Escape') setEdit(null) }} onChange={(e) => { setName(e.target.value); setInvalid(false) }}/><Button size="sm" type="submit">{t('groups.ok')}</Button><button type="button" aria-label={t('tags.close')} onClick={() => setEdit(null)}><X size={16}/></button></form>}</div>}
    <div ref={box} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {!items.length && <div className="p-4 text-xs text-muted-foreground">{t('noMatch')}</div>}
      <div style={{ height: list.getTotalSize(), position: 'relative' }}>{list.getVirtualItems().map((v) => {
        const item = items[v.index], { row, id } = item, k = key(item), closed = !searching && g.layout.collapsed.includes(id)
        const side = (e: DragEvent) => Boolean(drag.current && 'rows' in drag.current) || e.clientY > e.currentTarget.getBoundingClientRect().top + e.currentTarget.clientHeight / 2
        return <div key={k} data-index={v.index} data-group={row ? undefined : id} data-group-row={row?.id} data-selected={row ? selectedKeys.has(rowKey(row)) : undefined} ref={list.measureElement}
          style={{ position: 'absolute', width: '100%', top: 0, transform: 'translateY(' + v.start + 'px)', boxShadow: over === k + ':after' ? 'inset 0 -2px hsl(var(--primary))' : over === k ? 'inset 0 2px hsl(var(--primary))' : undefined }}
          onClick={row ? (event) => selectClick(event, row) : undefined}
          draggable onDragStart={(e) => row ? startRows(e, row) : start(e, { group: id })} onDragEnd={end}
          onDragOver={(e) => { if (!drag.current || ('group' in drag.current && row)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(k + (side(e) ? ':after' : '')) }}
          onDrop={(e) => drop(e, id, row, side(e))}
          className={row ? 'select-none border-l-2 border-border pl-2 data-[selected=true]:border-primary data-[selected=true]:bg-accent' : 'flex items-center gap-1 border-b border-border bg-secondary/60 px-2 py-1'}>
          {row ? render(row) : <><GripVertical aria-hidden size={13} className="shrink-0 cursor-grab text-muted-foreground"/>
            <button type="button" aria-expanded={!closed} title={id === loose || g.manual ? g.title(id) : id} disabled={searching} onClick={() => g.collapse(id)} className="flex min-w-0 flex-1 items-center gap-1 text-left text-xs font-medium">
              {closed ? <ChevronRight size={14}/> : <ChevronDown size={14}/>}<span className="min-w-0 flex-1 break-all">{g.title(id)}</span><span className="px-1 text-muted-foreground">{item.count}</span></button>
            {g.manual && id !== loose && <><button aria-label={t('groups.rename')} onClick={() => begin(id)}><Pencil size={13}/></button><button aria-label={t('groups.remove')} onClick={() => g.remove(id)}><X size={14}/></button></>}</>}
        </div>
      })}</div>
    </div>
  </div>
}
