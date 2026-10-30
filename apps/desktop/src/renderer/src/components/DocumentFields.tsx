import { getFieldValue, nodeKey, setFieldValue, type ModuleDefinition, type OrderedNode } from '@ruina/editor-core'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'
import { FieldEditor } from './FieldEditor'

export function DocumentFields({ module, path }: { module: ModuleDefinition; path: string }): JSX.Element | null {
  const doc = useAppStore((s) => s.docs[path])
  const editDoc = useAppStore((s) => s.editDoc)
  const { tl } = useI18n()
  const root = doc?.doc.find((node) => nodeKey(node as OrderedNode) === module.entity.root) as OrderedNode | undefined
  if (!root || !module.documentFields?.length) return null
  return <div className="space-y-2 border-b border-border p-4">{module.documentFields.map((field) => <div key={field.name} className="space-y-1" data-document-field={field.name}>
    <div className="text-xs text-muted-foreground">{tl(field.label ?? field.name)}</div>
    <FieldEditor field={field} value={getFieldValue(root, field)} onChange={(value) => editDoc(path, (draft) => {
      const current = draft.find((node) => nodeKey(node as OrderedNode) === module.entity.root) as OrderedNode | undefined
      if (current) setFieldValue(current, field, value)
    })}/>
  </div>)}</div>
}
