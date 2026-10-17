import { findChildNode, getAllText, getAttr, getFieldValue, getNodeText, getTextField, listEntities, type EntityRef, type ModuleDefinition } from '@ruina/editor-core'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'
import { cardAccent } from '../lib/cardAccent'
import { referenceLabel, referenceNodes, resistanceRates } from '../lib/corePages'
import { bookStoryModule, rarityMeta } from '@ruina/schemas'
import { bookReferenceTarget, resolveBookReference, type BookReferenceTarget } from '../lib/vanillaAbilities'
import { editorLangToDocLang } from '../lib/lang'
import { useRegexRules } from '../lib/useRegexRules'
import { RegexText } from './RegexText'
import { PassivePreviewContent } from './PassiveAbilityPreviewPanel'

export function CorePagePreview({ module, entity }: { module: ModuleDefinition; entity: EntityRef | null }): JSX.Element {
  const { t, tl, lang } = useI18n()
  const language = editorLangToDocLang(lang)
  const rules = useRegexRules(language)
  const docs = useAppStore((s) => s.docs)
  const modules = useAppStore((s) => s.modules)
  const openWorkspaceAndSelect = useAppStore((s) => s.openWorkspaceAndSelect)
  const setPrimaryDoc = useAppStore((s) => s.setPrimaryDoc)
  const setPrimaryLang = useAppStore((s) => s.setPrimaryLang)
  const primaryDocPath = useAppStore((s) => s.primaryDocPath)
  const primaryLang = useAppStore((s) => s.primaryLang)
  const setActiveModule = useAppStore((s) => s.setActiveModule)
  const select = useAppStore((s) => s.select)
  if (!entity) return <p className="p-4 text-xs text-muted-foreground">{t('preview.empty')}</p>
  const value = (name: string, fallback = '0'): string => {
    const f = module.entity.fields.find((f) => f.name === name)
    const v = f ? getFieldValue(entity.node, f) : undefined
    return v === undefined || v === '' ? fallback : String(v)
  }
  const storyDocs = Object.values(docs).filter((d) => d.bindings.bookstory?.kind === 'primary')
  const storyDoc = primaryLang.bookstory === '__none__' ? undefined : storyDocs.find((d) => d.path === primaryDocPath.bookstory) ?? storyDocs.find((d) => d.lang === primaryLang.bookstory) ?? storyDocs.find((d) => d.lang === 'cn') ?? storyDocs[0]
  const story = storyDoc ? listEntities(storyDoc.doc, bookStoryModule.entity).find((r) => r.id === entity.id) : undefined
  const storyText = story ? getAllText(findChildNode(story.node, 'TextList') ?? story.node, 'Desc') : ''
  const passives = referenceNodes(entity.node, 'Passive')
  const jump = async (target?: BookReferenceTarget): Promise<void> => {
    if (!target) return
    if (target.path) setPrimaryDoc(target.moduleId, target.path)
    if (target.language) setPrimaryLang(target.moduleId, target.language)
    await openWorkspaceAndSelect(target.moduleId, target.id)
  }
  return <div className="space-y-3 p-3" data-testid="core-page-preview">
    <section className="rounded-lg border border-border bg-secondary/20 p-3"><div className="text-xs text-muted-foreground">#{entity.id} · {t(`module.${module.id.split('@')[0]}`)}</div><h2 className="mt-2 font-semibold" style={{ color: cardAccent(entity.node) }}>{value('Name', entity.id)}</h2><div className="mt-3 grid grid-cols-2 gap-2 text-xs">
      {[['生命值', value('HP')], ['混乱抗性', value('Break')], ['速度', `${value('SpeedMin')}–${value('Speed')}`], ['速度骰子数', value('SpeedDiceNum', '1')], ['初始光芒', value('StartPlayPoint', '3')], ['最大光芒', value('MaxPlayPoint', '3')], ['初始抽牌', String(3 + Number(value('AddedStartDraw')))]].map(([label, val]) => <div key={label} className="rounded border border-border p-2"><div className="text-muted-foreground">{tl(label)}</div><div className="mt-1 font-mono">{val}</div></div>)}
    </div></section>
    <section className="rounded-lg border border-border p-3"><h3 className="mb-2 text-xs text-muted-foreground">{t('core.resistance')}</h3><table className="w-full text-left text-xs"><thead><tr><th></th><th>{tl('生命值')}</th><th>{tl('混乱抗性')}</th></tr></thead><tbody>{[['S', '斩击'], ['P', '突刺'], ['H', '打击']].map(([prefix, label]) => <tr key={prefix}><td className="py-2">{tl(label)}</td>{['Resist', 'BResist'].map((suffix) => { const resist = value(prefix + suffix, 'Normal'); return <td key={suffix} title={resist}>{resistanceRates[resist] === undefined ? resist : `×${resistanceRates[resist]}`}</td> })}</tr>)}</tbody></table></section>
    <section className="space-y-2 rounded-lg border border-border p-3" data-testid="core-passive-preview"><h3 className="text-xs text-muted-foreground">{tl('被动')} · {passives.length}</h3>{passives.map((p, i) => {
      const detail = resolveBookReference(docs, 'passive', getNodeText(p), getAttr(p, 'Pid') ?? '', language)
      const target = bookReferenceTarget(docs, modules, 'passive', getNodeText(p), getAttr(p, 'Pid') ?? '', language)
      return <div key={i} data-reference-id={referenceLabel(p)} role={target ? 'button' : undefined} tabIndex={target ? 0 : undefined} onClick={() => void jump(target)} onKeyDown={(e) => { if (target && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); void jump(target) } }} className={`space-y-2 rounded-xl border border-border bg-secondary/20 p-3 ${target ? 'cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' : ''}`}><PassivePreviewContent name={detail?.name || referenceLabel(p)} desc={detail?.desc ?? ''} cost={detail?.fields.Cost} accent={rarityMeta[detail?.fields.Rarity ?? '']?.color} rules={rules}/>{detail?.name ? <div className="break-all text-[10px] text-muted-foreground">{referenceLabel(p)}</div> : null}</div>
    })}{!passives.length ? <p className="text-xs text-muted-foreground">{t('emptyRows')}</p> : null}</section>
    {(['OnlyCard', 'CustomOnlyCard'] as const).map((name) => {
      const cards = referenceNodes(entity.node, name)
      return cards.length ? <section key={name} className="space-y-2 rounded-lg border border-border p-3" data-testid={`core-cards-${name}`}><h3 className="text-xs text-muted-foreground">{name === 'OnlyCard' ? tl('专属卡牌') : t('core.customCards')}{name === 'OnlyCard' ? ` · ${t('core.originOnly')}` : ''}</h3>{cards.map((card, i) => {
        const id = getNodeText(card), detail = resolveBookReference(docs, 'card', id, name === 'OnlyCard' ? '@origin' : getAttr(card, 'Pid') ?? '', language)
        const target = bookReferenceTarget(docs, modules, 'card', id, name === 'OnlyCard' ? '@origin' : getAttr(card, 'Pid') ?? '', language)
        return <button key={i} type="button" data-reference-id={id} disabled={!target} onClick={() => void jump(target)} className="flex w-full items-center justify-between gap-2 rounded border border-transparent bg-secondary/20 p-2 text-left text-xs transition-colors enabled:hover:border-primary/50 enabled:hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><RegexText text={detail?.name || id} rules={rules}/><span className="text-muted-foreground">#{id}</span></button>
      })}</section> : null
    })}
    <section className="space-y-2 rounded-lg border border-border p-3"><h3 className="text-xs text-muted-foreground">{t('core.story')}</h3>{story ? <><button className="text-sm text-primary hover:underline" onClick={() => { select('bookstory', entity.id); void setActiveModule('bookstory') }}>{getTextField(story.node, 'BookName') || entity.id}</button><p className="whitespace-pre-wrap text-xs leading-relaxed">{storyText}</p></> : <p className="text-xs text-muted-foreground">{t('emptyRows')}</p>}</section>
  </div>
}
