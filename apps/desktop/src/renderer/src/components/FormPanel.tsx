import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'
import type { EntityRef, FieldDef, ModuleDefinition, ValidationIssue } from '@ruina/editor-core'
import { getAllText, getFieldValue, getMulti, getTextField, removeField, setAllText, setFieldValue, setTextField } from '@ruina/editor-core'
import { AlertTriangle, Hash } from 'lucide-react'
import { Input, Label } from '@ruina/ui'
import { FieldEditor } from './FieldEditor'
import { LinkedNameField } from './LinkedNameField'
import { FieldTitle } from './FieldTitle'
import { AbilityDescPreview } from './AbilityDescPreview'
import { EffectTextPreviewPanel } from './EffectTextPreviewPanel'
import { PassiveAbilityPreviewPanel } from './PassiveAbilityPreviewPanel'
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
  const proofOn = useAppStore((s) => Boolean(s.proofMode[module.id]))
  const editData = useAppStore((s) => s.editData)
  const isCardAbility = module.id === 'cardability'
  const detectAbilityMode = (): 'independent' | 'continuous' =>
    isCardAbility && getMulti(entity.node, 'Desc').length > 1 ? 'independent' : 'continuous'
  const [abilityMode, setAbilityModeState] = useState<'independent' | 'continuous'>(detectAbilityMode)
  useEffect(() => {
    setAbilityModeState(detectAbilityMode())
  }, [entity.id, module.id])
  const setDescMode = (mode: 'independent' | 'continuous') => {
    setAbilityModeState(mode)
    editData(module.id, (_doc, refs) => {
      const cur = refs.find((r) => r.id === entity.id)
      if (!cur) return
      if (mode === 'continuous') {
        const text = getAllText(cur.node, 'Desc')
        removeField(cur.node, 'Desc')
        setTextField(cur.node, 'Desc', text)
      } else {
        const text = getTextField(cur.node, 'Desc') ?? ''
        setAllText(cur.node, 'Desc', text)
      }
    })
  }
  const entityIssues = useMemo(() => issues.filter((i) => i.entityId === entity.id), [issues, entity.id])
  const [showIds, setShowIds] = useState<Record<string, boolean>>({})
  const [showBoolIds, setShowBoolIds] = useState(false)
  type InnerKind = 'custom' | 'copy'
  type InnerMode = 'current' | 'vanilla' | 'other'
  const deriveInnerState = (): { on: boolean; kind: InnerKind; mode: InnerMode } => {
    const customValue = ((getFieldValue(entity.node, { kind: 'text', name: 'CustomInnerType' }) as string) ?? '').trim()
    const copyText = ((getFieldValue(entity.node, { kind: 'text', name: 'CopyInnerTypeFrom' }) as string) ?? '').trim()
    const copyPid = ((getFieldValue(entity.node, { kind: 'attr', name: 'CopyInnerTypePid', element: 'CopyInnerTypeFrom', attr: 'Pid', field: { kind: 'text', name: 'Pid' } }) as string) ?? '').trim()
    const hasCopy = copyText !== '' || copyPid !== ''
    if (hasCopy) return { on: true, kind: 'copy', mode: copyPid === '@origin' ? 'vanilla' : copyPid !== '' ? 'other' : 'current' }
    return { on: customValue !== '', kind: 'custom', mode: 'current' }
  }
  const [innerState, setInnerState] = useState<{ on: boolean; kind: InnerKind; mode: InnerMode }>(deriveInnerState)
  useEffect(() => {
    setInnerState(deriveInnerState())
  }, [entity.id, module.id])
  const isEffectText = module.id === 'effecttext'
  const accent = cardAccent(entity.node)
  const hasEgo = useMemo(() => getMulti(entity.node, 'Option').some((t) => /ego/i.test(t)), [entity])
  const headerFields = (module.entity.headerFields ?? [])
    .map((n) => module.entity.fields.find((f) => f.name === n))
    .filter((f): f is FieldDef => Boolean(f))
  const priorityScriptField = module.entity.fields.find((f) => f.name === 'PriorityScript')
  const maxCoolField = module.entity.fields.find((f) => f.name === 'MaxCooltimeForEgo')
  const skinTypeField = module.entity.fields.find((f) => f.name === 'SkinChangeType')
  const skinHeightField = module.entity.fields.find((f) => f.name === 'SkinHeight')
  const boolFields = module.entity.fields.filter((f) => f.kind === 'bool')
  const bodyFields = module.entity.fields
    .filter(
      (f) =>
        !(module.entity.headerFields ?? []).includes(f.name) &&
        f.name !== 'PriorityScript' &&
        f.name !== 'SkinChangeType' &&
        f.name !== 'SkinHeight' &&
        !(f.name === 'MaxCooltimeForEgo' && !hasEgo)
    )
    .sort((a, b) => (module.id === 'passive' ? (a.name === 'Rarity' ? -1 : b.name === 'Rarity' ? 1 : 0) : 0))
    .filter((f) => f.kind !== 'bool')

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
              className={module.entity.idOnlyList ? 'font-mono w-full' : 'font-mono'}
              
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
        {boolFields.length > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>{t('attributes')}</Label>
              <button
                type="button"
                onClick={() => setShowBoolIds((v) => !v)}
                title={showBoolIds ? t('showName') : t('showId')}
                className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-all hover:opacity-80 active:scale-95"
                style={showBoolIds ? { color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))', backgroundColor: 'hsl(var(--primary) / 0.12)' } : { color: 'hsl(var(--muted-foreground))', borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--secondary))' }}
              >
                <Hash className="size-3" /> ID
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {boolFields.map((f) => (
                <FieldEditor key={f.name} field={f} value={getFieldValue(entity.node, f)} onChange={(v) => handleFieldChange(f, v)} showIds={showBoolIds} accentColor={accent} />
              ))}
            </div>
          </div>
        ) : null}
        {bodyFields.map((field) => {
          if (field.name === 'Desc' && module.id === 'cardability') {
            const descField: FieldDef = { kind: 'multiline', name: 'Desc', label: '能力描述', multiLineElements: abilityMode === 'independent' }
            return (
              <div key={field.name} className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">{t('abilityMode.label')}</span>
                  <button type="button" onClick={() => setDescMode('independent')} className={`rounded-full border px-2.5 py-1 text-xs ${abilityMode === 'independent' ? 'bg-accent/60' : 'border-border bg-secondary/30 text-muted-foreground hover:bg-accent/40'}`}>{t('abilityMode.independent')}</button>
                  <button type="button" onClick={() => setDescMode('continuous')} className={`rounded-full border px-2.5 py-1 text-xs ${abilityMode === 'continuous' ? 'bg-accent/60' : 'border-border bg-secondary/30 text-muted-foreground hover:bg-accent/40'}`}>{t('abilityMode.continuous')}</button>
                </div>
                <FieldEditor field={descField} value={getFieldValue(entity.node, descField)} onChange={(v) => handleFieldChange(descField, v)} />
              </div>
            )
          }
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
          if (field.name === 'InnerType') {
            const raw = ((getFieldValue(entity.node, field) as string) ?? '').trim()
            const display = raw === '-1' ? '' : raw
            const innerField: FieldDef = { kind: 'int', name: 'InnerType', label: '互斥类型', digitsOnly: true, placeholder: '-1', widthClass: 'w-24' }
            return (
              <div key={field.name} className="space-y-1.5">
                <Label>{tl('互斥类型')}</Label>
                <FieldEditor field={innerField} value={display} onChange={(v) => onFieldChange(field, v === '' ? '-1' : v)} accentColor={accent} />
              </div>
            )
          }
          if (field.name === 'UseCustomInnerType') {
            const customField: FieldDef = { kind: 'text', name: 'CustomInnerType', label: '自定义互斥类型', omitWhenEmpty: true }
            const copyTextField: FieldDef = { kind: 'int', name: 'CopyInnerTypeFrom', label: '与指定被动互斥', digitsOnly: true }
            const copyPidField: FieldDef = { kind: 'attr', name: 'CopyInnerTypePid', element: 'CopyInnerTypeFrom', attr: 'Pid', field: { kind: 'text', name: 'Pid' } }
            const customValue = ((getFieldValue(entity.node, customField) as string) ?? '').trim()
            const copyText = ((getFieldValue(entity.node, copyTextField) as string) ?? '').trim()
            const copyPid = ((getFieldValue(entity.node, copyPidField) as string) ?? '').trim()
            const modId = copyPid === '@origin' ? '' : copyPid
            const writeInner = (mutate: (node: any) => void) => {
              editData(module.id, (_doc, refs) => {
                const cur = refs.find((r) => r.id === entity.id)
                if (cur) mutate(cur.node)
              })
            }
            const writeCustom = (v: string) => {
              writeInner((node) => {
                removeField(node, 'CopyInnerTypeFrom')
                if (v === '') removeField(node, 'CustomInnerType')
                else setFieldValue(node, customField, v)
              })
            }
            const writeCopy = (mode: InnerMode, passiveId: string, modIdValue: string) => {
              writeInner((node) => {
                removeField(node, 'CustomInnerType')
                if (passiveId === '') {
                  removeField(node, 'CopyInnerTypeFrom')
                  return
                }
                setFieldValue(node, copyTextField, passiveId)
                if (mode === 'current') setFieldValue(node, copyPidField, '')
                else if (mode === 'vanilla') setFieldValue(node, copyPidField, '@origin')
                else setFieldValue(node, copyPidField, modIdValue)
              })
            }
            const setKind = (k: InnerKind) => {
              setInnerState((s) => ({ ...s, kind: k }))
              if (k === 'custom') writeCustom(customValue)
              else writeInner((node) => removeField(node, 'CustomInnerType'))
            }
            const setMode = (m: InnerMode) => {
              setInnerState((s) => ({ ...s, mode: m }))
              if (m === 'vanilla') writeCopy('vanilla', copyText, '')
              else if (m === 'current') writeCopy('current', copyText, '')
              else writeCopy('other', copyText, modId)
            }
            return (
              <div key={field.name} className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={innerState.on}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setInnerState((s) => ({ ...s, on: true }))
                      } else {
                        setInnerState((s) => ({ ...s, on: false }))
                        writeInner((node) => {
                          removeField(node, 'CustomInnerType')
                          removeField(node, 'CopyInnerTypeFrom')
                        })
                      }
                    }}
                    className="size-4 accent-[hsl(var(--primary))]"
                  />
                  <span className="text-sm">{tl(field.label ?? field.name)}</span>
                  <span className="text-[10px] text-amber-400/80">{t('extraBridgeHint')}</span>
                </label>
                {innerState.on ? (
                  <div className="ml-1 space-y-2 rounded-md border border-border/70 bg-secondary/20 p-3">
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setKind('custom')}
                        className={`rounded-full border px-2.5 py-1 text-xs ${innerState.kind === 'custom' ? 'bg-accent/60' : 'border-border bg-secondary/30 text-muted-foreground hover:bg-accent/40'}`}
                      >
                        {t('innerType.custom')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setKind('copy')}
                        className={`rounded-full border px-2.5 py-1 text-xs ${innerState.kind === 'copy' ? 'bg-accent/60' : 'border-border bg-secondary/30 text-muted-foreground hover:bg-accent/40'}`}
                      >
                        {t('innerType.copyFrom')}
                      </button>
                    </div>
                    {innerState.kind === 'custom' ? (
                      <div className="space-y-1">
                        <Label>{tl('自定义互斥类型')}</Label>
                        <FieldEditor field={customField} value={customValue} onChange={(v) => writeCustom((v as string) ?? '')} />
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-1.5">
                          {(['current', 'vanilla', 'other'] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setMode(m)}
                              className={`rounded-full border px-2.5 py-1 text-xs ${innerState.mode === m ? 'bg-accent/60' : 'border-border bg-secondary/30 text-muted-foreground hover:bg-accent/40'}`}
                            >
                              {m === 'current' ? t('innerType.currentMod') : m === 'vanilla' ? t('innerType.vanilla') : t('innerType.otherMod')}
                            </button>
                          ))}
                        </div>
                        {innerState.mode === 'current' ? (
                          <div className="space-y-1">
                            <Label>{t('innerType.passiveId')}</Label>
                            <FieldEditor field={copyTextField} value={copyText} onChange={(v) => writeCopy('current', (v as string) ?? '', '')} />
                          </div>
                        ) : innerState.mode === 'vanilla' ? (
                          <div className="space-y-1">
                            <Label>{t('innerType.passiveId')}</Label>
                            <FieldEditor field={copyTextField} value={copyText} onChange={(v) => writeCopy('vanilla', (v as string) ?? '', '')} />
                          </div>
                        ) : (
                          <>
                            <div className="space-y-1">
                              <Label>{t('innerType.modId')}</Label>
                              <FieldEditor field={{ kind: 'text', name: 'Pid' }} value={modId} onChange={(v) => writeCopy('other', copyText, (v as string) ?? '')} />
                            </div>
                            <div className="space-y-1">
                              <Label>{t('innerType.passiveId')}</Label>
                              <FieldEditor field={copyTextField} value={copyText} onChange={(v) => writeCopy('other', (v as string) ?? '', modId)} />
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                ) : null}
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
        {module.id === 'cardability' ? <AbilityDescPreview module={module} entity={entity} /> : module.id === 'effecttext' ? <EffectTextPreviewPanel entity={entity} /> : module.id === 'passiveability' ? <PassiveAbilityPreviewPanel entity={entity} /> : null}
      </div>
      {proofOn ? null : entityIssues.length > 0 ? (
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