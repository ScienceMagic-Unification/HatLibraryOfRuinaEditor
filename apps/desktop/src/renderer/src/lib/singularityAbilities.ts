import manifest from '../assets/abilities-manifest.json'
import resources from '../assets/plugins/manifest.json'
import { getAttr, getNodeText, getRootChildren, type OrderedNode, parseXml } from '@ruina/editor-core'
import { shieldBashScripts } from './shieldBash'
import { normalizeKeywordLanguage } from './previewRules'

export const abilityAudit = manifest
export const builtinScriptIds = (kind: 'card' | 'dice'): string[] => manifest.abilities.filter((a) => a.kind === kind).map((a) => a.id)
const rawXml = import.meta.glob('../assets/plugins/*.xml', { query: '?raw', eager: true, import: 'default' }) as Record<string, string>
const descriptions = new Map<string, string>()
for (const resource of resources.resources.filter((r) => r.kind === 'xml' && /\.Abilities\.xml$/.test(r.name))) {
  for (const node of getRootChildren(parseXml(rawXml[`../assets/plugins/${resource.path}`] ?? ''), 'Abilities')) {
    const id = getAttr(node as OrderedNode, 'Id')
    if (id) descriptions.set(`${resource.language}:${id}`, getNodeText(node as OrderedNode))
  }
}
/** Keep the project's four-language XML text intact; unknown languages use English. */
export const builtinAbilityDescription = (id: string, language: string): string | undefined => descriptions.get(`${normalizeKeywordLanguage(language)}:${id}`) ?? descriptions.get(`en:${id}`)

export function abilityXmlExample(id: string): string {
  if (!builtinScriptIds('dice').includes(id)) throw new Error('Only verified built-in dice Scripts can generate XML')
  const ammo = id === 'Hat_Enchantments_BasicAmmo_Dice'
  const attack = ammo || id === 'Hat_Enchantments_Throughout_Dice'
  const shieldBash = shieldBashScripts.some((script) => script === id)
  return `<?xml version="1.0" encoding="utf-8"?>\n<DiceCardXmlRoot>\n  <Version>1.1</Version>\n  <Card ID="900001">\n    <Name>Example</Name>\n    <TextId>-1</TextId>\n    <Artwork/>\n    <Rarity>Common</Rarity>\n    <Spec Range="Near" Cost="1" Affection="One" EmotionLimit="0"/>\n    <Script/>\n    <BehaviourList>\n      <Behaviour Min="${ammo ? 2 : 4}" Dice="${ammo ? 4 : 8}" Type="${attack ? 'Atk' : shieldBash ? 'Def' : 'Standby'}" Detail="${attack ? 'Penetrate' : 'Guard'}" Motion="${attack ? 'Z' : 'G'}" EffectRes="" Script="${id}" ActionScript=""/>\n    </BehaviourList>\n    <Chapter>1</Chapter>\n    <Priority>1</Priority>\n    <Category>None</Category>\n  </Card>\n</DiceCardXmlRoot>`
}
