import { useMemo } from 'react'
import { findChildNode, getAttr, getMulti, getTextField, nodeChildren, parseXml, type OrderedNode } from '@ruina/editor-core'
import { diceTypeMeta, rarityMeta, rangeMeta } from '@ruina/schemas'
import { useI18n } from '../i18n'
import { diceIconUrl } from '../lib/diceIcons'
import { localizedAbility, vanillaAbilities, type AbilityRecord } from '../lib/vanillaAbilities'
import type { BattleEffectTextEntry } from '../lib/previewRules'
import { RegexText } from './RegexText'

const abilities = new Map(vanillaAbilities.filter((e) => e.kind === 'ability').map((e) => [e.id, e]))
export function VanillaCardDetails({ entry, language, rules }: { entry: AbilityRecord; language: string; rules: Map<string, BattleEffectTextEntry> }): JSX.Element {
  const { tl } = useI18n()
  const card = useMemo(() => entry.xml ? parseXml(entry.xml).find((n): n is OrderedNode => Boolean(n && typeof n === 'object' && 'Card' in n)) : undefined, [entry.xml])
  const text = localizedAbility(entry, language)
  const spec = card && findChildNode(card, 'Spec')
  const diceList = card && findChildNode(card, 'BehaviourList')
  const dice = diceList ? nodeChildren(diceList).filter((n): n is OrderedNode => Boolean(n && typeof n === 'object' && 'Behaviour' in n)) : []
  const abilityText = (id: string) => { const found = abilities.get(id); return found ? localizedAbility(found, language).desc : id }
  const script = card ? getTextField(card, 'Script') ?? '' : ''
  const range = spec ? getAttr(spec, 'Range') ?? '' : ''
  const prefixes = card ? getMulti(card, 'Option').filter((v) => v === 'ExhaustOnUse').map(() => `[${tl('佚亡')}]`) : []
  if (range === 'FarArea' || range === 'FarAreaEach') prefixes.push(`[${tl(rangeMeta[range])}]`)
  return <div className="space-y-3" data-testid="vanilla-card-details" data-card-id={entry.id}>
    <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/20 p-3"><span className="flex size-8 items-center justify-center rounded-full border border-border font-semibold">{spec ? getAttr(spec, 'Cost') : '—'}</span><h2 className="font-semibold" style={{color: rarityMeta[card ? getTextField(card, 'Rarity') ?? '' : '']?.color}}>{text.name || (card && getTextField(card, 'Name')) || entry.id}</h2><span className="ml-auto text-xs text-muted-foreground">{tl(rangeMeta[range] ?? range)}</span></div>
    {prefixes.length || script ? <div className="whitespace-pre-wrap rounded-lg border border-border p-3 text-xs leading-relaxed"><RegexText text={[...prefixes, abilityText(script)].filter(Boolean).join('\n')} rules={rules}/></div> : null}
    {dice.map((die, i) => { const detail = getAttr(die, 'Detail') ?? '', type = getAttr(die, 'Type') ?? '', icon = diceIconUrl(detail, type); return <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-secondary/20 p-3 text-xs">{icon ? <img src={icon} alt={detail} className="size-6 object-contain"/> : null}<span className="shrink-0 font-mono" style={{color:diceTypeMeta[type]?.color}}>{getAttr(die, 'Min')}–{getAttr(die, 'Dice')}</span><div className="whitespace-pre-wrap leading-relaxed"><RegexText text={abilityText(getAttr(die, 'Script') ?? '')} rules={rules} scope="dice"/></div></div> })}
  </div>
}
