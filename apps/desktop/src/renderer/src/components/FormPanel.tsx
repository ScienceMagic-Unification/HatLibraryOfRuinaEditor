import { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import type { EntityRef, FieldDef, ModuleDefinition, ValidationIssue } from '@ruina/editor-core'
import { getFieldValue, getMulti } from '@ruina/editor-core'
import { AlertTriangle } from 'lucide-react'
import { Input, Label } from '@ruina/ui'
import { FieldEditor } from './FieldEditor'
import { LinkedNameField } from './LinkedNameField'
import { FieldTitle } from './FieldTitle'
import { AbilityDescPreview } from './AbilityDescPreview'
import { cardAccent } from '../lib/cardAccent'

export function FormPanel({
  module,
  entity,
  issues,
  onFieldChange,
  onIdChange
}: {
  module: ModuleDefinition
  entity: EntityRef
  issues: ValidationIssue[]
  onFieldChange: (field: FieldDef, value: unknown) => void
  onIdChange: (id: string) => void
}): JSX.Element {
  const { t, tl } = useI18n()
  const entityIssues = useMemo(() => issues.filter((i) => i.entityId === entity.id), [issues, entity.id])
  const [showIds, setShowIds] = useState<Record<string, boolean>>({})
  const accent = cardAccent(entity.node)
  const hasEgo = useMemo(() => getMulti(entity.node, 'Option').some((t) => /ego/i.test(t)), [entity])
  const headerFields = (module.entity.headerFields ?? [])
    .map((n) => module.entity.fields.find((f) => f.name === n))
    .filter((f): f is FieldDef => Boolean(f))
  const priorityScriptField = module.entity.fields.find((f) => f.name === 'PriorityScript')
  const maxCoolField = module.entity.fields.find((f) => f.name === 'MaxCooltimeForEgo')
  const skinTypeField = module.entity.fields.find((f) => f.name === 'SkinChangeType')
  const skinHeightField = module.entity.fields.find((f) => f.name === 'SkinHeight')
  const bodyFields = module.entity.fields.filter(
    (f) =>
      !(module.entity.headerFields ?? []).includes(f.name) &&
      f.name !== 'PriorityScript' &&
      f.name !== 'SkinChangeType' &&
      f.name !== 'SkinHeight' &&
      !(f.name === 'MaxCooltimeForEgo' && !hasEgo)
  )

  const handleFieldChange = (field: FieldDef, value: unknown) => {
    onFieldChange(field, value)
    if (field.name === 'Option' && maxCoolField) {
      const next = (value ?? []) as string[]
      const nowEgo = next.some((t) => /ego/i.test(t))
      if (nowEgo && ['', '0'].includes(((getFieldValue(entity.node, maxCoolField) as string) ?? '').trim())) {
        onFieldChange(maxCoolField, '9')
      }
    }
    if (field.name === 'SkinChange') {
      if (value === true) {
        if (skinTypeField && !((getFieldValue(entity.node, skinTypeField) as string) ?? '').trim()) {
          onFieldChange(skinTypeField, 'EGO')
        }
        if (skinHeightField && !((getFieldValue(entity.node, skinHeightField) as string) ?? '').trim()) {
          onFieldChange(skinHeightField, '0')
        }
      } else {
        if (skinTypeField) onFieldChange(skinTypeField, '')
        if (skinHeightField) onFieldChange(skinHeightField, '')
      }
    }
  }

  const isToggleable = (field: FieldDef): boolean => {
    if (field.kind === 'enum') return field.asChips === true && field.noIdToggle !== true
    if (field.kind === 'attr') return field.field.kind === 'enum' && field.field.asChips === true && field.field.noIdToggle !== true
    return field.name === 'Option'
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
        <div className="flex flex-wrap items-end gap-4 rounded-md border border-border/60 bg-secondary/20 p-3">
          <div className={module.entity.idOnlyList ? 'min-w-0 flex-1 space-y-1.5' : 'w-40 shrink-0 space-y-1.5'}>
            <Label>
              {t('id.label')}
              <span className="ml-0.5 text-red-400">*</span>
            </Label>
            <Input
              value={entity.id}
              onChange={(e) => onIdChange(module.entity.idNumeric ? e.target.value.replace(/\D/g, '') : e.target.value)}
              inputMode={module.entity.idNumeric ? 'numeric' : undefined}
              className={module.entity.idOnlyList ? 'font-mono min-w-[16rem] max-w-full' : 'font-mono'}
              style={module.entity.idOnlyList ? { width: `${Math.max(16, entity.id.length + 2)}ch` } : undefined}
              placeholder={module.entity.idAttr}
            />
          </div>
          {headerFields.map((field) => (
            <div key={field.name} className="w-32 shrink-0 space-y-1.5">
              <Label>{tl(field.label ?? field.name)}</Label>
              <FieldEditor field={field} value={getFieldValue(entity.node, field)} onChange={(v) => handleFieldChange(field, v)} />
            </div>
          ))}
        </div>
        {bodyFields.map((field) => {
          if (field.name === 'SkinChange') {
            const skinOn = Boolean(getFieldValue(entity.node, field))
            const skinNameField: FieldDef = { kind: 'text', name: 'SkinChange', label: '皮肤名称', omitWhenEmpty: true }
            return (
              <div key={field.name} className="space-y-2">
                <FieldEditor field={field} value={skinOn} onChange={(v) => handleFieldChange(field, v)} />
                {skinOn ? (
                  <div className="ml-1 space-y-2 rounded-md border border-border/70 bg-secondary/20 p-3">
                    <div className="space-y-1">
                      <Label>{t('skinName')}</Label>
                      <FieldEditor
                        field={skinNameField}
                        value={(getFieldValue(entity.node, skinNameField) as string) ?? ''}
                        onChange={(v) => handleFieldChange(skinNameField, v)}
                      />
                    </div>
                    {skinTypeField ? (
                      <div className="space-y-1">
                        <Label>{t('switchType')}</Label>
                        <FieldEditor
                          field={skinTypeField}
                          value={getFieldValue(entity.node, skinTypeField)}
                          onChange={(v) => handleFieldChange(skinTypeField, v)}
                          accentColor={accent}
                        />
                      </div>
                    ) : null}
                    {skinHeightField ? (
                      <div className="space-y-1">
                        <Label>{t('skinHeight')}</Label>
                        <FieldEditor
                          field={skinHeightField}
                          value={getFieldValue(entity.node, skinHeightField)}
                          onChange={(v) => handleFieldChange(skinHeightField, v)}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          }
          if (field.name === 'MapChange') {
            const mapOn = Boolean(getFieldValue(entity.node, field))
            const mapNameField: FieldDef = { kind: 'text', name: 'MapChange', label: '地图名称' }
            return (
              <div key={field.name} className="space-y-2">
                <FieldEditor field={field} value={mapOn} onChange={(v) => handleFieldChange(field, v)} />
                {mapOn ? (
                  <div className="ml-1 rounded-md border border-border/70 bg-secondary/20 p-3">
                    <div className="space-y-1">
                      <Label>{t('mapName')}</Label>
                      <FieldEditor
                        field={mapNameField}
                        value={(getFieldValue(entity.node, mapNameField) as string) ?? ''}
                        onChange={(v) => handleFieldChange(mapNameField, v)}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            )
          }
          if (field.name === 'Priority') {
            return (
              <div key={field.name} className="space-y-1.5">
                <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
                  <div className="space-y-1">
                    <Label>{t('priority')}</Label>
                    <FieldEditor field={field} value={getFieldValue(entity.node, field)} onChange={(v) => handleFieldChange(field, v)} accentColor={accent} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('priorityScript')}</Label>
                    {priorityScriptField ? (
                      <FieldEditor
                        field={priorityScriptField}
                        value={getFieldValue(entity.node, priorityScriptField)}
                        onChange={(v) => handleFieldChange(priorityScriptField, v)}
                        accentColor={accent}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            )
          }
          const toggleable = isToggleable(field)
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
                  <Label title={field.help}>
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
                  onValueChange={(v) => handleFieldChange(field, v)}
                />
              ) : (
                <FieldEditor
                  field={field}
                  value={getFieldValue(entity.node, field)}
                  onChange={(v) => handleFieldChange(field, v)}
                  accentColor={accent}
                  showIds={Boolean(showIds[field.name])}
                />
              )}
            </div>
          )
        })}
        {module.id === 'cardability' ? <AbilityDescPreview module={module} entity={entity} /> : null}
      </div>
      {entityIssues.length > 0 ? (
        <div className="max-h-36 overflow-y-auto border-t border-border bg-red-500/5 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-red-400">
            <AlertTriangle className="size-3.5" /> {t('issueCount', { n: entityIssues.length })}
          </div>
          <ul className="space-y-1">
            {entityIssues.map((i, x) => (
              <li key={x} className="text-[11px] leading-snug text-red-300/90">
                {i.message}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="border-t border-border bg-emerald-500/5 p-3 text-[11px] text-emerald-400/90">
          {t('valid')}
        </div>
      )}
    </div>
  )
}