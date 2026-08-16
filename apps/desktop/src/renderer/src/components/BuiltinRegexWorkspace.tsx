import { useEffect, useMemo, useState } from 'react'
import type { EntityRef, EntitySchema, ModuleDefinition, OrderedDoc } from '@ruina/editor-core'
import { childArray, getRootChildren, getTextField, insertEntity, listEntities, makeElement, moveEntity, parseXml, removeEntity, serializeXml, setAttr, setMulti, setTextField } from '@ruina/editor-core'
import { Button, Input, Select } from '@ruina/ui'
import { ArrowDown, ArrowUp, Check, ChevronsLeft, ChevronsRight, Copy, FileCode2, Hash, LayoutList, PenLine, Plus, Save, Search, Trash2, Wrench } from 'lucide-react'
import { useAppStore } from '../store'
import { api } from '../api'
import { useI18n } from '../i18n'
import { editorLangToDocLang } from '../lib/lang'
import { getBuiltinRegexEntries, getBuiltinRegexLanguages, parseRegexXml, type BattleEffectTextEntry } from '../lib/previewRules'
import { resolveBuiltinIconUrl } from '../lib/builtinIcons'
import { RegexText } from './RegexText'
import { AutoTextarea } from './AutoTextarea'
import { useRegexRules } from '../lib/useRegexRules'

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
  return s
}

function serializeEntryForSource(e: BattleEffectTextEntry): string {
  const bool = (b: boolean): string => (b ? 'true' : 'false')
  return [
    '<BattleEffectTextExtra ID="' + e.id + '">',
    '  <Name>' + e.name + '</Name>',
    '  <RecognizeName>' + e.recognizeName + '</RecognizeName>',
    '  <Desc>' + e.desc + '</Desc>',
    '  <KeywordIconId>' + e.keywordIconId + '</KeywordIconId>',
    '  <Color>' + e.color + '</Color>',
    '  <HasBracket>' + bool(e.hasBracket) + '</HasBracket>',
    '  <IsUnderline>' + bool(e.isUnderline) + '</IsUnderline>',
    '  <IsItalic>' + bool(e.isItalic) + '</IsItalic>',
    '  <IsBold>' + bool(e.isBold) + '</IsBold>',
    '  <IsChangeSelf>' + bool(e.isChangeSelf) + '</IsChangeSelf>',
    '  <IsChangeAbility>' + bool(e.isChangeAbility) + '</IsChangeAbility>',
    '  <IsChangePassive>' + bool(e.isChangePassive) + '</IsChangePassive>',
    '  <IsAutoLink>' + bool(e.isAutoLink) + '</IsAutoLink>',
    '  <IsCardPreview>' + bool(e.isCardPreview) + '</IsCardPreview>'
  ].concat(e.cardPreview.map((v) => '  <CardPreview>' + v + '</CardPreview>')).concat(['</BattleEffectTextExtra>']).join('\n')
}

/** 奇点大工作区 - 内置正则 / 模组正则：只读或可编辑字段表单模板 + 本地化文档选择器 + 说明抽屉。 */
export function BuiltinRegexWorkspace({ module }: { module: ModuleDefinition }): JSX.Element {
  const { t, tl, lang } = useI18n()
  const rules = useRegexRules()
  const localizeFiles = useAppStore((st) => st.localizeFiles)
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

  const modDocs = useMemo(() => localizeFiles.filter((f) => f.root === 'BattleEffectTextRootExtra'), [localizeFiles])

  const langOptions = useMemo(() => {
    if (setId === 'mod') {
      return modDocs.map((d) => ({ value: d.lang ?? d.path, label: d.label ?? d.lang ?? '' }))
    }
    return builtinLangs.map((s) => ({ value: s, label: langFullLabel(s) }))
  }, [setId, builtinLangs, modDocs])

  const preferredDocLang = editorLangToDocLang(lang)
  const selectedLang = primaryLang[module.id] ?? langOptions.find((o) => o.value === preferredDocLang)?.value ?? langOptions[0]?.value ?? 'cn'
  const setLang = (v: string): void => setPrimaryLang(module.id, v)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showReal, setShowReal] = useState(false)
  const [showCardNames, setShowCardNames] = useState(false)
  const [draft, setDraft] = useState<BattleEffectTextEntry>(blankEntry)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [modEntries, setModEntries] = useState<BattleEffectTextEntry[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'brief' | 'detail' | 'source'>('detail')

  useEffect(() => {
    if (setId === 'mod') void loadBuffIcons()
  }, [setId, loadBuffIcons])

  useEffect(() => {
    if (setId !== 'mod') return
    const candidates = modDocs.filter((f) => f.lang === selectedLang)
    let alive = true
    void (async () => {
      const all: BattleEffectTextEntry[] = []
      for (const f of candidates) {
        try {
          const text = await api.readTextFile(f.path)
          all.push(...parseRegexXml(text))
        } catch {
          // 跳过读取失败的文件
        }
      }
      if (alive) setModEntries(all)
    })()
    return () => {
      alive = false
    }
  }, [setId, selectedLang, modDocs])

  const entries = useMemo(() => {
    if (selectedLang === '__none__') return []
    if (setId === 'mod') return modEntries
    return getBuiltinRegexEntries(setId, selectedLang)
  }, [setId, selectedLang, modEntries])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return entries
    return entries.filter((e) => {
      const name = (e.name || e.recognizeName || '').toLowerCase()
      return e.id.toLowerCase().includes(q) || name.includes(q) || e.desc.toLowerCase().includes(q)
    })
  }, [entries, search])

  const selectedEntry = entries.find((e) => e.id === selectedId) ?? entries[0] ?? null
  useEffect(() => {
    if (isEditable && selectedEntry) setDraft(structuredClone(selectedEntry))
  }, [isEditable, selectedEntry])
  const entry = isEditable ? draft : selectedEntry

  useEffect(() => {
    if (entry?.isCardPreview) void ensureModuleDocs('cardname')
  }, [entry?.isCardPreview, ensureModuleDocs])

  const cardNameDoc = useMemo(() => {
    const all = Object.values(docs).filter((d) => d.root === 'BattleCardDescRoot' && d.bindings['cardname']?.kind === 'primary')
    return all.find((d) => d.lang === primaryLang['cardname']) ?? all.find((d) => d.lang === 'cn') ?? all[0]
  }, [docs, primaryLang])

  const cardNames = useMemo(() => {
    const map = new Map<string, string>()
    if (!cardNameDoc) return map
    for (const r of listEntities(cardNameDoc.doc, CARD_NAME_SCHEMA)) {
      const n = getTextField(r.node, 'LocalizedName')
      if (n) map.set(r.id, n)
    }
    return map
  }, [cardNameDoc])
  const isDirty = isEditable && selectedEntry ? JSON.stringify(draft) !== JSON.stringify(selectedEntry) : false

  const MOD_SCHEMA: EntitySchema = { root: 'BattleEffectTextRootExtra', entity: 'BattleEffectTextExtra', idAttr: 'ID', containerPath: ['extraTextList'], fields: [] }

  const ensureExtraList = (doc: OrderedDoc): void => {
    const rootChildren = getRootChildren(doc, 'BattleEffectTextRootExtra')
    const exists = rootChildren.some((c) => c && typeof c === 'object' && !Array.isArray(c) && Object.keys(c as Record<string, unknown>)[0] === 'extraTextList')
    if (!exists) rootChildren.push(makeElement('extraTextList'))
  }

  const reloadModEntries = async (): Promise<void> => {
    const all: BattleEffectTextEntry[] = []
    for (const f of modDocs.filter((x) => x.lang === selectedLang)) {
      try {
        all.push(...parseRegexXml(await api.readTextFile(f.path)))
      } catch {
        // ignore
      }
    }
    setModEntries(all)
  }

  const syncStoreDoc = (path: string, text: string): void => {
    const st = useAppStore.getState()
    const d = st.docs[path]
    if (!d) return
    const next = { ...d, doc: parseXml(text), dirty: false, lastSavedText: text }
    useAppStore.setState({ docs: { ...st.docs, [path]: next } })
  }

  const mutateModDoc = async (mutate: (doc: OrderedDoc, refs: EntityRef[]) => void): Promise<void> => {
    if (setId !== 'mod') return
    const target = modDocs.find((f) => f.lang === selectedLang) ?? modDocs[0]
    if (!target) return
    try {
      const text = await api.readTextFile(target.path)
      const doc = parseXml(text)
      ensureExtraList(doc)
      const refs = listEntities(doc, MOD_SCHEMA)
      mutate(doc, refs)
      const savedText = serializeXml(doc)
      await api.saveFile(target.path, savedText)
      syncStoreDoc(target.path, savedText)
      await reloadModEntries()
    } catch (e) {
      setStatus(`操作失败：${e instanceof Error ? e.message : String(e)}`, 'error')
    }
  }

  const addModEntry = (): void => {
    const id = `NewKeyword_${Date.now()}`
    void mutateModDoc((doc) => {
      insertEntity(doc, MOD_SCHEMA, makeElement('BattleEffectTextExtra', { ID: id }))
    })
    setSelectedId(id)
  }

  const duplicateModEntry = (): void => {
    if (!selectedEntry) return
    const id = `${selectedEntry.id}_copy`
    void mutateModDoc((doc, refs) => {
      const cur = refs.find((r) => r.id === selectedEntry.id)
      if (!cur) return
      const node = structuredClone(cur.node)
      setAttr(node, 'ID', id)
      insertEntity(doc, MOD_SCHEMA, node, cur.index + 1)
    })
    setSelectedId(id)
  }

  const deleteModEntry = (): void => {
    if (!selectedEntry) return
    void mutateModDoc((doc, refs) => {
      const cur = refs.find((r) => r.id === selectedEntry.id)
      if (cur) removeEntity(doc, MOD_SCHEMA, cur.index)
    })
    setSelectedId(null)
  }

  const writeDraftToNode = (node: any, e: BattleEffectTextEntry): void => {
    setAttr(node, 'ID', e.id)
    const bool = (b: boolean): string => (b ? 'true' : 'false')
    setTextField(node, 'Name', e.name)
    setTextField(node, 'RecognizeName', e.recognizeName)
    setTextField(node, 'Desc', e.desc)
    setTextField(node, 'KeywordIconId', e.keywordIconId)
    setTextField(node, 'Color', e.color)
    setTextField(node, 'HasBracket', bool(e.hasBracket))
    setTextField(node, 'IsUnderline', bool(e.isUnderline))
    setTextField(node, 'IsItalic', bool(e.isItalic))
    setTextField(node, 'IsBold', bool(e.isBold))
    setTextField(node, 'IsChangeSelf', bool(e.isChangeSelf))
    setTextField(node, 'IsChangeAbility', bool(e.isChangeAbility))
    setTextField(node, 'IsChangePassive', bool(e.isChangePassive))
    setTextField(node, 'IsAutoLink', bool(e.isAutoLink))
    setTextField(node, 'IsCardPreview', bool(e.isCardPreview))
    setMulti(node, 'CardPreview', e.cardPreview)
  }

  const addPreviewCard = (): void => {
    if (!isEditable) return
    setDraft((d) => ({ ...d, cardPreview: [...d.cardPreview, ''] }))
  }

  const removePreviewCard = (index: number): void => {
    if (!isEditable) return
    setDraft((d) => ({ ...d, cardPreview: d.cardPreview.filter((_, i) => i !== index) }))
  }

  const saveDraft = (): void => {
    if (!isEditable || !selectedEntry) return
    void mutateModDoc((doc, refs) => {
      const cur = refs.find((r) => r.id === selectedEntry.id)
      if (cur) writeDraftToNode(cur.node, draft)
    })
    setStatus('已保存当前 Mod 正则', 'success')
  }

    const moveModEntry = (delta: -1 | 1): void => {
    if (!selectedEntry) return
    void mutateModDoc((doc, refs) => {
      const from = refs.findIndex((r) => r.id === selectedEntry.id)
      const to = from + delta
      if (from < 0 || to < 0 || to >= refs.length) return
      moveEntity(doc, MOD_SCHEMA, refs[from].index, refs[to].index)
    })
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
            value={entry ? serializeEntryForSource(entry) : ''}
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
          saveDraft()
          setTimeout(() => setNotice(useAppStore.getState().status), 150)
        }} disabled={!isEditable || !isDirty}>
          <Save /> {t('saveModule')}
        </Button>
      </div>

      <div className="grid min-h-0 flex-1" style={{ gridTemplateColumns: `300px minmax(0,1fr) ${toolsOpen ? '320px' : '36px'}` }}>
        <div className="flex min-h-0 flex-col border-r border-border bg-card">
          {isEditable ? (
            <div className="flex items-center gap-1 border-b border-border bg-card px-2 py-1.5">
              <Button size="sm" variant="secondary" onClick={addModEntry}><Plus /> {t('add')}</Button>
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
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">{search ? t('noMatch') : (setId === 'mod' ? t('list.noContent') : t('regex.empty'))}</div>
            ) : (
              filtered.map((entryItem) => {
                const icon = resolveBuiltinIconUrl(entryItem.keywordIconId, buffIcons)
                const active = entryItem.id === selectedEntry?.id
                return (
                  <button
                    key={entryItem.id}
                    onClick={() => setSelectedId(entryItem.id)}
                    className={`flex w-full items-center gap-2 border-b border-border/60 px-3 py-2 text-left transition-colors ${active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
                  >
                    {icon ? <img src={icon} alt="" className="size-5 shrink-0 object-contain" draggable={false} /> : <span className="size-5 shrink-0" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium" style={{ color: entryItem.color || undefined, fontWeight: entryItem.isBold ? 700 : undefined, fontStyle: entryItem.isItalic ? 'italic' : undefined }}>{entryItem.name || entryItem.recognizeName || entryItem.id}</span>
                      {entryItem.name || entryItem.recognizeName ? <span className="block truncate text-[10px] text-muted-foreground">{entryItem.id}</span> : null}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
          {!entry ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t('regex.noSelection')}</div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-3">
              <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                <Field label={tl('ID')}>
                  <ValueInput value={entry.id} disabled={!isEditable} onChange={(v) => setDraft({ ...draft, id: v })} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label={tl('名称')}>
                    <ValueInput value={entry.name} disabled={!isEditable} onChange={(v) => setDraft({ ...draft, name: v })} />
                  </Field>
                  <Field label={tl('识别名')}>
                    <ValueInput value={entry.recognizeName} disabled={!isEditable} onChange={(v) => setDraft({ ...draft, recognizeName: v })} />
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