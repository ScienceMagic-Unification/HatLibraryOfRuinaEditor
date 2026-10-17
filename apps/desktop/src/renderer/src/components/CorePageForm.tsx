import { useState } from 'react'
import { Button, Input } from '@ruina/ui'
import { Plus, Trash2 } from 'lucide-react'
import { getAttr, getFieldValue, getNodeText, setMulti, type EntityRef, type FieldDef, type ModuleDefinition, type ValidationIssue } from '@ruina/editor-core'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'
import { cardAccent } from '../lib/cardAccent'
import { corePageGroups, corePageProblems, editReference, referenceNodes } from '../lib/corePages'
import { FieldEditor } from './FieldEditor'
import { resolveBookReference } from '../lib/vanillaAbilities'
import { editorLangToDocLang } from '../lib/lang'
import { resistanceRates } from '../lib/corePages'
import { PassiveName } from './PassiveAbilityPreviewPanel'

function References({ module, entity, name }: { module: ModuleDefinition; entity: EntityRef; name: string }): JSX.Element {
  const { t, tl, lang } = useI18n()
  const docs = useAppStore((s) => s.docs)
  const editData = useAppStore((s) => s.editData)
  const rows = referenceNodes(entity.node, name)
  const write = (index: number, patch: Record<string, string> | 'add' | 'delete'): void => editData(module.id, (_doc, refs) => {
    const book = refs.find((r) => r.id === entity.id)
    if (book) editReference(book.node, name, index, patch)
  })
  return <section className="space-y-3 rounded-lg border border-border bg-secondary/20 p-3" data-reference={name}>
    <div className="flex items-center justify-between"><h3 className="text-sm font-medium">{name === 'Passive' ? tl('被动') : name === 'OnlyCard' ? tl('专属卡牌') : name === 'CustomOnlyCard' ? t('core.customCards') : t('core.soulCards')}{name === 'OnlyCard' ? <span className="ml-2 text-xs text-muted-foreground">{t('core.originOnly')}</span> : null}</h3><Button size="sm" variant="secondary" onClick={() => write(-1, 'add')}><Plus/>{t('addItem')}</Button></div>
    {name === 'CustomOnlyCard' ? <p className="text-xs text-amber-400">{t('core.extraBridge')}</p> : null}
    {rows.map((row, index) => <div key={index} className="rounded-md border border-border bg-background/50 p-3"><div className="flex flex-wrap items-end gap-2">
      <label className="min-w-24 flex-1 space-y-1 text-xs text-muted-foreground">ID<Input aria-label={`${name} ID ${index + 1}`} value={getNodeText(row)} onChange={(e) => write(index, { id: e.target.value.replace(/\D/g, '') })}/></label>
      {name === 'Passive' ? <label className="min-w-36 flex-1 space-y-1 text-xs text-muted-foreground">{t('core.package')}<Input list="core-package-options" aria-label={`Passive Pid ${index + 1}`} placeholder={t('core.currentMod')} value={getAttr(row, 'Pid') ?? ''} onChange={(e) => write(index, { Pid: e.target.value })}/></label> : null}
      {name === 'Card' ? ['Level', 'Emotion'].map((attr) => <label key={attr} className="w-24 space-y-1 text-xs text-muted-foreground">{attr}<Input aria-label={`${attr} ${index + 1}`} value={getAttr(row, attr) ?? ''} onChange={(e) => write(index, { [attr]: e.target.value.replace(/\D/g, '') })}/></label>) : null}
      <Button variant="ghost" size="sm" aria-label={`${t('delete')} ${name} ${index + 1}`} onClick={() => write(index, 'delete')}><Trash2/></Button>
    </div><div className="mt-2 text-xs text-primary"><PassiveName name={resolveBookReference(docs, name === 'Passive' ? 'passive' : 'card', getNodeText(row), name === 'OnlyCard' || name === 'Card' ? '@origin' : getAttr(row, 'Pid') ?? '', editorLangToDocLang(lang))?.name ?? ''}/></div></div>)}
    {name === 'Passive' ? <datalist id="core-package-options"><option value="@origin">{tl('原版')}</option></datalist> : null}
    {!rows.length ? <p className="text-xs text-muted-foreground">{t('emptyRows')}</p> : null}
  </section>
}

export function CorePageForm({ module, entity, brief = false, issues, onFieldChange, onIdChange }: {
  module: ModuleDefinition; entity: EntityRef; brief?: boolean; issues: ValidationIssue[];
  onFieldChange: (field: FieldDef, value: unknown) => void; onIdChange: (id: string) => void
}): JSX.Element {
  const { t, tl } = useI18n()
  const [showIds, setShowIds] = useState(false)
  const editData = useAppStore((s) => s.editData)
  const accent = cardAccent(entity.node)
  const problems = corePageProblems(entity.node)
  const renderField = (name: string): JSX.Element | null => {
    const field = module.entity.fields.find((f) => f.name === name)
    if (!field) return null
    return <div key={name} data-field={name} className={`space-y-2 ${['Name', 'Option', 'Category', 'CharacterSkin', 'Rarity', 'Chapter'].includes(name) ? 'col-span-2' : 'min-w-0'}`}>
      {field.kind !== 'bool' ? <div className="text-xs font-medium text-muted-foreground">{showIds ? (field.kind === 'child' ? `${field.element}/${field.field.name}` : field.name) : tl(field.label ?? field.name)}{field.kind === 'text' && field.required ? <span className="ml-1 text-red-400">*</span> : null}</div> : null}
      <FieldEditor field={field} value={getFieldValue(entity.node, field)} onChange={(v) => name === 'CharacterSkin' ? editData(module.id, (_doc, refs) => { const book = refs.find((r) => r.id === entity.id); if (book) setMulti(book.node, 'CharacterSkin', v ? [String(v)] : []) }) : onFieldChange(field, v)} accentColor={accent} showIds={showIds}/>
    </div>
  }
  return <div className="h-full overflow-y-auto overscroll-contain p-4" data-testid="core-page-form">
    <div className="space-y-4">
      <div className="flex items-end gap-3 rounded-lg border border-border bg-card p-3"><label className="min-w-0 flex-1 space-y-2 text-xs text-muted-foreground">{t('id.label')}<Input aria-label="Book ID" value={entity.id} onChange={(e) => onIdChange(e.target.value.replace(/\D/g, ''))}/></label><Button variant="secondary" size="sm" onClick={() => setShowIds(!showIds)}># ID</Button></div>
      {corePageGroups.filter((g) => !brief || ['identity', 'stats', 'resistance'].includes(g.key)).map((group) => {
        if (group.key === 'resistance') return <section key={group.key} className="space-y-3 rounded-lg border border-border bg-card p-3" data-testid="resistance-editor"><h3 className="text-sm font-medium">{t('core.resistance')}</h3><div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 text-xs"><span/><span className="text-muted-foreground">{t('core.damage')}</span><span className="text-muted-foreground">{t('core.stagger')}</span>{[['S','斩击'],['P','突刺'],['H','打击']].map(([prefix,label]) => <ResistanceRow key={prefix} prefix={prefix} label={tl(label)} module={module} entity={entity} onFieldChange={onFieldChange} showIds={showIds}/>)}</div></section>
        const fields = <div className="grid grid-cols-2 gap-3">{group.fields.map(renderField)}</div>
        return group.key === 'advanced' ? <details key={group.key} className="rounded-lg border border-border bg-card p-3"><summary className="mb-3 cursor-pointer text-sm font-medium">{t('core.advanced')}</summary>{fields}</details> : <section key={group.key} className="space-y-3 rounded-lg border border-border bg-card p-3"><h3 className="text-sm font-medium">{t(`core.${group.key}`)}</h3>{fields}</section>
      })}
      <References module={module} entity={entity} name="Passive"/>
      {!brief ? <><References module={module} entity={entity} name="OnlyCard"/><References module={module} entity={entity} name="CustomOnlyCard"/><References module={module} entity={entity} name="Card"/></> : null}
      {problems.map((p) => <p key={p} role="alert" className="text-xs text-amber-400">{t(`core.${p}`)}</p>)}
      {issues.filter((i) => i.entityId === entity.id).map((i, index) => <p key={index} role="alert" className="text-xs text-amber-400">{i.field}: {i.message}</p>)}
    </div>
  </div>
}

function ResistanceRow({ prefix, label, module, entity, onFieldChange, showIds }: { prefix: string; label: string; module: ModuleDefinition; entity: EntityRef; onFieldChange: (field: FieldDef, value: unknown) => void; showIds: boolean }): JSX.Element {
  const { tl } = useI18n()
  return <><span className="pr-2 text-muted-foreground">{label}</span>{['Resist','BResist'].map((suffix) => {
    const field = module.entity.fields.find((f) => f.name === prefix + suffix)!
    const inner = field.kind === 'child' ? field.field : field
    if (inner.kind !== 'enum') return null
    const value = String(getFieldValue(entity.node, field) || 'Normal')
    return <select key={suffix} data-field={field.name} aria-label={tl(field.label ?? field.name)} value={value} onChange={(e) => onFieldChange(field, e.target.value)} className="min-w-0 rounded-md border border-border bg-background px-2 py-2.5" style={{ color: inner.colors?.[value] }}>{!inner.values.includes(value) ? <option value={value}>{value}</option> : null}{inner.values.map((v) => <option key={v} value={v}>{showIds ? v : tl(inner.labels?.[v] ?? v)} · ×{resistanceRates[v]}</option>)}</select>
  })}</>
}
