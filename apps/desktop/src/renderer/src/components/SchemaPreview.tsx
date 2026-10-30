import { getAttr, getFieldValue, getNodeText, type EntityRef, type FieldDef, type ModuleDefinition, type OrderedNode } from '@ruina/editor-core'
import { Badge } from '@ruina/ui'
import { useI18n } from '../i18n'
import { useRegexRules } from '../lib/useRegexRules'
import { RegexText } from './RegexText'

/** Shared read-only counterpart to FieldEditor, including repeated/nested rows. */
function PreviewField({ node, field }: { node: OrderedNode; field: FieldDef }): JSX.Element | null {
  const { tl } = useI18n()
  const rules = useRegexRules()
  const value = getFieldValue(node, field)
  if (value == null || value === '' || value === false || (Array.isArray(value) && !value.length)) return null
  const label = tl(field.label ?? field.name)
  if (field.kind === 'list') return <section className="space-y-2">
    <div className="text-xs text-muted-foreground">{label} <Badge variant="outline">{(value as OrderedNode[]).length}</Badge></div>
    {(value as OrderedNode[]).map((row, index) => <div key={index} className="space-y-2 rounded-md border border-border bg-background/50 p-3">
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span>#{index + 1}</span>{field.attrs.map((attr) => getAttr(row, attr.name) ? <span key={attr.name}>{tl(attr.label ?? attr.name)}: {getAttr(row, attr.name)}</span> : null)}</div>
      {field.textField ? <div className="whitespace-pre-wrap break-words text-sm"><RegexText text={getNodeText(row)} rules={rules}/></div> : null}
      {field.fields?.map((child) => <PreviewField key={child.name} node={row} field={child}/>)}
    </div>)}
  </section>
  if (field.kind === 'attrs') {
    const entries = field.attrs.filter((attr) => (value as Record<string, string>)[attr.name])
    if (!entries.length) return null
    return <section className="space-y-1"><div className="text-xs text-muted-foreground">{label}</div><div className="flex flex-wrap gap-3 text-sm">{entries.map((attr) => <span key={attr.name}>{tl(attr.label ?? attr.name)}: {(value as Record<string, string>)[attr.name]}</span>)}</div></section>
  }
  const content = Array.isArray(value) ? value.join(' · ') : value === true ? label : String(value)
  return <section className="space-y-1"><div className="text-xs text-muted-foreground">{label}</div><div className="whitespace-pre-wrap break-words text-sm leading-relaxed"><RegexText text={content} rules={rules}/></div></section>
}

export function SchemaPreview({ module, entity }: { module: ModuleDefinition; entity: EntityRef | null }): JSX.Element {
  const { t } = useI18n()
  return <div className="h-full space-y-4 overflow-y-auto overscroll-contain p-4" data-testid="schema-preview">
    <div className="flex items-center justify-between"><h3 className="text-sm font-medium">{t('workspace.preview')}</h3>{entity ? <Badge variant="outline">{entity.id}</Badge> : null}</div>
    {entity ? module.entity.fields.map((field) => <PreviewField key={field.name} node={entity.node} field={field}/>) : null}
  </div>
}
