import type { OrderedDoc } from './xml'
import type { EntitySchema, FieldDef, ValidationIssue } from './schema'
import { listEntities, getFieldValue } from './document'

function validateScalar(
  value: string | undefined,
  field: Extract<FieldDef, { kind: 'text' | 'int' | 'enum' | 'multiline' | 'bool' }>,
  issues: ValidationIssue[],
  ctx: { entityId: string; entityIndex: number; prefix?: string }
): void {
  const v = value ?? ''
  const label = field.label ?? field.name
  if (field.kind === 'bool') return
  if (field.kind === 'int') {
    if (v !== '' && !/^-?\d+$/.test(v)) {
      issues.push({ ...ctx, field: ctx.prefix ? `${ctx.prefix}.${field.name}` : field.name, message: `字段「${label}」必须是整数，当前值为「${v}」`, severity: 'error' })
    }
    if (v !== '' && field.min !== undefined && Number(v) < field.min) {
      issues.push({ ...ctx, field: field.name, message: `字段「${label}」不能小于 ${field.min}`, severity: 'warning' })
    }
    if (v !== '' && field.max !== undefined && Number(v) > field.max) {
      issues.push({ ...ctx, field: field.name, message: `字段「${label}」不能大于 ${field.max}`, severity: 'warning' })
    }
    return
  }
  if (field.kind === 'enum') {
    if (v !== '' && !field.values.includes(v) && !(field as any).allowCustom) {
      issues.push({ ...ctx, field: ctx.prefix ? `${ctx.prefix}.${field.name}` : field.name, message: `字段「${label}」的值「${v}」不在允许列表：${field.values.join('、')}`, severity: 'error' })
    }
    return
  }
  const required = (field as any).required === true
  if (required && v.trim() === '') {
    issues.push({ ...ctx, field: field.name, message: `字段「${label}」为必填项`, severity: 'error' })
  }
}

function validateField(node: Record<string, unknown>, field: FieldDef, issues: ValidationIssue[], ctx: { entityId: string; entityIndex: number }): void {
  const raw = getFieldValue(node as any, field)
  switch (field.kind) {
    case 'text':
    case 'int':
    case 'enum':
    case 'multiline':
      validateScalar(typeof raw === 'string' ? raw : undefined, field, issues, ctx)
      return
    case 'attrs': {
      const values = (raw ?? {}) as Record<string, string>
      for (const a of field.attrs) {
        validateScalar(values[a.name], a, issues, { ...ctx, prefix: field.name })
      }
      return
    }
    case 'multi': {
      const values = (raw ?? []) as string[]
      if (field.values) {
        for (const v of values) {
          if (!field.values.includes(v)) {
            issues.push({ ...ctx, field: field.name, message: `字段「${field.label ?? field.name}」的值「${v}」不在允许列表：${field.values.join('、')}`, severity: 'warning' })
          }
        }
      }
      return
    }
    case 'list': {
      const rows = (raw ?? []) as Record<string, unknown>[]
      rows.forEach((row, ri) => {
        for (const a of field.attrs) {
          const v = (row as any)[':@']?.['@_' + a.name]
          validateScalar(typeof v === 'string' ? v : undefined, a, issues, { ...ctx, prefix: `${field.name}[${ri}]` })
        }
      })
      return
    }
    case 'attr':
      validateScalar(typeof raw === 'string' ? raw : undefined, field.field, issues, ctx)
      return
    default:
      return
  }
}

export function validateEntities(doc: OrderedDoc, schema: EntitySchema): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const refs = listEntities(doc, schema)
  const seen = new Map<string, number>()
  refs.forEach((ref, i) => {
    const id = ref.id.trim()
    if (id === '') {
      issues.push({ entityId: '', entityIndex: i, message: `第 ${i + 1} 条记录缺少 ${schema.idAttr}`, severity: 'error' })
    } else {
      seen.set(id, (seen.get(id) ?? 0) + 1)
    }
    for (const f of schema.fields) validateField(ref.node, f, issues, { entityId: id, entityIndex: i })
  })
  for (const [id, count] of seen) {
    if (count > 1) {
      issues.push({ entityId: id, entityIndex: -1, message: `${schema.idAttr}=${id} 出现 ${count} 次，ID 必须唯一`, severity: 'error' })
    }
  }
  return issues
}
