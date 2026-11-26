import snapshot from '../assets/vanilla-abilities.json'
import gameScripts from '../assets/vanilla-scripts.json'
import gameCards from '../assets/vanilla-card-text.json'
import { findRootName, getTextField, listEntities, type ModuleDefinition } from '@ruina/editor-core'
import { cardInfoModule, cardNameModule, passiveModule, passiveAbilityModule } from '@ruina/schemas'
import type { DocState } from '../store'

export interface AbilityRecord {
  id: string; kind: string; text: Record<string, { name: string; desc: string }>; fields: Record<string, string>
  xml?: string
}

export interface BookReferenceTarget { moduleId: string; id: string; path?: string; language?: string }
export function bookReferenceTarget(docs: Record<string, DocState>, modules: ModuleDefinition[], kind: 'passive' | 'card', id: string, pid: string, language: string): BookReferenceTarget | undefined {
  if (pid === '@origin') {
    const moduleId = kind === 'passive' ? 'vanilla-passives' : 'vanilla-cards'
    return index.has(`${kind}:${id}`) && modules.some((m) => m.id === moduleId) ? { moduleId, id, language } : undefined
  }
  if (pid) return undefined
  const candidates = Object.values(docs).sort((a, b) => Number(b.lang === language) - Number(a.lang === language))
  for (const baseId of kind === 'passive' ? ['passive', 'passiveability'] : ['cardinfo', 'cardname']) {
    for (const module of modules.filter((m) => m.id === baseId || m.id.startsWith(baseId + '@'))) {
      const doc = candidates.find((d) => d.bindings[module.id]?.kind === 'primary' && listEntities(d.doc, module.entity).some((e) => e.id === id))
      if (doc) return { moduleId: module.id, id, path: doc.path, language: doc.lang ?? doc.path }
    }
  }
  return undefined
}
type CardText = { name: string; ability?: string; dice?: Record<string, string> }
const cardText: Record<string, Record<string, CardText>> = gameCards
export function vanillaCardText(id: string, language: string): CardText | undefined {
  const texts = cardText[id]
  return texts?.[language] ?? texts?.en
}
export const vanillaScriptIds = gameScripts.ids
const index = new Map<string, AbilityRecord>()
for (const source of snapshot.entries as AbilityRecord[]) {
  const id = source.id.trim()
  index.set(source.kind + ':' + id, { ...source, id, text: { ...source.text } })
}
for (const [id, languages] of Object.entries(gameScripts.descriptions)) {
  const key = 'ability:' + id
  const record: AbilityRecord = index.get(key) ?? { kind: 'ability', id, text: {}, fields: {} }
  for (const [language, desc] of Object.entries(languages)) record.text[language] = { name: record.text[language]?.name ?? '', desc }
  index.set(key, record)
}
export const vanillaAbilities = Array.from(index.values())
export function vanillaAbilityDescription(id: string, language: string): string | undefined {
  const text = index.get('ability:' + id.trim())?.text
  return text?.[language]?.desc || text?.en?.desc || text?.cn?.desc
}
export function localizedAbility(entry: AbilityRecord, language: string): { name: string; desc: string } {
  if (entry.kind === 'card') {
    const text = vanillaCardText(entry.id, language)
    if (text) return { name: text.name, desc: text.ability ?? '' }
  }
  if (entry.kind === 'ability') return { name: entry.text[language]?.name ?? '', desc: vanillaAbilityDescription(entry.id, language) ?? '' }
  return entry.text[language] ?? entry.text.cn ?? entry.text.en ?? { name: '', desc: '' }
}
export function resolveBookReference(docs: Record<string, DocState>, kind: 'passive' | 'card', id: string, pid: string, language: string): { name: string; desc: string; fields: Record<string, string> } | undefined {
  if (pid === '@origin') {
    const entry = index.get(`${kind}:${id}`)
    return entry ? { ...localizedAbility(entry, language), fields: entry.fields } : undefined
  }
  // Documents in this store belong to the current Mod; never resolve another package by a colliding ID.
  if (pid) return undefined
  const dataSchema = kind === 'passive' ? passiveModule.entity : cardInfoModule.entity
  const textSchema = kind === 'passive' ? passiveAbilityModule.entity : cardNameModule.entity
  const candidates = Object.values(docs).sort((a, b) => Number(b.lang === language) - Number(a.lang === language))
  const find = (schema: typeof dataSchema) => candidates.filter((d) => (d.root ?? findRootName(d.doc)) === schema.root).flatMap((d) => listEntities(d.doc, schema)).find((e) => e.id === id)
  const data = find(dataSchema), text = find(textSchema)
  if (!data && !text) return undefined
  const fields = Object.fromEntries(['Cost', 'Rarity', 'Script'].map((key) => [key, data ? getTextField(data.node, key) ?? '' : '']))
  return { name: (text ? getTextField(text.node, kind === 'passive' ? 'Name' : 'LocalizedName') : '') || (data ? getTextField(data.node, 'Name') : '') || id, desc: (text ? getTextField(text.node, 'Desc') : '') || (data ? getTextField(data.node, 'Desc') : '') || '', fields }
}
