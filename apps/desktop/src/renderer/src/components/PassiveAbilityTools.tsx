import { useEffect, useMemo, useState } from 'react'
import type { EntitySchema } from '@ruina/editor-core'
import { createEntity, getTextField, insertEntity, listEntities, removeEntity, setTextField } from '@ruina/editor-core'
import { Button } from '@ruina/ui'
import { RefreshCw, Trash2 } from 'lucide-react'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'
import { ConfirmDialog } from './ConfirmDialog'

const PASSIVE_LOC_SCHEMA: EntitySchema = {
  root: 'PassiveDescRoot',
  entity: 'PassiveDesc',
  idAttr: 'ID',
  fields: []
}

/** 被动能力工作区右侧工具：参考 CardAbilityTools，提供同步、清理与校对预览。 */
export function PassiveAbilityTools(): JSX.Element {
  const { t } = useI18n()
  const docs = useAppStore((s) => s.docs)
  const modules = useAppStore((s) => s.modules)
  const editDoc = useAppStore((s) => s.editDoc)
  const saveModule = useAppStore((s) => s.saveModule)
  const setStatus = useAppStore((s) => s.setStatus)
  const primaryLang = useAppStore((s) => s.primaryLang['passiveability'])
  const proofOn = useAppStore((s) => Boolean(s.proofMode['passiveability']))
  const setProofMode = useAppStore((s) => s.setProofMode)
  const proofPreviewOn = useAppStore((s) => Boolean(s.proofPreview['passiveability']))
  const setProofPreview = useAppStore((s) => s.setProofPreview)
  const selectedId = useAppStore((s) => s.selectedId['passiveability'])
  const ensureModuleDocs = useAppStore((s) => s.ensureModuleDocs)
  const [confirming, setConfirming] = useState<'sync' | 'clean' | null>(null)

  useEffect(() => {
    void ensureModuleDocs('passive')
  }, [ensureModuleDocs])

  const abilityDocs = useMemo(
    () => Object.values(docs).filter((d) => d.bindings['passiveability']?.kind === 'primary'),
    [docs]
  )
  const activeAbilityDoc = abilityDocs.find((d) => d.lang === primaryLang) ?? abilityDocs[0]
  const passiveModule = modules.find((m) => m.id === 'passive')
  const passiveDoc = useMemo(() => {
    return (
      Object.values(docs).find((d) => d.root === 'PassiveXmlRoot' && d.bindings['passive']?.kind === 'primary') ??
      (passiveModule ? Object.values(docs).find((d) => d.bindings['passive']?.kind === 'primary') : undefined)
    )
  }, [docs, passiveModule])

  const syncFromPassive = () => {
    if (!passiveDoc || !activeAbilityDoc || !passiveModule) return
    const passiveRefs = listEntities(passiveDoc.doc, passiveModule.entity)
    let created = 0
    editDoc(activeAbilityDoc.path, (doc) => {
      const locRefs = listEntities(doc, PASSIVE_LOC_SCHEMA)
      for (const src of passiveRefs) {
        const name = getTextField(src.node, 'Name') ?? ''
        const desc = getTextField(src.node, 'Desc') ?? ''
        const hit = locRefs.find((r) => r.id === src.id)
        if (hit) {
          setTextField(hit.node, 'Name', name)
          setTextField(hit.node, 'Desc', desc)
        } else {
          const node = createEntity(PASSIVE_LOC_SCHEMA, src.id)
          setTextField(node, 'Name', name)
          setTextField(node, 'Desc', desc)
          insertEntity(doc, PASSIVE_LOC_SCHEMA, node)
          created++
        }
      }
    })
    void saveModule('passiveability').then((ok) => {
      if (ok) setStatus(`已同步 ${passiveRefs.length} 个被动名称与描述，新增 ${created} 条本地化记录`, 'success')
    })
  }

  const deleteOrphans = () => {
    if (!passiveDoc || !activeAbilityDoc || !passiveModule) return
    const ids = new Set(listEntities(passiveDoc.doc, passiveModule.entity).map((r) => r.id))
    let removed = 0
    editDoc(activeAbilityDoc.path, (doc) => {
      const locRefs = listEntities(doc, PASSIVE_LOC_SCHEMA)
      for (let i = locRefs.length - 1; i >= 0; i--) {
        if (!ids.has(locRefs[i].id)) {
          removeEntity(doc, PASSIVE_LOC_SCHEMA, locRefs[i].index)
          removed++
        }
      }
    })
    void saveModule('passiveability').then((ok) => {
      if (ok) setStatus(`已删除 ${removed} 条找不到对应被动的本地化记录`, 'success')
    })
  }

  return (
    <div className="space-y-3 p-3">
      <div className="rounded-md border border-border/70 bg-secondary/20 p-3">
        <div className="mb-1 text-xs font-medium text-muted-foreground">{t('passive.syncTitle')}</div>
        <p className="mb-2 text-[11px] leading-snug text-muted-foreground/70">{t('passive.syncDesc')}</p>
        <Button size="sm" className="w-full" onClick={() => setConfirming('sync')} disabled={!passiveDoc || !activeAbilityDoc}>
          <RefreshCw /> {t('passive.syncButton')}
        </Button>
      </div>

      <div className="rounded-md border border-border/70 bg-secondary/20 p-3">
        <div className="mb-1 text-xs font-medium text-muted-foreground">{t('passive.cleanTitle')}</div>
        <p className="mb-2 text-[11px] leading-snug text-muted-foreground/70">{t('passive.cleanDesc')}</p>
        <Button size="sm" variant="destructive" className="w-full" onClick={() => setConfirming('clean')} disabled={!passiveDoc || !activeAbilityDoc}>
          <Trash2 /> {t('passive.cleanButton')}
        </Button>
      </div>

      <Button
        size="sm"
        variant={proofOn ? 'default' : 'outline'}
        className={proofOn ? 'w-full border-emerald-500/60 bg-emerald-500/20 font-medium text-emerald-300' : 'w-full'}
        onClick={() => setProofMode('passiveability', !proofOn)}
      >
        {t('proofMode')}：{proofOn ? 'ON' : 'OFF'}
      </Button>
      <Button
        size="sm"
        variant={proofPreviewOn ? 'default' : 'outline'}
        className={proofPreviewOn ? 'w-full border-primary/60 bg-primary/15 font-medium text-primary' : 'w-full'}
        onClick={() => setProofPreview('passiveability', !proofPreviewOn)}
      >
        {t('proof.preview')}：{proofPreviewOn ? 'ON' : 'OFF'}
      </Button>

      <ConfirmDialog
        open={confirming !== null}
        message={t('confirm.message')}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming === 'sync') syncFromPassive()
          if (confirming === 'clean') deleteOrphans()
          setConfirming(null)
        }}
      />
    </div>
  )
}