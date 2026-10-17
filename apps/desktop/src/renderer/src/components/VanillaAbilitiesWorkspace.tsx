import { useMemo } from 'react'
import { Button } from '@ruina/ui'
import { Copy } from 'lucide-react'
import { makeElement, type EntitySchema, type OrderedDoc } from '@ruina/editor-core'
import { useI18n } from '../i18n'
import { editorLangToDocLang } from '../lib/lang'
import { localizedAbility, vanillaAbilities } from '../lib/vanillaAbilities'
import { useRegexRules } from '../lib/useRegexRules'
import { useAppStore } from '../store'
import { DataPanel } from './DataPanel'
import { RegexText } from './RegexText'
import { PassivePreviewContent } from './PassiveAbilityPreviewPanel'
import { rarityMeta } from '@ruina/schemas'
import { VanillaCardDetails } from './VanillaCardDetails'

const schema: EntitySchema = { root: 'Abilities', entity: 'Ability', idAttr: 'ID', displayField: 'Name', fields: [{ kind: 'text', name: 'Name' }, { kind: 'multiline', name: 'Desc' }] }
const scriptSchema: EntitySchema = { ...schema, idOnlyList: true }
export function VanillaAbilitiesWorkspace({ kind }: { kind: 'passive' | 'ability' | 'card' }): JSX.Element {
  const { t, tl, lang } = useI18n()
  const moduleId = kind === 'passive' ? 'vanilla-passives' : kind === 'card' ? 'vanilla-cards' : 'vanilla-abilities'
  const language = useAppStore((s) => s.primaryLang[moduleId]) ?? editorLangToDocLang(lang)
  const selected = useAppStore((s) => s.selectedId[moduleId])
  const setLanguage = (value: string) => useAppStore.getState().setPrimaryLang(moduleId, value)
  const setSelected = (id: string) => useAppStore.getState().select(moduleId, id)
  const rules = useRegexRules(language)
  const entries = useMemo(() => vanillaAbilities.filter((e) => e.kind === kind), [kind])
  const entry = entries.find((e) => e.id === selected) ?? entries.find((e) => localizedAbility(e, language).desc) ?? entries[0]
  const text = entry && localizedAbility(entry, language)
  const doc = useMemo<OrderedDoc>(() => [{ Abilities: entries.map((e) => { const l = localizedAbility(e, language); return { Ability: [makeElement('Name', undefined, l.name || e.id), makeElement('Desc', undefined, l.desc)], ':@': { '@_ID': e.id } } }) }], [entries, language])
  const copy = async () => { try { await navigator.clipboard.writeText(entry.id); useAppStore.getState().setStatus(t('abilities.copied'), 'success') } catch { useAppStore.getState().setStatus(t('abilities.copyFailed'), 'error') } }
  return <div className="flex min-h-0 flex-1 flex-col" data-testid="vanilla-abilities">
    <div className="flex items-center gap-3 border-b border-border bg-card p-3"><span className="text-sm">{t(`module.${moduleId}`)}</span><select aria-label={t('abilities.previewLang')} className="rounded border border-border bg-background p-2 text-xs" value={language} onChange={(e) => setLanguage(e.target.value)}><option value="cn">简体中文</option><option value="en">English</option><option value="jp">日本語</option></select><span className="ml-auto text-xs text-muted-foreground">{entries.length}</span><Button variant="secondary" onClick={() => void copy()}><Copy/>{t('vanilla.copyId')}</Button></div>
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(260px,360px)_minmax(0,1fr)]"><DataPanel doc={doc} schema={kind === 'ability' ? scriptSchema : schema} selectedId={entry?.id ?? null} onSelect={setSelected} scrollKey={`vanilla-${kind}`} localizedRender={(id) => { const e = entries.find((a) => a.id === id)!; const l = localizedAbility(e, language); return <><div>{l.name || id}</div><RegexText text={l.desc} rules={rules} scope={kind === 'passive' ? 'passive' : 'ability'}/></> }}/>
      {entry && text ? <div className="space-y-4 overflow-y-auto p-4"><section className="space-y-3 rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground">#{entry.id}</div>{kind === 'card' ? <VanillaCardDetails entry={entry} language={language} rules={rules}/> : kind === 'passive' ? <PassivePreviewContent name={text.name || entry.id} desc={text.desc} cost={entry.fields.Cost} accent={rarityMeta[entry.fields.Rarity ?? '']?.color} rules={rules}/> : <><h2 className="font-semibold">{entry.id}</h2><div className="whitespace-pre-wrap text-sm leading-relaxed"><RegexText text={text.desc} rules={rules}/></div></>}</section>{kind === 'passive' ? <dl className="grid grid-cols-2 gap-3">{Object.entries(entry.fields).map(([key, value]) => <div key={key} className="rounded border border-border p-3 text-xs"><dt className="text-muted-foreground">{tl(({ Cost: '费用', Rarity: '稀有度', Script: '脚本', Level: '等级' } as Record<string,string>)[key] ?? key)}</dt><dd className="mt-2 break-all">{value}</dd></div>)}</dl> : null}{kind !== 'card' ? <textarea aria-label={tl('描述')} readOnly value={text.desc} className="min-h-28 w-full rounded border border-border bg-background p-3 text-xs"/> : null}</div> : null}
    </div>
  </div>
}
