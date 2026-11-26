import { GroupToggle, GroupedRows, useRowGroups } from './RowGroups'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { EntityRef, EntitySchema, ModuleDefinition, OrderedDoc } from '@ruina/editor-core'
import { childArray, getRootChildren, getTextField, insertEntity, listEntities, makeElement, moveEntity, parseXml, removeEntity, serializeXml, setAttr, setMulti, setTextField } from '@ruina/editor-core'
import { Button, Input, Select } from '@ruina/ui'
import { ArrowDown, ArrowUp, Check, ChevronsLeft, ChevronsRight, Copy, FileCode2, Hash, LayoutList, PenLine, Plus, Save, Search, Trash2, Wrench } from 'lucide-react'
import { useAppStore } from '../store'
import { sameLanguageSources, localizedIndex, rowKey, sourceName } from '../lib/localizationSources'
import { SourceChooser } from './SourceChooser'
import { useI18n } from '../i18n'
import { workspaceLanguage } from '../lib/workspaceLanguage'
import { getBuiltinRegexEntries, getBuiltinRegexLanguages, extractEffectTextEntries, writeKeywordEntry, type BattleEffectTextEntry } from '../lib/previewRules'
import { resolveBuiltinIconUrl } from '../lib/builtinIcons'
import { RegexText } from './RegexText'
import { AutoTextarea } from './AutoTextarea'
import { useRegexRules } from '../lib/useRegexRules'
import { keywordSearchAliases } from '../lib/keywordMigrations'

const blankEntry: BattleEffectTextEntry = {
  id: '',
  name: '',
  recognizeName: '',
  desc: '',
  keywordIconId: '',
  color: '',
  hasBracket: false,
  isUnderline: false,
  isItalic: false,
  isBold: false,
  isChangeSelf: false,
  isChangeAbility: false,
  isChangePassive: false,
  isAutoLink: false,
  isCardPreview: false,
  cardPreview: []
}

function ValueInput({ value, multiline = false, rows = 1, disabled, onChange }: { value: string; multiline?: boolean; rows?: number; disabled: boolean; onChange?: (v: string) => void }): JSX.Element {
  const cls = 'w-full rounded-md border border-border bg-muted px-2 py-1.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-80'
  if (multiline) {
    return <AutoTextarea className={cls} rows={rows} value={value} onChange={(v) => onChange?.(v)} disabled={disabled} readOnly={disabled} />
  }
  return <input className={cls} value={value} disabled={disabled} readOnly={disabled} onChange={(e) => onChange?.(e.target.value)} />
}

function BoolCheck({ checked, disabled, onChange }: { checked: boolean; disabled: boolean; onChange?: (v: boolean) => void }): JSX.Element {
  if (disabled) {
    return (
      <span className={`inline-flex size-4 shrink-0 items-center justify-center rounded border ${checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'}`}>
        {checked ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
    )
  }
  return <input type="checkbox" className="size-4 shrink-0 accent-primary" checked={checked} onChange={(e) => onChange?.(e.target.checked)} />
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

const CARD_NAME_SCHEMA: EntitySchema = {
  root: 'BattleCardDescRoot',
  containerPath: ['cardDescList'],
  entity: 'BattleCardDesc',
  idAttr: 'ID',
  fields: []
}

const BOOLEAN_FIELDS: { key: keyof BattleEffectTextEntry; label: string; realName: string }[] = [
  { key: 'hasBracket', label: '识别名检查[]', realName: 'HasBracket' },
  { key: 'keepRecognizeName', label: '保留识别名', realName: 'KeepRecognizeName' },
  { key: 'isUnderline', label: '下划线', realName: 'IsUnderline' },
  { key: 'isItalic', label: '斜体', realName: 'IsItalic' },
  { key: 'isBold', label: '粗体', realName: 'IsBold' },
  { key: 'isChangeSelf', label: '为KeywordUI添加图标', realName: 'IsChangeSelf' },
  { key: 'isChangeAbility', label: '对书页能力有效', realName: 'IsChangeAbility' },
  { key: 'isChangePassive', label: '对被动能力有效', realName: 'IsChangePassive' },
  { key: 'isAutoLink', label: '自动使用Link', realName: 'IsAutoLink' },
  { key: 'isCardPreview', label: '卡牌预览', realName: 'IsCardPreview' }
]

function langFullLabel(s: string): string {
  if (s === 'cn') return '简体中文'
  if (s === 'en') return 'English'
  if (s === 'jp' || s === 'ja') return '日本語'
  if (s === 'kr' || s === 'ko') return '한국어'
  return s
}

function serializeEntryForSource(e: BattleEffectTextEntry): string {
  const node = e.rawSource ? parseXml(e.rawSource).find((n: any) => n.BattleEffectTextExtra) : makeElement('BattleEffectTextExtra')
  if (!node) return e.rawSource ?? ''
  writeKeywordEntry(node as any, e)
  return serializeXml([node])
}

/** 奇点大工作区 - 内置正则 / 模组正则：只读或可编辑字段表单模板 + 本地化文档选择器 + 说明抽屉。 */
export function BuiltinRegexWorkspace({ module }: { module: ModuleDefinition }): JSX.Element {
  const { t, tl } = useI18n()
  const [sourcePath, setSourcePath] = useState('')
  const [choosingSource, setChoosingSource] = useState(false)
  const cardNamePath = useAppStore((st) => st.primaryDocPath.cardname)
  const docs = useAppStore((st) => st.docs)
  const ensureModuleDocs = useAppStore((st) => st.ensureModuleDocs)
  const primaryLang = useAppStore((st) => st.primaryLang)
  const setPrimaryLang = useAppStore((st) => st.setPrimaryLang)
  const buffIcons = useAppStore((st) => st.buffIcons)
  const loadBuffIcons = useAppStore((st) => st.loadBuffIcons)
  const setStatus = useAppStore((st) => st.setStatus)
  const fixWorkspace = useAppStore((st) => st.fixWorkspace)
  const isEditable = module.modRegex === true
  const setId = module.id === 'vanilla-regex' ? 'vanilla' : module.id === 'singularity-regex' ? 'singularity' : 'mod'

  const builtinLangs = useMemo(() => {
    if (setId === 'vanilla' || setId === 'singularity') return getBuiltinRegexLanguages(setId)
    return []
  }, [setId])

  const modDocs = useMemo(() => Object.values(docs).filter((d) => d.bindings['mod-regex']?.kind === 'primary'), [docs])

  const langOptions = useMemo(() => {
    if (setId === 'mod') {
      return [...new Map(modDocs.map((d) => [d.lang, { value: d.lang ?? d.path, label: d.langLabel ?? d.lang ?? '' }])).values()]
    }
    return builtinLangs.map((s) => ({ value: s, label: langFullLabel(s) }))
  }, [setId, builtinLangs, modDocs])

  const selectedLang = workspaceLanguage(docs, module.id, primaryLang[module.id])
  const rules = useRegexRules(selectedLang)
  const setLang = (v: string): void => { setSourcePath(''); setPrimaryLang(module.id, v) }

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showReal, setShowReal] = useState(false)
  const [showCardNames, setShowCardNames] = useState(false)
  const [draft, setDraft] = useState<BattleEffectTextEntry>(blankEntry)
  const [toolsOpen, setToolsOpen] = useState(false)

  const [notice, setNotice] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'brief' | 'detail' | 'source'>('detail')
  const listRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef(new Map<string, HTMLButtonElement>())
  const lastScrolledRef = useRef<string | null>(null)

  useEffect(() => {
    if (setId === 'mod') void loadBuffIcons()
  }, [setId, loadBuffIcons])

  const sources = useMemo(() => modDocs.filter((d) => d.lang === selectedLang), [modDocs, selectedLang])
  const activeSource = sources.find((d) => d.path === sourcePath)
  type Entry = BattleEffectTextEntry & { source?: string; occurrence?: number }
  const entries = useMemo((): Entry[] => {
    if (selectedLang === '__none__') return []
    if (setId !== 'mod') return getBuiltinRegexEntries(setId, selectedLang)
    return (activeSource ? [activeSource] : sources).flatMap((d) => {
      const counts = new Map<string, number>()
      return extractEffectTextEntries(d.doc).map((entry) => {
        const occurrence = counts.get(entry.id) ?? 0
        counts.set(entry.id, occurrence + 1)
        return { ...entry, source: d.path, occurrence }
      })
    })
  }, [setId, selectedLang, sources, activeSource])
  const entryKey = (entry: Entry): string => entry.source ? JSON.stringify([entry.source, entry.id, entry.occurrence ?? 0]) : entry.id

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return entries
    return entries.filter((e) => {
      const name = (e.name || e.recognizeName || '').toLowerCase()
      return e.id.toLowerCase().includes(q) || name.includes(q) || e.desc.toLowerCase().includes(q) || e.plugin?.toLowerCase().includes(q) || e.recognizeNames?.some((n) => n.toLowerCase().includes(q)) || keywordSearchAliases(e.id).some((alias) => alias.toLowerCase().includes(q))
    })
  }, [entries, search])

  // 选中项变化时滚动进可视范围（新增/复制后立即定位到新条目）
  useEffect(() => {
    if (!selectedId || lastScrolledRef.current === selectedId) return
    if (!entries.some((e) => entryKey(e) === selectedId)) return
    if (!filtered.some((e) => entryKey(e) === selectedId)) {
      if (search.trim() !== '') setSearch('')
      return
    }
    const raf = requestAnimationFrame(() => {
      const box = listRef.current
      const node = rowRefs.current.get(selectedId)
      if (!box || !node) return
      const boxRect = box.getBoundingClientRect()
      const nodeRect = node.getBoundingClientRect()
      if (nodeRect.top < boxRect.top || nodeRect.bottom > boxRect.bottom) {
        box.scrollTop += nodeRect.top - boxRect.top - Math.max(0, (box.clientHeight - nodeRect.height) / 2)
      }
      lastScrolledRef.current = selectedId
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, filtered, entries, search])

  const selectedEntry = entries.find((e) => entryKey(e) === selectedId) ?? entries[0] ?? null
  const setPrimaryDoc = useAppStore((s) => s.setPrimaryDoc)
  useEffect(() => {
    if (selectedEntry?.source) setPrimaryDoc(module.id, selectedEntry.source)
  }, [module.id, selectedEntry?.source, setPrimaryDoc])
  useEffect(() => {
    if (isEditable && selectedEntry) setDraft(structuredClone(selectedEntry))
  }, [isEditable, selectedEntry?.source, selectedEntry?.occurrence, selectedEntry?.id, selectedEntry?.rawSource, selectedEntry?.name, selectedEntry?.desc])
  const entry = isEditable ? draft : selectedEntry

  useEffect(() => {
    if (entry?.isCardPreview) void ensureModuleDocs('cardname')
  }, [entry?.isCardPreview, ensureModuleDocs])

  const cardNames = useMemo(() => {
    const documents = Object.values(docs).filter((d) => d.bindings.cardname?.kind === 'primary')
    const map = new Map<string, string>()
    for (const [id, { ref }] of localizedIndex(sameLanguageSources(documents, primaryLang.cardname, cardNamePath), CARD_NAME_SCHEMA)) {
      const name = getTextField(ref.node, 'LocalizedName')
      if (name) map.set(id, name)
    }
    return map
  }, [docs, primaryLang.cardname, cardNamePath])
  const isDirty = isEditable && selectedEntry ? JSON.stringify(draft) !== JSON.stringify(selectedEntry) : false

  const groupedRefs = useMemo(() => (isEditable && !activeSource && sources.length > 1)
    ? sources.flatMap((d) => listEntities(d.doc, module.entity).map((r) => ({ ...r, source: d.path }))) : [], [sources, activeSource, module.entity, isEditable])
  // extractEffectTextEntries reads the same extraTextList in document order.
  const entryByRow = useMemo(() => new Map(groupedRefs.map((r, i) => [rowKey(r), entries[i]])), [groupedRefs, entries])
  const refByEntry = useMemo(() => new Map(groupedRefs.map((r, i) => [entries[i], r])), [groupedRefs, entries])
  const grouping = useRowGroups(module, '', groupedRefs, isEditable && !activeSource && sources.length > 1 ? sources : undefined, false, (row) => {
    const state = useAppStore.getState()
    const peers = listEntities(state.docs[row.source!].doc, module.entity).filter((r) => r.id === row.id)
    setSelectedId(JSON.stringify([row.source, row.id, peers.findIndex((r) => r.index === row.index)]))
    void state.saveDoc(row.source!)
  }, isDirty)

  const MOD_SCHEMA: EntitySchema = { root: 'BattleEffectTextRootExtra', entity: 'BattleEffectTextExtra', idAttr: 'ID', containerPath: ['extraTextList'], fields: [] }

  const ensureExtraList = (doc: OrderedDoc): void => {
    const rootChildren = getRootChildren(doc, 'BattleEffectTextRootExtra')
    const exists = rootChildren.some((c) => c && typeof c === 'object' && !Array.isArray(c) && Object.keys(c as Record<string, unknown>)[0] === 'extraTextList')
    if (!exists) rootChildren.push(makeElement('extraTextList'))
  }

  const mutateModDoc = async (path: string, mutate: (doc: OrderedDoc, refs: EntityRef[]) => void): Promise<boolean> => {
    const state = useAppStore.getState()
    if (!state.docs[path]?.bindings[module.id]) return false
    state.editDoc(path, (doc) => {
      ensureExtraList(doc)
      mutate(doc, listEntities(doc, MOD_SCHEMA))
    })
    return state.saveDoc(path)
  }

  const addModEntry = async (path?: string): Promise<void> => {
    const target = path ?? activeSource?.path ?? (sources.length === 1 ? sources[0].path : undefined)
    if (!target) { setChoosingSource(true); return }
    setChoosingSource(false)
    const id = 'NewKeyword_' + Date.now()
    if (await mutateModDoc(target, (doc) => insertEntity(doc, MOD_SCHEMA, makeElement('BattleEffectTextExtra', { ID: id })))) {
      setSelectedId(JSON.stringify([target, id, 0]))
    }
  }

  const selectedRef = (refs: EntityRef[]) => refs.filter((r) => r.id === selectedEntry?.id)[selectedEntry?.occurrence ?? 0]
  const duplicateModEntry = async (): Promise<void> => {
    if (!selectedEntry?.source) return
    const base = selectedEntry.id + '_copy'
    let id = base
    const saved = await mutateModDoc(selectedEntry.source, (doc, refs) => {
      const cur = selectedRef(refs)
      if (!cur) return
      for (let n = 2; refs.some((r) => r.id === id); n++) id = base + n
      const node = structuredClone(cur.node)
      setAttr(node, 'ID', id)
      insertEntity(doc, MOD_SCHEMA, node, cur.index + 1)
    })
    if (saved) setSelectedId(JSON.stringify([selectedEntry.source, id, 0]))
  }

  const deleteModEntry = async (): Promise<void> => {
    if (!selectedEntry?.source) return
    if (await mutateModDoc(selectedEntry.source, (doc, refs) => {
      const cur = selectedRef(refs)
      if (cur) removeEntity(doc, MOD_SCHEMA, cur.index)
    })) setSelectedId(null)
  }

  const writeDraftToNode = writeKeywordEntry

  const addPreviewCard = (): void => {
    if (!isEditable) return
    setDraft((d) => ({ ...d, cardPreview: [...d.cardPreview, ''] }))
  }

  const removePreviewCard = (index: number): void => {
    if (!isEditable) return
    setDraft((d) => ({ ...d, cardPreview: d.cardPreview.filter((_, i) => i !== index) }))
  }

  const saveDraft = async (): Promise<void> => {
    if (!selectedEntry?.source) return
    if (!draft.id.trim() || (draft.id !== selectedEntry.id && entries.some((e) => e.source === selectedEntry.source && e.id === draft.id))) {
      setStatus(t('id.duplicate', { id: draft.id }), 'error')
      return
    }
    if (await mutateModDoc(selectedEntry.source, (_doc, refs) => {
      const cur = selectedRef(refs)
      if (cur) writeDraftToNode(cur.node, draft)
    })) {
      setSelectedId(entryKey({ ...selectedEntry, id: draft.id, occurrence: draft.id === selectedEntry.id ? selectedEntry.occurrence : 0 }))
      setStatus('已保存当前 Mod 正则', 'success')
    }
  }

  const moveModEntry = (delta: -1 | 1): void => {
    if (!selectedEntry?.source) return
    void mutateModDoc(selectedEntry.source, (doc, refs) => {
      const from = refs.indexOf(selectedRef(refs))
      const target = refs[from + delta]
      if (from >= 0 && target) moveEntity(doc, MOD_SCHEMA, refs[from].index, target.index)
    })
  }

  const renderEntry = (entryItem: Entry) => {
    const icon = resolveBuiltinIconUrl(entryItem.keywordIconId, buffIcons)
    const key = entryKey(entryItem)
    const active = !grouping.enabled && selectedEntry === entryItem
    return (
      <button
        key={key}
        ref={(el) => {
          if (el) rowRefs.current.set(key, el)
          else rowRefs.current.delete(key)
        }}
        onClick={grouping.enabled ? undefined : () => setSelectedId(key)}
        className={`flex w-full items-center gap-2 border-b border-border/60 px-3 py-2 text-left transition-colors ${active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
      >
        {icon ? <img src={icon} alt="" className="size-5 shrink-0 object-contain" draggable={false} /> : <span className="size-5 shrink-0" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium" style={{ color: entryItem.color || undefined, fontWeight: entryItem.isBold ? 700 : undefined, fontStyle: entryItem.isItalic ? 'italic' : undefined }}>{entryItem.name || entryItem.recognizeName || entryItem.id}</span>
          {entryItem.name || entryItem.recognizeName ? <span className="block truncate text-[10px] text-muted-foreground">{entryItem.id}</span> : null}
          {!grouping.enabled && entryItem.source && sources.length > 1 && <small className="block truncate text-muted-foreground" title={entryItem.source}>{sourceName(entryItem.source)}</small>}
        </span>
      </button>
    )
  }

  if (viewMode === 'source') {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2">
          <div className="text-sm font-semibold tracking-wide text-primary/80">{t('module.' + module.id) || module.title}</div>
          <div className="mx-1 h-5 w-px bg-border" />
          <div className="flex-1" />
          <div className="flex rounded-lg border border-border bg-muted p-0.5">
            {([{ id: 'brief', label: t('brief'), icon: LayoutList }, { id: 'detail', label: t('detail'), icon: PenLine }, { id: 'source', label: t('source'), icon: FileCode2 }] as const).map((m) => (
              <button key={m.id} onClick={() => setViewMode(m.id)} disabled={m.id === 'brief'} className={'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ' + (viewMode === m.id ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground') + ' disabled:cursor-not-allowed disabled:opacity-40'}>
                <m.icon className="size-3.5" />
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          <textarea
            className="h-full w-full resize-none rounded-md border border-border bg-muted p-3 font-mono text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-80"
            value={entry ? (!isEditable && entry.rawSource ? entry.rawSource : serializeEntryForSource(entry)) : ''}
            readOnly
            disabled
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2">
        <div className="text-sm font-semibold tracking-wide text-primary/80">{t('module.' + module.id) || module.title}</div>
        <div className="mx-1 h-5 w-px bg-border" />
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-1.5 py-1">
          <span className="text-[10px] text-muted-foreground">{t('doc')}</span>
          <Select.Root value={selectedLang} onValueChange={setLang}>
            <Select.Trigger className="h-7 w-32 text-xs">
              <Select.Value placeholder={t('select.document')} />
            </Select.Trigger>
            <Select.Content>
              {langOptions.map((o) => (
                <Select.Item key={o.value} value={o.value}>
                  {o.label}
                </Select.Item>
              ))}
              <Select.Item value="__none__">{t('none')}</Select.Item>
            </Select.Content>
          </Select.Root>
        </div>
        {isEditable && sources.length > 1 && <Select.Root value={activeSource?.path ?? 'all'} onValueChange={(v) => setSourcePath(v === 'all' ? '' : v)}>
          <Select.Trigger className="h-7 w-44 text-xs"><Select.Value /></Select.Trigger>
          <Select.Content><Select.Item value="all">{t('doc.combined')}</Select.Item>
            {sources.map((d) => <Select.Item key={d.path} value={d.path} title={d.path}>{sourceName(d.path)}</Select.Item>)}
          </Select.Content></Select.Root>}
        {choosingSource && <SourceChooser paths={sources.map((d) => d.path)} onChoose={(p) => void addModEntry(p)} onCancel={() => setChoosingSource(false)}/>}
        <div className="flex-1" />
        <div className="flex rounded-lg border border-border bg-muted p-0.5">
          {([{ id: 'brief', label: t('brief'), icon: LayoutList }, { id: 'detail', label: t('detail'), icon: PenLine }, { id: 'source', label: t('source'), icon: FileCode2 }] as const).map((m) => (
            <button key={m.id} onClick={() => setViewMode(m.id)} disabled={m.id === 'brief'} className={'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ' + (viewMode === m.id ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground') + ' disabled:cursor-not-allowed disabled:opacity-40'}>
              <m.icon className="size-3.5" />
              {m.label}
            </button>
          ))}
        </div>
        <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">{t('total', { n: entries.length })}</span>
        <Button size="sm" variant="secondary" onClick={() => {
          void (async () => {
            await fixWorkspace(module.id)
            setTimeout(() => setNotice(useAppStore.getState().status), 150)
          })()
        }} disabled={!isEditable} title="按 XML 规则校验并修复当前正则工作区">
          <Wrench /> {t('fix')}
        </Button>
        <Button size="sm" onClick={() => {
          void saveDraft().then(() => setNotice(useAppStore.getState().status))
        }} disabled={!isEditable || !isDirty}>
          <Save /> {t('saveModule')}
        </Button>
      </div>

      <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: `300px minmax(0,1fr) ${toolsOpen ? '320px' : '36px'}` }}>
        <div className="flex min-h-0 flex-col border-r border-border bg-card">
          {isEditable ? (
            <div className="flex items-center gap-1 border-b border-border bg-card px-2 py-1.5">
              <Button size="sm" variant="secondary" disabled={!sources.length} onClick={() => void addModEntry()}><Plus /> {t('add')}</Button>
              <Button size="sm" variant="secondary" onClick={duplicateModEntry} disabled={!selectedEntry}><Copy /> {t('duplicate')}</Button>
              <Button size="sm" variant="secondary" onClick={deleteModEntry} disabled={!selectedEntry}><Trash2 /> {t('delete')}</Button>
              <div className="mx-1 h-5 w-px bg-border" />
              <Button size="icon" variant="ghost" className="size-7" title={t('moveUp')} onClick={() => moveModEntry(-1)} disabled={!selectedEntry}><ArrowUp /></Button>
              <Button size="icon" variant="ghost" className="size-7" title={t('moveDown')} onClick={() => moveModEntry(1)} disabled={!selectedEntry}><ArrowDown /></Button>
            </div>
          ) : null}
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search.regex')} className="pl-8" />
            </div>
          </div>
          {grouping.available && <div className="flex justify-end px-2 py-1"><GroupToggle g={grouping}/></div>}
          {grouping.enabled ? <GroupedRows key={grouping.scope} g={grouping} searching={Boolean(search.trim())} selected={selectedEntry && refByEntry.has(selectedEntry) ? rowKey(refByEntry.get(selectedEntry)!) : null}
            onSelect={(r) => setSelectedId(entryKey(entryByRow.get(rowKey(r))!))}
            filtered={filtered.flatMap((e) => refByEntry.get(e) ?? [])} render={(r) => renderEntry(entryByRow.get(rowKey(r))!)}/> : <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">{search ? t('noMatch') : (setId === 'mod' ? t('list.noContent') : t('regex.empty'))}</div>
            ) : (
              filtered.map(renderEntry)
            )}
          </div>}
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
          {!entry ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t('regex.noSelection')}</div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-3">
              <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                {entry.plugin ? <div className="break-all text-xs text-muted-foreground">{t('keyword.plugin')}: {entry.plugin} · {entry.language}<br />{entry.resourceName}<br />{t('keyword.referenceHint')}</div> : null}
                <div className="rounded border border-border p-2"><RegexText text={`(~HatKeyword id="${entry.id}"/~)`} rules={new Map(rules).set(entry.id, entry)} /></div>
                <Field label={tl('ID')}>
                  <ValueInput value={entry.id} disabled={!isEditable} onChange={(v) => setDraft({ ...draft, id: v })} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label={tl('名称')}>
                    <ValueInput value={entry.name} disabled={!isEditable} onChange={(v) => setDraft({ ...draft, name: v })} />
                  </Field>
                  <Field label={tl('识别名')}>
                    <ValueInput value={(entry.recognizeNames ?? [entry.recognizeName]).join('\n')} multiline disabled={!isEditable} onChange={(v) => setDraft({ ...draft, recognizeName: v.split('\n')[0], recognizeNames: v.split('\n') })} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label={tl('图标ID')}>
                    <ValueInput value={entry.keywordIconId} disabled={!isEditable} onChange={(v) => setDraft({ ...draft, keywordIconId: v })} />
                  </Field>
                  <Field label={tl('颜色')}>
                    <ValueInput value={entry.color} disabled={!isEditable} onChange={(v) => setDraft({ ...draft, color: v })} />
                  </Field>
                </div>

                <Field label={tl('描述')}>
                  <ValueInput value={entry.desc} multiline rows={5} disabled={!isEditable} onChange={(v) => setDraft({ ...draft, desc: v })} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="IconName"><ValueInput value={entry.iconName ?? ''} disabled={!isEditable} onChange={(v) => setDraft({ ...draft, iconName: v })} /></Field>
                  <Field label="IconSheetName"><ValueInput value={entry.iconSheetName ?? ''} disabled={!isEditable} onChange={(v) => setDraft({ ...draft, iconSheetName: v })} /></Field>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="grid flex-1 grid-cols-3 gap-2">
                    {BOOLEAN_FIELDS.map((f) => (
                      <label key={f.key} className="flex items-center gap-1.5 rounded-md border border-border/60 px-2 py-1.5 text-xs">
                        <BoolCheck checked={Boolean(entry[f.key])} disabled={!isEditable} onChange={(v) => setDraft({ ...draft, [f.key]: v })} />
                        <span>{showReal ? f.realName : tl(f.label)}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowReal((v) => !v)}
                    title={showReal ? t('showName') : t('showId')}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-all hover:opacity-80 active:scale-95"
                    style={showReal ? { color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))', backgroundColor: 'hsl(var(--primary) / 0.12)' } : { color: 'hsl(var(--muted-foreground))', borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--secondary))' }}
                  >
                    <Hash className="size-3" /> ID
                  </button>
                </div>

                {entry.isCardPreview ? (
                  <Field label={tl('预览卡牌')}>
                    <div className="mb-2 flex justify-end gap-1.5">
                      {isEditable && !showCardNames ? (
                        <button
                          type="button"
                          onClick={addPreviewCard}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-accent"
                        >
                          <Plus className="size-3" /> {t('addItem')}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setShowCardNames((v) => !v)}
                        className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-all hover:opacity-80 active:scale-95"
                        style={
                          showCardNames
                            ? { color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))', backgroundColor: 'hsl(var(--primary) / 0.12)' }
                            : { color: 'hsl(var(--muted-foreground))', borderColor: 'hsl(var(--border))', backgroundColor: 'hsl(var(--secondary))' }
                        }
                      >
                        <Hash className="size-3" /> ID
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {entry.cardPreview.length === 0 ? (
                        <span className="text-xs text-muted-foreground">{t('empty')}</span>
                      ) : showCardNames ? (
                        entry.cardPreview.map((v, i) => (
                          <span key={i} className="rounded-md border border-border bg-muted px-2 py-1 text-xs text-foreground">
                            {cardNames.get(v) || v}
                          </span>
                        ))
                      ) : (
                        entry.cardPreview.map((v, i) => (
                          <span key={i} className="inline-flex items-center gap-1">
                            <input
                              className="w-28 rounded-md border border-border bg-muted px-2 py-1 text-xs font-mono text-foreground disabled:cursor-not-allowed disabled:opacity-80"
                              value={v}
                              disabled={!isEditable}
                              readOnly={!isEditable}
                              onChange={(e) => {
                                const next = [...draft.cardPreview]
                                next[i] = e.target.value
                                setDraft({ ...draft, cardPreview: next })
                              }}
                            />
                            {isEditable ? (
                              <button type="button" className="text-red-400 hover:text-red-300" onClick={() => removePreviewCard(i)}>
                                <Trash2 className="size-3.5" />
                              </button>
                            ) : null}
                          </span>
                        ))
                      )}
                    </div>
                  </Field>
                ) : null}
              </div>

              <div className="rounded-lg border border-border bg-secondary/20 p-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground">{t('descPreview')}</div>
                <div className="whitespace-pre-wrap rounded-md border border-border/60 bg-background/50 px-3 py-2 text-sm leading-relaxed text-foreground/90">
                  {entry.desc ? <RegexText text={entry.desc} rules={rules} scope="all" extraIcons={buffIcons} /> : t('empty')}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative min-h-0 min-w-0">
          {toolsOpen ? (
            <div className="h-full min-h-0 overflow-y-auto overscroll-contain border-l border-border bg-card pl-8 pr-3 pt-3">
              <div className="mb-2 text-sm font-semibold text-primary/80">{t('regex.help')}</div>
              <div className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/20 p-3 text-xs leading-relaxed text-foreground/90">{t('regex.helpText')}</div>
            </div>
          ) : null}
          <button
            className="absolute left-0 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 rounded-r-md border border-l-0 border-border bg-secondary px-1.5 py-3 text-xs text-muted-foreground shadow hover:bg-accent"
            onClick={() => setToolsOpen((v) => !v)}
          >
            {toolsOpen ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            {!toolsOpen ? <span className="[writing-mode:vertical-rl]">{t('regex.help')}</span> : null}
          </button>
        </div>
      </div>
      {notice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-2xl">
            <div className="mb-3 text-sm font-medium text-foreground">{t('fix')} / {t('saveModule')}</div>
            <div className="mb-4 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{notice}</div>
            <button className="w-full rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90" onClick={() => setNotice(null)}>OK</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
