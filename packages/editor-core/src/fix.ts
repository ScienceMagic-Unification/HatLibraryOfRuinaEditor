import type { OrderedDoc } from './xml'
import type { EntitySchema } from './schema'
import { getAttr, listEntities, setAttr } from './document'

/**
 * 修复重复 ID：重复出现的后续实体分配新的可用 ID。
 * 返回修复数量。
 */
export function fixDuplicateIds(doc: OrderedDoc, schema: EntitySchema): number {
  const refs = listEntities(doc, schema)
  const seen = new Set<string>()
  const maxNumeric = () => {
    let max = 0
    for (const r of refs) {
      const n = Number(r.id)
      if (Number.isFinite(n) && n > max) max = n
    }
    return max
  }
  let fixed = 0
  let next = maxNumeric() + 1
  for (const r of refs) {
    const id = r.id.trim()
    if (id === '' || seen.has(id)) {
      const candidate = String(next++)
      setAttr(r.node, schema.idAttr, candidate)
      seen.add(candidate)
      fixed++
    } else {
      seen.add(id)
    }
  }
  return fixed
}