import { getContainerChildren, listEntities, type ModuleDefinition, type OrderedNode } from '@ruina/editor-core'
import { useAppStore } from '../store'
import { entitySchemaForRow, sourceGroup, type ListRow } from './localizationSources'

type MoveResult = { rows: ListRow[] } | { error: string; id?: string }

export function moveListRows(module: ModuleDefinition, rows: ListRow[], path: string, focus: ListRow, anchor?: ListRow, after = false): MoveResult {
  const state = useAppStore.getState()
  const destination = state.docs[path]
  if (!destination || destination.loadError || destination.root !== module.entity.root || destination.bindings[module.id]?.kind !== 'primary') {
    return { error: 'groups.stale' }
  }
  const anchorSchema = anchor && entitySchemaForRow(module.entity, anchor)
  if (anchor && anchorSchema && (anchor.source !== path || getContainerChildren(destination.doc, anchorSchema)[anchor.index] !== anchor.node)) {
    return { error: 'groups.stale' }
  }
  const occupied = new Set(listEntities(destination.doc, module.entity).map((r) => r.id))
  const entries = rows.map((row) => ({ row, from: row.source ?? '', schema: entitySchemaForRow(module.entity, row) }))
  for (const { row, from, schema } of entries) {
    const source = state.docs[from]
    if (!source || source.loadError || source.bindings[module.id]?.kind !== 'primary' || sourceGroup(source) !== sourceGroup(destination) ||
        getContainerChildren(source.doc, schema)[row.index] !== row.node) return { error: 'groups.stale' }
    if (anchorSchema && JSON.stringify(anchorSchema.containerPath) !== JSON.stringify(schema.containerPath)) return { error: 'groups.container' }
    if (from !== path) {
      if (occupied.has(row.id)) return { error: 'id.duplicate', id: row.id }
      occupied.add(row.id)
    }
  }

  const paths = [...new Set([path, ...entries.map((entry) => entry.from)])]
  const transfer = paths.length > 1 ? { moduleId: module.id, from: focus.source!, to: path, id: focus.id } : undefined
  let movedNodes: OrderedNode[] = []
  const changed = state.editDocs(paths, (drafts) => {
    const anchorNode = anchor && anchorSchema ? getContainerChildren(drafts[path], anchorSchema)[anchor.index] : undefined
    // Resolve every index before removing anything, including indices in the destination.
    const removals = new Map<unknown[], number[]>()
    const insertions = new Map<unknown[], OrderedNode[]>()
    movedNodes = entries.map(({ row, from, schema }) => {
      const source = getContainerChildren(drafts[from], schema)
      const target = getContainerChildren(drafts[path], schema, true)
      const node = source[row.index] as OrderedNode
      if (!removals.has(source)) removals.set(source, [])
      if (!insertions.has(target)) insertions.set(target, [])
      removals.get(source)!.push(row.index)
      insertions.get(target)!.push(node)
      return node
    })
    for (const [container, indices] of removals) {
      for (const index of indices.sort((a, b) => b - a)) container.splice(index, 1)
    }
    for (const [container, nodes] of insertions) {
      const at = anchorNode ? container.indexOf(anchorNode) + Number(after) : container.length
      container.splice(at, 0, ...nodes)
    }
  }, transfer)
  if (!changed) return { rows }
  const refs = listEntities(useAppStore.getState().docs[path].doc, module.entity)
  const byNode = new Map(refs.map((r) => [r.node, { ...r, source: path }]))
  state.setPrimaryDoc(module.id, path)
  state.select(module.id, focus.id)
  state.markEntitiesDirty(module.id, rows.map((r) => r.id))
  return { rows: movedNodes.map((node) => byNode.get(node)!) }
}
