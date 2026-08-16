import { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import type { EntityRef, FieldDef, ModuleDefinition } from '@ruina/editor-core'
import { getFieldValue } from '@ruina/editor-core'
import { Input, Label } from '@ruina/ui'
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
  onFieldChange,
  onIdChange
}: {
  module: ModuleDefinition
  entity: EntityRef
  onFieldChange: (field: FieldDef, value: unknown) => void
  onIdChange: (id: string) => void
}): JSX.Element {
  const { t, tl } = useI18n()
  const fields = useMemo(() => {
    const names = module.entity.quickFields ?? []
    const picked = names
      .map((n) => module.entity.fields.find((f) => f.name === n))
      .filter((f): f is FieldDef => Boolean(f))
      .filter((f) => !(module.id === 'passive' && f.name === 'Cost'))
    return picked.length > 0 ? picked : module.entity.fields
  }, [module.entity, module.id])

  const name = (getFieldValue(entity.node, { kind: 'text', name: module.entity.displayField ?? 'Name' }) as string | undefined) ?? ''
  const [showIds, setShowIds] = useState<Record<string, boolean>>({})
  const accent = cardAccent(entity.node)

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain p-5">
      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-md border border-border/60 bg-secondary/20 p-3">
        {module.id === 'passive' ? (
          <>
            <div className="w-40 shrink-0 space-y-1">
              <Label>{t('id.label')}<span className="ml-0.5 text-red-400">*</span></Label>
              <Input value={entity.id} onChange={(e) => onIdChange(e.target.value)} className="font-mono" />
            </div>
            {(() => {
              const cost = module.entity.fields.find((f) => f.name === 'Cost')
              return cost ? (
                <div className="w-32 shrink-0 space-y-1">
                  <Label>{tl(cost.label ?? cost.name)}</Label>
                  <FieldEditor field={cost} value={getFieldValue(entity.node, cost)} onChange={(v) => onFieldChange(cost, v)} />
                </div>
              ) : null
            })()}
          </>
        ) : (
          <span className="font-mono text-sm text-muted-foreground">#{entity.id}</span>
        )}
        {module.id !== 'passive' ? <span className="pb-1 text-lg font-semibold">{name || t('unnamed')}</span> : null}
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