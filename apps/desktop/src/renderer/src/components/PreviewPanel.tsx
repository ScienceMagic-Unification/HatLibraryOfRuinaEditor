import { useEffect, useMemo, useState } from 'react'
import type { EntityRef, EntitySchema, ModuleDefinition } from '@ruina/editor-core'
import { getAllText, getAttr, getFieldValue, getListRows, getMulti, getNodeText, getTextField } from '@ruina/editor-core'
import { Badge } from '@ruina/ui'
import { diceTypeMeta } from '@ruina/schemas'
import { ImageOff } from 'lucide-react'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'
import { rangeIconKey, rangeIconUrls } from '../lib/rangeIcons'
import { diceIconUrl } from '../lib/diceIcons'
import { joinPath } from '../lib/path'
import { cardAccent } from '../lib/cardAccent'
import { RegexText } from './RegexText'
import { useRegexRules } from '../lib/useRegexRules'
import { builtinAbilityDescription } from '../lib/singularityAbilities'
import { vanillaAbilityDescription } from '../lib/vanillaAbilities'
import { findVanillaArtwork } from '../lib/vanillaArtwork'
import { cardPreviewLabels } from '../lib/cardPreviewLabels'
import { editorLangToDocLang } from '../lib/lang'
import { sameLanguageSources, localizedIndex } from '../lib/localizationSources'

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
  const { t, lang } = useI18n()
  const loadArtwork = useAppStore((s) => s.loadArtwork)
  const docs = useAppStore((s) => s.docs)
  const openWorkspaceAndSelect = useAppStore((s) => s.openWorkspaceAndSelect)
  const requestAssetPick = useAppStore((s) => s.requestAssetPick)
  const ensureModuleDocs = useAppStore((s) => s.ensureModuleDocs)
  const nameLang = useAppStore((s) => s.primaryLang['cardname'])
  const abilityLang = useAppStore((s) => s.primaryLang['cardability'])
  const namePath = useAppStore((s) => s.primaryDocPath.cardname)
  const abilityPath = useAppStore((s) => s.primaryDocPath['cardability'])
  const artwork = entity ? (getTextField(entity.node, module.preview?.field ?? '') ?? '') : ''
  const folder = module.preview ? joinPath(modPath, module.preview.assetGlob) : ''
  const [loaded, setLoaded] = useState<{ folder: string; name: string; url: string | null }>()
  const url = loaded?.folder === folder && loaded.name === artwork ? loaded.url : undefined

  useEffect(() => {
    if (module.preview?.nameWorkspaceId) void ensureModuleDocs(module.preview.nameWorkspaceId)
    if (module.preview?.abilityWorkspaceId) void ensureModuleDocs(module.preview.abilityWorkspaceId)
  }, [module, ensureModuleDocs])

  useEffect(() => {
    let alive = true
    if (!folder || !artwork) return
    loadArtwork(folder, artwork).then((localUrl) => {
      if (alive) setLoaded({ folder, name: artwork, url: localUrl ?? findVanillaArtwork(artwork)?.url ?? null })
    })
    return () => {
      alive = false
    }
  }, [folder, artwork, loadArtwork])

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

  const nameSources = useMemo(() => sameLanguageSources(Object.values(docs).filter((d) => d.bindings.cardname?.kind === 'primary'), nameLang, namePath), [docs, nameLang, namePath])
  const abilitySources = useMemo(() => sameLanguageSources(Object.values(docs).filter((d) => d.bindings.cardability?.kind === 'primary'), abilityLang, abilityPath), [docs, abilityLang, abilityPath])
  const names = useMemo(() => localizedIndex(nameSources, NAME_SCHEMA), [nameSources])
  const abilities = useMemo(() => localizedIndex(abilitySources, ABILITY_SCHEMA), [abilitySources])
  const previewLanguage = abilitySources[0]?.lang ?? nameSources[0]?.lang ?? editorLangToDocLang(lang)
  const cardDescriptions = useMemo(() => {
    if (nameLang === '__none__' || nameSources[0]?.lang === previewLanguage) return names
    const sources = Object.values(docs).filter((d) => d.bindings.cardname?.kind === 'primary' && d.lang === previewLanguage)
    return localizedIndex(sources, NAME_SCHEMA)
  }, [docs, names, nameLang, nameSources, previewLanguage])
  const rules = useRegexRules(previewLanguage)
  const hatEnabled = useAppStore((s) => s.hatEnabled)

  const nameRef = entity && names.get(entity.id)?.ref
  const localizedName = nameRef && getTextField(nameRef.node, 'LocalizedName')

  const abilityText = (id: string): string | undefined => {
    if (!id) return undefined
    const hit = abilities.get(id)?.ref
    return (hit && getAllText(hit.node, 'Desc')) || (hatEnabled && abilityLang !== '__none__' && builtinAbilityDescription(id, previewLanguage)) || vanillaAbilityDescription(id, previewLanguage)
  }

  if (!card) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">{t('preview.empty')}</div>
  }

  const { rangeLabel, prefixes } = cardPreviewLabels(card.range, card.options, previewLanguage, rules, (id) => {
    const record = abilities.get(id)?.ref
    return record && getAllText(record.node, 'Desc')
  })
  const displayName = localizedName ?? card.name
  const rarityColor = entity ? cardAccent(entity.node) : undefined
  const descriptionRef = entity && cardDescriptions.get(entity.id)?.ref
  const cardAbilityDesc = (descriptionRef && getAllText(descriptionRef.node, 'Ability')) || abilityText(card.script) || (entity && getTextField(entity.node, 'ScriptDesc')) || card.script
  const localizedDice = descriptionRef ? getListRows(descriptionRef.node, { kind: 'list', name: 'Behaviour', direct: true, item: 'Behaviour', attrs: [] }) : []
  const jumpArtwork = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!module.preview) return
    void requestAssetPick(module.id, module.preview.field, artwork, Boolean(url && url === findVanillaArtwork(artwork)?.url))
  }

  const jumpName = (e: React.MouseEvent) => {
    e.preventDefault()
    if (entity && module.preview?.nameWorkspaceId) void openWorkspaceAndSelect(module.preview.nameWorkspaceId, entity.id)
  }
  const jumpAbility = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    if (!id || !module.preview?.abilityWorkspaceId) return
    const nativeId = id.trim()
    if (abilities.has(id)) void openWorkspaceAndSelect(module.preview.abilityWorkspaceId, id)
    else if (hatEnabled && abilityLang !== '__none__' && builtinAbilityDescription(id, previewLanguage)) {
      useAppStore.getState().setPrimaryLang('singularity-abilities', previewLanguage)
      void openWorkspaceAndSelect('singularity-abilities', id)
    } else if (vanillaAbilityDescription(nativeId, previewLanguage)) {
      useAppStore.getState().setPrimaryLang('vanilla-abilities', previewLanguage)
      void openWorkspaceAndSelect('vanilla-abilities', nativeId)
    }
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
            <img src={rangeIconUrls[rangeIconKey[card.range]]} alt={rangeLabel} className="size-5 object-contain" draggable={false} />
          ) : null}
          {rangeLabel}
        </Badge>
      </div>

      <div
        onClick={card.script ? jumpAbility(card.script) : undefined}
        className={`rounded-lg border border-border bg-secondary/20 p-3 ${card.script ? 'cursor-pointer' : ''}`}
      >
        {(() => {
          if (prefixes.length === 0 && !cardAbilityDesc) {
            return <div className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground/60">{t('noAbility')}</div>
          }
          return (
            <div className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
              {prefixes.map((line, i) => (
                <div key={`prefix-${i}`}>
                  <RegexText text={line} rules={rules} />
                </div>
              ))}
              {cardAbilityDesc ? <RegexText text={cardAbilityDesc} rules={rules} /> : null}
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
            const localDie = localizedDice.find((node) => getAttr(node, 'ID') === String(i))
            const desc = (localDie && getNodeText(localDie)) || abilityText(script) || get('Desc')
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
                  <span className="mt-0.5 min-w-0 flex-1 whitespace-pre-wrap text-[11px] leading-5 text-foreground">
                    <RegexText text={desc} rules={rules} scope="dice" diceAbilityIds={[script]} diceContext={{ type, detail, source: 'native' }} />
                  </span>
                ) : (
                  <span className="mt-0.5 min-w-0 flex-1 text-[11px] leading-snug text-muted-foreground/60">{script}</span>
                )}

              </div>
            )
          })
        )}
      </div>


    </div>
  )
}
