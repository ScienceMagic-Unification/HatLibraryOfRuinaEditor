import { useMemo, useState } from 'react'
import type { EntitySchema } from '@ruina/editor-core'
import { getListRows, getTextField, listEntities, removeEntity } from '@ruina/editor-core'
import { Trash2 } from 'lucide-react'
import { Button } from '@ruina/ui'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'
import { ConfirmDialog } from './ConfirmDialog'

const ABILITY_SCHEMA: EntitySchema = {
  root: 'BattleCardAbilityDescRoot',
  entity: 'BattleCardAbility',
  idAttr: 'ID',
  fields: [{ kind: 'multiline', name: 'Desc', multiLineElements: true }]
}

export function CardAbilityTools(): JSX.Element {
  const { t } = useI18n()
  const docs = useAppStore((s) => s.docs)
  const modules = useAppStore((s) => s.modules)
  const editDoc = useAppStore((s) => s.editDoc)
  const setStatus = useAppStore((s) => s.setStatus)
  const primaryLang = useAppStore((s) => s.primaryLang['cardability'])
  const proofOn = useAppStore((s) => Boolean(s.proofMode['cardability']))
  const proofPreviewOn = useAppStore((s) => Boolean(s.proofPreview['cardability']))
  const setProofMode = useAppStore((s) => s.setProofMode)
  const setProofPreview = useAppStore((s) => s.setProofPreview)
  const [confirming, setConfirming] = useState(false)

  const abilityDocs = useMemo(() => Object.values(docs).filter((d) => d.bindings['cardability']?.kind === 'primary'), [docs])
  const activeAbilityDoc = abilityDocs.find((d) => d.lang === primaryLang) ?? abilityDocs[0]
  const cardInfoModule = modules.find((m) => m.id === 'cardinfo')
  const cardInfoDoc = useMemo(
    () => Object.values(docs).find((d) => d.bindings['cardinfo']?.kind === 'primary' && d.path.includes('CardInfo.xml')),
    [docs]
  )



  const deleteUnused = () => {
    if (!activeAbilityDoc || !cardInfoDoc || !cardInfoModule) return
    const used = new Set<string>()
    const cardRefs = listEntities(cardInfoDoc.doc, cardInfoModule.entity)
    for (const ref of cardRefs) {
      const script = getTextField(ref.node, 'Script')
      if (script) used.add(script)
      const listField = cardInfoModule.entity.fields.find((f) => f.name === 'BehaviourList')
      if (listField) {
        for (const row of getListRows(ref.node, listField as any)) {
          const s = (row as any)[':@']?.['@_Script'] as string | undefined
          if (s) used.add(s)
        }
      }
    }
    editDoc(activeAbilityDoc.path, (doc) => {
      const refs = listEntities(doc, ABILITY_SCHEMA)
      let removed = 0
      for (let i = refs.length - 1; i >= 0; i--) {
        if (!used.has(refs[i].id)) {
          removeEntity(doc, ABILITY_SCHEMA, refs[i].index)
          removed++
        }
      }
      setStatus(removed > 0 ? `已删除 ${removed} 个未使用能力` : '未发现未使用能力', removed > 0 ? 'success' : 'info')
    })
  }

  return (
    <div className="space-y-3 p-3">
      <div className="rounded-md border border-border/70 bg-secondary/20 p-3">
        <div className="mb-1 text-xs font-medium text-muted-foreground">{t('deleteUnused')}</div>
        <p className="mb-2 text-[11px] leading-snug text-muted-foreground/70">
          删除当前本地化文档中未被任何战斗书页（卡牌脚本或骰子脚本）引用的能力。
        </p>
        <button className="flex w-full items-center justify-center gap-1 rounded-md bg-destructive px-2 py-1.5 text-xs text-destructive-foreground hover:bg-destructive/90" onClick={() => setConfirming(true)}>
          <Trash2 className="size-3.5" /> {t('deleteUnused')}
        </button>
      </div>
      <Button
        size="sm"
        variant={proofOn ? 'default' : 'outline'}
        className={proofOn ? 'w-full border-emerald-500/60 bg-emerald-500/20 font-medium text-emerald-300' : 'w-full'}
        onClick={() => setProofMode('cardability', !proofOn)}
      >
        {t('proofMode')}：{proofOn ? 'ON' : 'OFF'}
      </Button>
      <Button
        size="sm"
        variant={proofPreviewOn ? 'default' : 'outline'}
        className={proofPreviewOn ? 'w-full border-primary/60 bg-primary/15 font-medium text-primary' : 'w-full'}
        onClick={() => setProofPreview('cardability', !proofPreviewOn)}
      >
        {t('proof.preview')}：{proofPreviewOn ? 'ON' : 'OFF'}
      </Button>
      <ConfirmDialog
        open={confirming}
        message={t('confirm.message')}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          deleteUnused()
          setConfirming(false)
        }}
      />
    </div>
  )
}