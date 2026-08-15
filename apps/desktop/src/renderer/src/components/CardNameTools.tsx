import { useMemo } from 'react'
import type { EntitySchema } from '@ruina/editor-core'
import { createEntity, getTextField, insertEntity, listEntities, removeEntity, setTextField } from '@ruina/editor-core'
import { Button } from '@ruina/ui'
import { RefreshCw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'
import { ConfirmDialog } from './ConfirmDialog'

const LOC_SCHEMA: EntitySchema = {
  root: 'BattleCardDescRoot',
  containerPath: ['cardDescList'],
  entity: 'BattleCardDesc',
  idAttr: 'ID',
  fields: [{ kind: 'text', name: 'LocalizedName' }]
}

export function CardNameTools(): JSX.Element {
  const { t } = useI18n()
  const proofOn = useAppStore((s) => Boolean(s.proofMode['cardname']))
  const setProofMode = useAppStore((s) => s.setProofMode)
  const [confirming, setConfirming] = useState<'sync' | 'clean' | null>(null)
  const docs = useAppStore((s) => s.docs)
  const modules = useAppStore((s) => s.modules)
  const editDoc = useAppStore((s) => s.editDoc)
  const setStatus = useAppStore((s) => s.setStatus)
  const primaryLang = useAppStore((s) => s.primaryLang['cardname'])

  const cardInfoDoc = useMemo(
    () => Object.values(docs).find((d) => d.bindings['cardinfo']?.kind === 'primary' && d.path.includes('CardInfo.xml')),
    [docs]
  )
  const nameDocs = useMemo(
    () => Object.values(docs).filter((d) => d.bindings['cardname']?.kind === 'primary'),
    [docs]
  )
  const activeNameDoc = nameDocs.find((d) => d.lang === primaryLang) ?? nameDocs[0]
  const cardInfoModule = modules.find((m) => m.id === 'cardinfo')


  const syncNames = () => {
    if (!cardInfoDoc || !activeNameDoc || !cardInfoModule) return
    const sourceRefs = listEntities(cardInfoDoc.doc, cardInfoModule.entity)
    editDoc(activeNameDoc.path, (doc) => {
      const locRefs = listEntities(doc, LOC_SCHEMA)
      let created = 0
      for (const src of sourceRefs) {
        const name = getTextField(src.node, 'Name') ?? ''
        const hit = locRefs.find((r) => r.id === src.id)
        if (hit) {
          setTextField(hit.node, 'LocalizedName', name)
        } else {
          const node = createEntity(LOC_SCHEMA, src.id)
          setTextField(node, 'LocalizedName', name)
          insertEntity(doc, LOC_SCHEMA, node)
          created++
        }
      }
      setStatus(`已同步 ${sourceRefs.length} 个名称，新增 ${created} 条本地化记录`, 'success')
    })
  }

  const deleteOrphans = () => {
    if (!cardInfoDoc || !activeNameDoc || !cardInfoModule) return
    const ids = new Set(listEntities(cardInfoDoc.doc, cardInfoModule.entity).map((r) => r.id))
    editDoc(activeNameDoc.path, (doc) => {
      const locRefs = listEntities(doc, LOC_SCHEMA)
      let removed = 0
      for (let i = locRefs.length - 1; i >= 0; i--) {
        if (!ids.has(locRefs[i].id)) {
          removeEntity(doc, LOC_SCHEMA, locRefs[i].index)
          removed++
        }
      }
      setStatus(`已删除 ${removed} 条找不到对应卡牌的本地化记录`, 'success')
    })
  }

  return (
    <div className="space-y-3 p-3">
      <div className="rounded-md border border-border/70 bg-secondary/20 p-3">
        <div className="mb-1 text-xs font-medium text-muted-foreground">{t('syncTitle')}</div>
        <p className="mb-2 text-[11px] leading-snug text-muted-foreground/70">
          {t('syncDesc')}
        </p>
        <Button size="sm" className="w-full" onClick={() => setConfirming('sync')} disabled={!cardInfoDoc || !activeNameDoc}>
          <RefreshCw /> {t('syncButton')}
        </Button>
      </div>
      <div className="rounded-md border border-border/70 bg-secondary/20 p-3">
        <div className="mb-1 text-xs font-medium text-muted-foreground">{t('cleanTitle')}</div>
        <p className="mb-2 text-[11px] leading-snug text-muted-foreground/70">
          {t('cleanDesc')}
        </p>
        <Button size="sm" variant="destructive" className="w-full" onClick={() => setConfirming('clean')} disabled={!cardInfoDoc || !activeNameDoc}>
          <Trash2 /> {t('cleanButton')}
        </Button>
      </div>
      <Button
        size="sm"
        variant={proofOn ? 'default' : 'outline'}
        className={proofOn ? 'w-full border-emerald-500/60 bg-emerald-500/20 font-medium text-emerald-300' : 'w-full'}
        onClick={() => setProofMode('cardname', !proofOn)}
      >
        {t('proofMode')}：{proofOn ? 'ON' : 'OFF'}
      </Button>
      <ConfirmDialog
        open={confirming !== null}
        message={t('confirm.message')}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming === 'sync') syncNames()
          if (confirming === 'clean') deleteOrphans()
          setConfirming(null)
        }}
      />
    </div>
  )
}