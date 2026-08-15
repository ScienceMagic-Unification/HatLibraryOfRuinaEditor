import { useEffect, useMemo, useState } from 'react'
import type { EntityRef, EntitySchema, ModuleDefinition } from '@ruina/editor-core'
import { getAllText, getFieldValue, getListRows, getMulti, getTextField, listEntities } from '@ruina/editor-core'
import { Badge } from '@ruina/ui'
import { diceTypeMeta, rangeMeta } from '@ruina/schemas'
import { ImageOff } from 'lucide-react'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'
import { rangeIconKey, rangeIconUrls } from '../lib/rangeIcons'
import { diceIconUrl } from '../lib/diceIcons'
import { cardAccent } from '../lib/cardAccent'
import { AbilityText } from './AbilityText'

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

function findField(module: ModuleDefinition, name: string): any {
  return module.entity.fields.find((f) => f.name === name)
}

export function PreviewPanel({
  modPath,
  module,
  entity
}: {
  modPath: string
  module: ModuleDefinition
  entity: EntityRef | null
}): JSX.Element {
  const { t, tl } = useI18n()
  const loadArtwork = useAppStore((s) => s.loadArtwork)
  const docs = useAppStore((s) => s.docs)
  const openWorkspaceAndSelect = useAppStore((s) => s.openWorkspaceAndSelect)
  const requestAssetPick = useAppStore((s) => s.requestAssetPick)
  const ensureModuleDocs = useAppStore((s) => s.ensureModuleDocs)
  const nameLang = useAppStore((s) => s.primaryLang['cardname'])
  const abilityLang = useAppStore((s) => s.primaryLang['cardability'])
  const [url, setUrl] = useState<string | null>(null)
  const artwork = entity ? (getTextField(entity.node, module.preview?.field ?? '') ?? '') : ''

  useEffect(() => {
    if (module.preview?.nameWorkspaceId) void ensureModuleDocs(module.preview.nameWorkspaceId)
    if (module.preview?.abilityWorkspaceId) void ensureModuleDocs(module.preview.abilityWorkspaceId)
  }, [module, ensureModuleDocs])

  useEffect(() => {
    let alive = true
    if (!module.preview || !entity || !artwork) {
      setUrl(null)
      return
    }
    loadArtwork(`${modPath}\\${module.preview.assetGlob}`.replace(/\\/g, '\\'), artwork).then((u) => {
      if (alive) setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [module, entity, artwork, modPath, loadArtwork])

  const card = useMemo(() => {
    if (!entity) return null
    return {
      range: (getFieldValue(entity.node, findField(module, 'Range')) ?? '') as string,
      cost: (getFieldValue(entity.node, findField(module, 'Cost')) ?? '') as string,
      name: getTextField(entity.node, 'Name') ?? '（未命名）',
      rarity: getTextField(entity.node, 'Rarity') ?? '',
      script: getTextField(entity.node, 'Script') ?? '',
      options: getMulti(entity.node, 'Option'),
      behaviours: getListRows(
        entity.node,
        findField(module, 'BehaviourList') ?? ({ kind: 'list', name: 'BehaviourList', item: 'Behaviour', attrs: [] } as any)
      )
    }
  }, [entity, module])

  const pickDoc = (root: string, lang?: string) => {
    if (lang === '__none__') return undefined
    const docsOfRoot = Object.values(docs).filter((d) => d.root === root)
    return docsOfRoot.find((d) => d.lang === lang) ?? docsOfRoot.find((d) => d.lang === 'cn') ?? docsOfRoot[0]
  }
  const nameDoc = useMemo(() => pickDoc('BattleCardDescRoot', nameLang), [docs, nameLang])
  const abilityDoc = useMemo(() => pickDoc('BattleCardAbilityDescRoot', abilityLang), [docs, abilityLang])

  const localizedName = useMemo(() => {
    if (!entity || !nameDoc) return undefined
    const hit = nameDoc ? listEntities(nameDoc.doc, NAME_SCHEMA).find((r) => r.id === entity.id) : undefined
    return hit ? getTextField(hit.node, 'LocalizedName') ?? undefined : undefined
  }, [entity, nameDoc])

  const abilityText = (id: string): string | undefined => {
    if (!id || !abilityDoc) return undefined
    const hit = listEntities(abilityDoc.doc, ABILITY_SCHEMA).find((r) => r.id === id)
    return hit ? getAllText(hit.node, 'Desc') || undefined : undefined
  }

  if (!card) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">{t('preview.empty')}</div>
  }

  const displayName = localizedName ?? card.name
  const rarityColor = entity ? cardAccent(entity.node) : undefined
  const cardAbilityDesc = abilityText(card.script)
  const jumpArtwork = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!module.preview) return
    void requestAssetPick(module.id, module.preview.field, artwork)
  }

  const jumpName = (e: React.MouseEvent) => {
    e.preventDefault()
    if (entity && module.preview?.nameWorkspaceId) void openWorkspaceAndSelect(module.preview.nameWorkspaceId, entity.id)
  }
  const jumpAbility = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    if (id && module.preview?.abilityWorkspaceId) void openWorkspaceAndSelect(module.preview.abilityWorkspaceId, id)
  }

  return (
    <div className="space-y-3 p-3">
      <div
        onClick={jumpArtwork}
        title={artwork ? '跳转图片工作区' : '选择一张图片'}
        className="cursor-pointer overflow-hidden rounded-xl border border-border bg-secondary/20 p-2 transition-colors hover:border-primary/50"
      >
        {url ? (
          <img src={url} alt={displayName} className="mx-auto h-auto max-h-[420px] w-full object-contain" draggable={false} />
        ) : (
          <div className="flex h-44 flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="size-8 opacity-50" />
            <span className="px-4 text-center text-[11px]">{t('noImage')}</span>
            <span className="px-4 text-center text-[10px] text-primary/70">{artwork ? t('image.changeArtwork') : t('image.pickArtwork')}</span>
          </div>
        )}
      </div>

      <div
        onClick={jumpName}
        className={`flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/20 px-3 py-2 ${
          module.preview?.nameWorkspaceId ? 'cursor-pointer' : ''
        }`}
      >
        <span className="flex size-8 items-center justify-center rounded-full border border-border bg-black/60 text-sm font-bold text-white">
          {card.cost}
        </span>
        <span className="text-base font-semibold" style={rarityColor ? { color: rarityColor } : undefined}>
          {displayName}
        </span>
        <Badge variant="outline" className="inline-flex items-center gap-1">
          {rangeIconUrls[rangeIconKey[card.range]] ? (
            <img src={rangeIconUrls[rangeIconKey[card.range]]} alt={tl(rangeMeta[card.range] ?? card.range)} className="size-5 object-contain" draggable={false} />
          ) : null}
          {tl(rangeMeta[card.range] ?? card.range ?? '-')}
        </Badge>
      </div>

      <div
        onClick={card.script ? jumpAbility(card.script) : undefined}
        className={`rounded-lg border border-border bg-secondary/20 p-3 ${card.script ? 'cursor-pointer' : ''}`}
      >
        {(() => {
          const prefix: string[] = []
          if (card.options.includes('ExhaustOnUse')) prefix.push(`[${tl('佚亡')}]`)
          if (card.range === 'FarArea') prefix.push(`[${tl('群体攻击-清算')}]`)
          else if (card.range === 'FarAreaEach') prefix.push(`[${tl('群体攻击-交锋')}]`)
          if (prefix.length === 0 && !cardAbilityDesc) {
            return <div className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground/60">{t('noAbility')}</div>
          }
          return (
            <div className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
              {prefix.map((line, i) => (
                <div key={`prefix-${i}`}>
                  <AbilityText text={line} />
                </div>
              ))}
              {cardAbilityDesc ? <AbilityText text={cardAbilityDesc} /> : null}
            </div>
          )
        })()}
      </div>

      <div className="space-y-1.5 rounded-lg border border-border bg-secondary/20 p-3">
        {card.behaviours.length === 0 ? (
          <div className="text-[11px] text-muted-foreground/70">{t('noDice')}</div>
        ) : (
          card.behaviours.map((b: any, i: number) => {
            const get = (n: string) => (b[':@']?.['@_' + n] ?? '') as string
            const type = get('Type')
            const detail = get('Detail')
            const script = get('Script')
            const typeColor = diceTypeMeta[type]?.color ?? '#ffffff'
            const icon = diceIconUrl(detail, type) ?? diceIconUrl(detail, 'Atk') ?? diceIconUrl(detail, 'Standby')
            const unreasonable =
              (type === 'Def' && ['Hit', 'Penetrate', 'Slash'].includes(detail)) ||
              (type === 'Atk' && ['Guard', 'Evasion'].includes(detail))
            const desc = abilityText(script)
            return (
              <div
                key={i}
                onClick={script ? jumpAbility(script) : undefined}
                className={`flex items-start gap-2 rounded-md border border-border/60 bg-background/50 px-2.5 py-1.5 ${
                  script ? 'cursor-pointer' : ''
                }`}
              >
                {icon ? <img src={icon} alt={`${detail} ${type}`} className="mt-0.5 size-6 shrink-0 object-contain" draggable={false} /> : null}
                <span className="mt-0.5 shrink-0 font-mono text-sm font-bold" style={{ color: typeColor }}>
                  {get('Min')} ~ {get('Dice')}
                </span>
                {desc ? (
                  <span className="min-w-0 flex-1 whitespace-pre-wrap text-[11px] leading-snug text-muted-foreground">
                    <AbilityText text={desc} />
                  </span>
                ) : (
                  <span className="min-w-0 flex-1 text-[11px] leading-snug text-muted-foreground/60">{script}</span>
                )}

              </div>
            )
          })
        )}
      </div>


    </div>
  )
}