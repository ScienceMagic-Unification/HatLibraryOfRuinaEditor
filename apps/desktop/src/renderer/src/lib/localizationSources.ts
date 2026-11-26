import type { EntityRef, EntitySchema } from '@ruina/editor-core'
import { listEntities, nodeKey } from '@ruina/editor-core'
import type { DocState } from '../store'

export const sourceName = (path: string): string => path.split(/[\\/]/).pop() ?? path

/** Split Hat localization files put the faction after a double underscore. */
export function sourceCaption(path: string): string {
  const name = sourceName(path)
  return /__(.+)\.[^.]+$/.exec(name)?.[1] || name
}

// Stage, character and drop-book names share the same XML root.
export function sourceGroup(doc: DocState): string {
  const folder = doc.root === 'CharactersNameRoot' ? doc.path.split(/[\\/]/).slice(-2)[0]?.toLowerCase() : ''
  return JSON.stringify([doc.lang, doc.root, folder])
}

export function sameLanguageSources(docs: DocState[], language?: string, path?: string): DocState[] {
  if (language === '__none__') return []
  const chosen = docs.find((d) => d.path === path) ?? docs.find((d) => d.lang === language) ?? docs.find((d) => d.lang === 'cn') ?? docs[0]
  if (!chosen) return []
  return [chosen, ...docs.filter((d) => d !== chosen && sourceGroup(d) === sourceGroup(chosen))]
}

export function localizedIndex(docs: DocState[], schema: EntitySchema): Map<string, { ref: EntityRef; path: string }> {
  const index = new Map<string, { ref: EntityRef; path: string }>()
  for (const doc of docs) {
    for (const ref of listEntities(doc.doc, schema)) {
      if (!index.has(ref.id)) index.set(ref.id, { ref, path: doc.path })
    }
  }
  return index
}

export type ListRow = EntityRef & { source?: string }
export const rowKey = (row: ListRow): string => row.source ? JSON.stringify([row.source, row.id, nodeKey(row.node), row.index]) : row.id

export function entitySchemaForRow(schema: EntitySchema, ref: EntityRef): EntitySchema {
  const entity = nodeKey(ref.node) ?? schema.entity
  const source = schema.entitySources?.find((s) => s.entity === entity)
  return { ...schema, entitySources: undefined, entities: undefined, entity, containerPath: source?.containerPath ?? schema.containerPath }
}
