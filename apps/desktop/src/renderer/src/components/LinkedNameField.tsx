import { useMemo } from 'react'
import type { EntityRef, EntitySchema, ModuleDefinition } from '@ruina/editor-core'
import { getTextField, listEntities, setTextField } from '@ruina/editor-core'
import { Input } from '@ruina/ui'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'

function locSchema(def: { root: string; entity: string; idAttr?: string; containerPath?: string[] }): EntitySchema {
  return { root: def.root, entity: def.entity, idAttr: def.idAttr ?? 'ID', containerPath: def.containerPath, fields: [] }
}

/**
 * 名称 + 本地化名称 并排编辑：
 * 左侧修改数据区 Name，右侧自动读取并实时修改简体中文本地化名称（写回本地化文件）。
 */
export function LinkedNameField({
  module,
  entity,
  value,
  onValueChange
}: {
  module: ModuleDefinition
  entity: EntityRef
  value: string
  onValueChange: (v: string) => void
}): JSX.Element {
  const { t } = useI18n()
  const docs = useAppStore((s) => s.docs)
  const nameLang = useAppStore((s) => s.primaryLang['cardname'])
  const editDoc = useAppStore((s) => s.editDoc)

  const locDef = useMemo(
    () => module.localizeRoots?.find((r) => r.fields.some((f) => f.name === 'LocalizedName' || f.name === 'Name')),
    [module]
  )
  const locFieldName = locDef?.fields.find((f) => f.name === 'LocalizedName' || f.name === 'Name')?.name

  const nameDoc = useMemo(() => {
    if (!locDef) return undefined
    if (nameLang === '__none__') return undefined
    const candidates = Object.values(docs).filter(
      (d) => d.bindings[module.id]?.kind === 'localize' && d.bindings[module.id]?.locDef?.root === locDef.root
    )
    return candidates.find((d) => d.lang === nameLang) ?? candidates.find((d) => d.lang === 'cn') ?? candidates[0]
  }, [docs, module.id, locDef, nameLang])

  const locValue = useMemo(() => {
    if (!nameDoc || !locDef || !locFieldName) return ''
    const refs = listEntities(nameDoc.doc, locSchema(locDef))
    const hit = refs.find((r) => r.id === entity.id)
    return hit ? (getTextField(hit.node, locFieldName) ?? '') : ''
  }, [nameDoc, locDef, locFieldName, entity.id])

  const setLocValue = (v: string) => {
    if (!nameDoc || !locDef || !locFieldName) return
    editDoc(nameDoc.path, (doc) => {
      const refs = listEntities(doc, locSchema(locDef))
      const hit = refs.find((r) => r.id === entity.id)
      if (hit) setTextField(hit.node, locFieldName, v)
    })
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <div className="text-xs font-medium leading-none text-muted-foreground">{t('name')}</div>
        <Input value={value} onChange={(e) => onValueChange(e.target.value)} />
      </div>
      <div className="space-y-1">
        <div className="text-xs font-medium leading-none text-muted-foreground">{t('localizedName')}</div>
        <Input
          value={locValue}
          onChange={(e) => setLocValue(e.target.value)}
          disabled={!nameDoc}
          placeholder={nameDoc ? t('localizedName') : t('noLocalizeFile')}
        />
      </div>
    </div>
  )
}