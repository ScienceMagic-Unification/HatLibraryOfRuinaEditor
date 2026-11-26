import { useMemo } from 'react'
import { findChildNode, getAttr, getMulti, getTextField, nodeChildren, parseXml, type OrderedNode } from '@ruina/editor-core'
import { diceTypeMeta, rarityMeta } from '@ruina/schemas'
import { cardPreviewLabels } from '../lib/cardPreviewLabels'
import { diceIconUrl } from '../lib/diceIcons'
import { localizedAbility, vanillaAbilityDescription, vanillaCardText, type AbilityRecord } from '../lib/vanillaAbilities'
import { findVanillaArtwork } from '../lib/vanillaArtwork'
import type { BattleEffectTextEntry } from '../lib/previewRules'
import { RegexText } from './RegexText'

export function VanillaCardDetails({ entry, language, rules }: { entry: AbilityRecord; language: string; rules: Map<string, BattleEffectTextEntry> }): JSX.Element {
  const card = useMemo(() => entry.xml ? parseXml(entry.xml).find((n): n is OrderedNode => Boolean(n && typeof n === 'object' && 'Card' in n)) : undefined, [entry.xml])
  const text = localizedAbility(entry, language)
  const spec = card && findChildNode(card, 'Spec')
  const diceList = card && findChildNode(card, 'BehaviourList')
  const dice = diceList ? nodeChildren(diceList).filter((n): n is OrderedNode => Boolean(n && typeof n === 'object' && 'Behaviour' in n)) : []
  const localized = vanillaCardText(entry.id, language)
  const art = card && findVanillaArtwork(getTextField(card, 'Artwork') ?? '')
  const script = card ? getTextField(card, 'Script') ?? '' : ''
  const ability = localized?.ability || vanillaAbilityDescription(script, language) || (card && getTextField(card, 'ScriptDesc')) || script
  const range = spec ? getAttr(spec, 'Range') ?? '' : ''
  const { rangeLabel, prefixes } = cardPreviewLabels(range, card ? getMulti(card, 'Option') : [], language, rules)
  return <div className="space-y-3" data-testid="vanilla-card-details" data-card-id={entry.id}>
    {art && <img src={art.url} alt={text.name} className="mx-auto max-h-80 max-w-full rounded-lg object-contain" draggable={false}/>}
    <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/20 p-3"><span className="flex size-8 items-center justify-center rounded-full border border-border font-semibold">{spec ? getAttr(spec, 'Cost') : '—'}</span><h2 className="font-semibold" style={{color: rarityMeta[card ? getTextField(card, 'Rarity') ?? '' : '']?.color}}>{text.name || (card && getTextField(card, 'Name')) || entry.id}</h2><span className="ml-auto text-xs text-muted-foreground">{rangeLabel}</span></div>
    {prefixes.length || ability ? <div className="whitespace-pre-wrap rounded-lg border border-border p-3 text-xs leading-relaxed">
      <RegexText text={[...prefixes, ability].filter(Boolean).join('\n')} rules={rules}/>
    </div> : null}
    {dice.map((die, i) => {
      const detail = getAttr(die, 'Detail') ?? ''
      const type = getAttr(die, 'Type') ?? ''
      const icon = diceIconUrl(detail, type)
      const id = getAttr(die, 'Script') ?? ''
      const desc = localized?.dice?.[i] || vanillaAbilityDescription(id, language) || getAttr(die, 'Desc') || id
      return <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-secondary/20 p-3 text-xs">
        {icon && <img src={icon} alt={detail} className="size-6 object-contain"/>}
        <span className="shrink-0 font-mono" style={{ color: diceTypeMeta[type]?.color }}>{getAttr(die, 'Min')}–{getAttr(die, 'Dice')}</span>
        <div className="whitespace-pre-wrap leading-relaxed"><RegexText text={desc} rules={rules} scope="dice" diceAbilityIds={[id]} diceContext={{ type, detail, source: 'native' }}/></div>
      </div>
    })}
  </div>
}
