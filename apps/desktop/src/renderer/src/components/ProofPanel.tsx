import type { EntitySchema } from '@ruina/editor-core'
import { getTextField, listEntities } from '@ruina/editor-core'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'

const NAME_SCHEMA: EntitySchema = {
  root: 'BattleCardDescRoot',
  containerPath: ['cardDescList'],
  entity: 'BattleCardDesc',
  idAttr: 'ID',
  fields: []
}
const ABILITY_SCHEMA: EntitySchema = {
  root: 'BattleCardAbilityDescRoot',
  entity: 'BattleCardAbility',
  idAttr: 'ID',
  fields: []
}

export function ProofPanel({ moduleId }: { moduleId: 'cardname' | 'cardability' }): JSX.Element | null {
  const { t } = useI18n()
  const on = useAppStore((s) => Boolean(s.proofMode[moduleId]))
  const docs = useAppStore((s) => s.docs)
  const modules = useAppStore((s) => s.modules)
  const selectedId = useAppStore((s) => s.selectedId[moduleId])
  if (!on) return null

  const isName = moduleId === 'cardname'
  const ownDocs = Object.values(docs).filter((d) => d.bindings[moduleId]?.kind === 'primary')
  const cardInfoModule = modules.find((m) => m.id === 'cardinfo')
  const cardInfoDoc = Object.values(docs).find((d) => d.bindings['cardinfo']?.kind === 'primary' && d.path.includes('CardInfo.xml'))
  const schema = isName ? NAME_SCHEMA : ABILITY_SCHEMA
  const field = isName ? 'LocalizedName' : 'Desc'

  const rawName = (() => {
    if (!isName || !cardInfoDoc || !cardInfoModule || !selectedId) return ''
    const refs = listEntities(cardInfoDoc.doc, cardInfoModule.entity)
    const hit = refs.find((r) => r.id === selectedId)
    return hit ? getTextField(hit.node, 'Name') ?? '' : ''
  })()

  const rows = ownDocs.map((d) => {
    const refs = listEntities(d.doc, schema)
    const hit = refs.find((r) => r.id === selectedId)
    return { lang: d.langLabel ?? d.lang ?? d.path, value: hit ? getTextField(hit.node, field) ?? '' : '' }
  })

  return (
    <div className="max-h-56 overflow-y-auto border-t border-border bg-secondary/10 p-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">{t('proofMode')}</div>
      {isName ? (
        <div className="mb-2">
          <div className="mb-0.5 text-[10px] text-muted-foreground/70">{t('rawName')}</div>
          <div className="rounded border border-border/60 bg-background/50 px-2 py-1">{rawName || t('empty')}</div>
        </div>
      ) : null}
      <div>
        <div className="mb-0.5 text-[10px] text-muted-foreground/70">{t('existingNames')}</div>
        {rows.length === 0 ? (
          <div className="text-[11px] text-muted-foreground/60">{t('empty')}</div>
        ) : (
          <div className="space-y-1">
            {rows.map((n, i) => (
              <div key={i} className="rounded border border-border/60 bg-background/50 px-2 py-1">
                <span className="text-muted-foreground/70">{n.lang}: </span>
                <span className="whitespace-pre-wrap">{n.value || t('empty')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

