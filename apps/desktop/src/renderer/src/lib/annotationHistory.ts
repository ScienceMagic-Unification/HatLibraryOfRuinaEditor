import { listEntities, type ModuleDefinition } from '@ruina/editor-core'
import type { DocState } from '../store'
import { type Placement, projectKey, rowTargets, supportsTags, targetKey, useAnnotations } from './annotations'

interface Change { before?: string; after?: string; detached?: string[]; placement?: Placement }

function apply(project: string, changes: Change[], forward: boolean) {
  const store = useAnnotations.getState()
  const data = store.projects[projectKey(project)]
  if (!data || !changes.length) return
  const links = { ...data.links }, placements = { ...data.placements }
  let touched = false
  const writes = changes.map((change) => {
    const from = forward ? change.before : change.after, to = forward ? change.after : change.before
    const ids = from ? data.links[from] : change.detached
    const placement = from ? data.placements?.[from] : change.placement
    if (from && (ids || placement)) { delete links[from]; delete placements[from]; touched = true }
    if (!to) { change.detached = ids; change.placement = placement }
    return { to, ids, placement }
  })
  for (const { to, ids, placement } of writes) {
    if (!to) continue
    const valid = ids?.filter((id) => data.tags.some((tag) => tag.id === id))
    if (valid?.length) { links[to] = valid; touched = true }
    if (placement) { placements[to] = placement; touched = true }
  }
  if (touched) store.update(project, (current) => ({ ...current, links, placements }))
}

// Capture identity across all participants, including a node transferred to another XML.
export function beforeAnnotationEdit(project: string, docs: DocState[], modules: ModuleDefinition[]) {
  const capture = () => modules.flatMap((m) => {
    const keys = new Map<object, string>()
    for (const d of docs) {
      if (d.bindings[m.id]?.kind !== 'primary' || (!supportsTags(m.id) && d.bindings[m.id].locDef)) continue
      const rows = listEntities(d.doc, m.entity)
      const targets = rowTargets(m.id, d.path, rows)
      rows.forEach((row, i) => keys.set(row.node, targetKey(targets[i])))
    }
    return keys.size || docs.some((d) => d.bindings[m.id]?.kind === 'primary') ? [{ keys, id: m.id }] : []
  })
  const before = capture()
  return () => {
    const changes: Change[] = []
    for (const { id, keys } of capture()) {
      const old = before.find((m) => m.id === id)?.keys ?? new Map<object, string>()
      const matched = new Set<string>()
      const next = Array.from(keys)
      let i = 0
      for (const [node, from] of old) {
        // Source editing can replace an entire node at the same index.
        const to = keys.get(node) ?? (docs.length === 1 && old.size === keys.size && !old.has(next[i][0]) ? next[i][1] : undefined)
        if (to) matched.add(to)
        if (from !== to) changes.push({ before: from, after: to })
        i++
      }
      for (const to of keys.values()) if (!matched.has(to)) changes.push({ after: to })
    }
    apply(project, changes, true)
    return (redo: boolean) => apply(project, changes, redo)
  }
}
