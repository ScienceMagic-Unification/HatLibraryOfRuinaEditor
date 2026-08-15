import { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import type { EntityRef, FieldDef, ModuleDefinition } from '@ruina/editor-core'
import { getFieldValue } from '@ruina/editor-core'
import { Label } from '@ruina/ui'
import { FieldEditor } from './FieldEditor'
import { LinkedNameField } from './LinkedNameField'
import { FieldTitle } from './FieldTitle'
import { cardAccent } from '../lib/cardAccent'

/**
 * 简易模式：只暴露必要字段的轻量编辑区（字段清单由模块 schema 的 quickFields 决定）
 */
export function SummaryPanel({
  module,
  entity,
  onFieldChange
}: {
  module: ModuleDefinition
  entity: EntityRef
  onFieldChange: (field: FieldDef, value: unknown) => void
}): JSX.Element {
  const { t, tl } = useI18n()
  const fields = useMemo(() => {
    const names = module.entity.quickFields ?? []
    const picked = names
      .map((n) => module.entity.fields.find((f) => f.name === n))
      .filter((f): f is FieldDef => Boolean(f))
    return picked.length > 0 ? picked : module.entity.fields
  }, [module.entity])

  const name = (getFieldValue(entity.node, { kind: 'text', name: module.entity.displayField ?? 'Name' }) as string | undefined) ?? ''
  const [showIds, setShowIds] = useState<Record<string, boolean>>({})
  const accent = cardAccent(entity.node)

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain p-5">
      <div className="mb-4 flex items-baseline gap-2 border-b border-border pb-3">
        <span className="font-mono text-sm text-muted-foreground">#{entity.id}</span>
        <span className="text-lg font-semibold">{name || t('unnamed')}</span>
      </div>
      <div className="space-y-4">
        {fields.map((field) => {
          const toggleable =
    (field.kind === 'enum' && field.asChips) ||
    (field.kind === 'attr' && field.field.kind === 'enum' && field.field.asChips) ||
    field.name === 'Option'
          return (
            <div key={field.name} className="space-y-1.5">
              {field.name !== 'Name' ? (
                toggleable ? (
                  <FieldTitle
                    label={tl(field.label ?? field.name)}
                    required={(field as any).required}
                    showIds={Boolean(showIds[field.name])}
                    onToggle={() => setShowIds((s) => ({ ...s, [field.name]: !s[field.name] }))}
                    accentColor={accent}
                  />
                ) : (
                  <Label>
                    {tl(field.label ?? field.name)}
                    {(field as any).required ? <span className="ml-0.5 text-red-400">*</span> : null}
                  </Label>
                )
              ) : null}
              {field.name === 'Name' ? (
                <LinkedNameField
                  module={module}
                  entity={entity}
                  value={(getFieldValue(entity.node, field) as string) ?? ''}
                  onValueChange={(v) => onFieldChange(field, v)}
                />
              ) : (
                <FieldEditor
                  field={field}
                  value={getFieldValue(entity.node, field)}
                  onChange={(v) => onFieldChange(field, v)}
                  accentColor={accent}
                  showIds={Boolean(showIds[field.name])}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}