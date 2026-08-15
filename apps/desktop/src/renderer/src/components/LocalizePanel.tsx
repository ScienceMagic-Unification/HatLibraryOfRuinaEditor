import { useMemo } from 'react'
import type { EntitySchema, LocalizationRootDef, ModuleDefinition, OrderedDoc } from '@ruina/editor-core'
import { getTextField, listEntities, setTextField } from '@ruina/editor-core'
import { Badge, Button, Textarea } from '@ruina/ui'
import { Languages, RefreshCw } from 'lucide-react'
import { useAppStore, type DocState } from '../store'
import { useI18n } from '../i18n'

function locSchema(def: LocalizationRootDef): EntitySchema {
  return { root: def.root, entity: def.entity, idAttr: def.idAttr ?? 'ID', containerPath: def.containerPath, fields: [] }
}

export function LocalizePanel({
  module,
  localizeDocs,
  selectedId,
  dataName
}: {
  module: ModuleDefinition
  localizeDocs: DocState[]
  selectedId: string | null
  dataName: string
}): JSX.Element {
  const { t, tl } = useI18n()
  const editDoc = useAppStore((s) => s.editDoc)

  const entries = useMemo(() => {
    const out: { def: LocalizationRootDef; doc: DocState; id: string; node: any; index: number }[] = []
    for (const d of localizeDocs) {
      const binding = d.bindings[module.id]
      if (!binding?.locDef) continue
      const refs = listEntities(d.doc, locSchema(binding.locDef))
      const hit = refs.find((r) => r.id === selectedId)
      if (hit) out.push({ def: binding.locDef, doc: d, id: hit.id, node: hit.node, index: hit.index })
    }
    return out
  }, [localizeDocs, module.id, selectedId])

  if (localizeDocs.length === 0) {
    return <div className="p-6 text-center text-xs text-muted-foreground">{t('noLocalizeFile')}</div>
  }

  const syncNames = () => {
    for (const e of entries) {
      const nameField = e.def.fields.find((f) => f.name === 'LocalizedName' || f.name === 'Name') ?? e.def.fields[0]
      if (!nameField) continue
      editDoc(e.doc.path, (doc) => {
        const refs = listEntities(doc, locSchema(e.def))
        const hit = refs.find((r) => r.id === e.id)
        if (hit) setTextField(hit.node, nameField.name, dataName)
      })
    }
  }

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Languages className="size-3.5" /> {t('localizeZone', { id: selectedId ?? '-' })}
        </div>
        <Button size="sm" variant="secondary" onClick={syncNames} disabled={entries.length === 0}>
          <RefreshCw /> {t('syncFromData')}
        </Button>
      </div>
      {entries.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          本地化文件中未找到 ID={selectedId} 的条目
        </div>
      ) : (
        entries.map((e, i) => (
          <div key={i} className="rounded-md border border-border bg-secondary/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <Badge variant={e.doc.lang === 'cn' ? 'default' : 'outline'}>
                {e.doc.langLabel ?? e.doc.lang ?? '本地化'}
              </Badge>
              <span className="max-w-[60%] truncate font-mono text-[10px] text-muted-foreground" title={e.doc.path}>
                {e.doc.path.split('\\').slice(-2).join('\\')}
              </span>
            </div>
            <div className="space-y-2">
              {e.def.fields.map((f) => {
                const v = getTextField(e.node, f.name) ?? ''
                return (
                  <div key={f.name} className="space-y-1">
                    <div className="text-[10px] text-muted-foreground/70">{tl(f.label ?? f.name)}</div>
                    {f.kind === 'multiline' ? (
                      <Textarea
                        value={v}
                        rows={3}
                        onChange={(ev) =>
                          editDoc(e.doc.path, (doc) => {
                            const refs = listEntities(doc, locSchema(e.def))
                            const hit = refs.find((r) => r.id === e.id)
                            if (hit) setTextField(hit.node, f.name, ev.target.value)
                          })
                        }
                      />
                    ) : (
                      <input
                        value={v}
                        onChange={(ev) =>
                          editDoc(e.doc.path, (doc) => {
                            const refs = listEntities(doc, locSchema(e.def))
                            const hit = refs.find((r) => r.id === e.id)
                            if (hit) setTextField(hit.node, f.name, ev.target.value)
                          })
                        }
                        className="h-8 w-full rounded-md border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}