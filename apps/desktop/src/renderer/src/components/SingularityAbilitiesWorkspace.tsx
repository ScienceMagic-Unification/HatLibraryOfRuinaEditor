import { useMemo, useState } from 'react'
import { Button, Input } from '@ruina/ui'
import { Copy } from 'lucide-react'
import { makeElement, type EntitySchema, type OrderedDoc } from '@ruina/editor-core'
import { useI18n } from '../i18n'
import { useAppStore } from '../store'
import { abilityAudit, builtinAbilityDescription } from '../lib/singularityAbilities'
import { useRegexRules } from '../lib/useRegexRules'
import { RegexText } from './RegexText'
import { DataPanel } from './DataPanel'
import { normalizeKeywordLanguage } from '../lib/previewRules'

const schema: EntitySchema = { root: 'Abilities', entity: 'Ability', idAttr: 'ID', idOnlyList: true, fields: [{ kind: 'multiline', name: 'Desc' }] }

/** Read-only counterpart of the card-ability workspace. */
export function SingularityAbilitiesWorkspace(): JSX.Element {
  const { t } = useI18n()
  const [kind, setKind] = useState('all')
  const selectedLanguage = useAppStore((s) => s.primaryLang['singularity-abilities'])
  const setPrimaryLang = useAppStore((s) => s.setPrimaryLang)
  const normalizedLanguage = normalizeKeywordLanguage(selectedLanguage ?? 'cn')
  const language = ['cn', 'en', 'jp', 'kr'].includes(normalizedLanguage) ? normalizedLanguage : 'en'
  const setLanguage = (value: string): void => setPrimaryLang('singularity-abilities', value)
  const [selected, setSelected] = useState('Hat_Enchantments_Exhaust_Dice')
  const rules = useRegexRules(language)
  const setStatus = useAppStore((s) => s.setStatus)
  const abilities = useMemo(() => abilityAudit.abilities.filter((a) => kind === 'all' || a.kind === kind), [kind])
  const entry = abilities.find((a) => a.id === selected) ?? abilities[0]
  const doc = useMemo<OrderedDoc>(() => [{ Abilities: abilities.map((a) => ({ Ability: [makeElement('Desc', undefined, builtinAbilityDescription(a.id, language) ?? '')], ':@': { '@_ID': a.id } })) }], [abilities, language])
  const desc = entry ? builtinAbilityDescription(entry.id, language) ?? '' : ''
  const copy = async (): Promise<void> => {
    if (!entry) return
    try { await navigator.clipboard.writeText(entry.id); setStatus(t('abilities.copied'), 'success') }
    catch { setStatus(t('abilities.copyFailed'), 'error') }
  }
  return <div className="flex min-h-0 flex-1 flex-col" data-testid="singularity-abilities">
    <div className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-3 py-2">
      <span className="text-sm font-medium">{t('module.singularity-abilities')}</span>
      <select aria-label={t('abilities.kind')} value={kind} onChange={(e) => setKind(e.target.value)} className="rounded border border-border bg-background px-3 py-2 text-xs">
        <option value="all">{t('abilities.all')}</option><option value="card">{t('abilities.card')}</option><option value="dice">{t('abilities.dice')}</option>
      </select>
      <select aria-label={t('abilities.previewLang')} value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded border border-border bg-background px-3 py-2 text-xs"><option value="cn">简体中文</option><option value="en">English</option><option value="jp">日本語</option><option value="kr">한국어</option></select>
      <span className="ml-auto text-xs text-muted-foreground">{abilities.length} · {t('core.readonly')}</span>
      <Button variant="secondary" onClick={() => void copy()} disabled={!entry}><Copy/>{t('abilities.copyScript')}</Button>
    </div>
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
      <DataPanel doc={doc} schema={schema} selectedId={entry?.id ?? null} onSelect={setSelected} scrollKey="singularity-abilities" localizedRender={(id) => <><div className="text-[10px] text-muted-foreground">{id}</div><RegexText text={builtinAbilityDescription(id, language) ?? ''} rules={rules} scope={abilities.find((a) => a.id === id)?.kind === 'dice' ? 'dice' : 'ability'}/></>} />
      <div className="min-w-0 overflow-y-auto p-4">
        {entry ? <div className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-3"><label className="mb-2 block text-xs text-muted-foreground">ID</label><Input readOnly value={entry.id}/><div className="mt-2 text-xs text-muted-foreground">{t(`abilities.${entry.kind}`)} · {entry.plugin} {entry.version}</div></div>
          <div><label className="mb-2 block text-xs text-muted-foreground">{t('core.originalDescription')}</label><textarea readOnly value={desc} className="min-h-28 w-full resize-y rounded-md border border-input bg-background p-3 font-mono text-xs"/></div>
          <div><div className="mb-2 text-xs text-muted-foreground">{t('abilityPreview')}</div><div data-testid="ability-description" className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/20 p-3 text-xs leading-relaxed"><RegexText text={desc} rules={rules} scope={entry.kind === 'dice' ? 'dice' : 'ability'}/></div></div>
        </div> : <div className="p-6 text-center text-sm text-muted-foreground">{t('core.noBuiltinCard')}</div>}
      </div>
    </div>
  </div>
}
