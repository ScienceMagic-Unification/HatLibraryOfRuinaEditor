import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { FieldDef, ModuleDefinition, OrderedDoc } from '@ruina/editor-core'
import { createEntity, getAllText, getTextField, insertEntity, listEntities, moveEntity, removeEntity, setAttr, setFieldValue } from '@ruina/editor-core'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'
import { editorLangToDocLang } from '../lib/lang'
import { cardAccent } from '../lib/cardAccent'
import { DataPanel } from './DataPanel'
import { FormPanel } from './FormPanel'
import { SummaryPanel } from './SummaryPanel'
import { SourcePanel } from './SourcePanel'
import { LocalizePanel } from './LocalizePanel'
import { PreviewPanel } from './PreviewPanel'
import { RegexText } from './RegexText'
import { useRegexRules } from '../lib/useRegexRules'
import { CardNameTools } from './CardNameTools'
import { ProofPanel } from './ProofPanel'
import { CardBriefPanel } from './CardBriefPanel'
import { CardAbilityTools } from './CardAbilityTools'
import { PassiveAbilityTools } from './PassiveAbilityTools'
import { EffectTextTools } from './EffectTextTools'
import { ToolDrawer } from './ToolDrawer'
import { WorkspaceToolbar } from './WorkspaceToolbar'
import { EffectTextListPanel } from './EffectTextListPanel'
import { ImageWorkspace } from './ImageWorkspace'
import { BuiltinImageWorkspace } from './BuiltinImageWorkspace'
import { BuiltinRegexWorkspace } from './BuiltinRegexWorkspace'

export function WorkspaceView({ module }: { module: ModuleDefinition }): JSX.Element {
  const { t, lang } = useI18n()
  const modPath = useAppStore((s) => s.modPath)
  const docs = useAppStore((s) => s.docs)
  const discoveredModules = useAppStore((s) => s.modules)
  const selectedId = useAppStore((s) => s.selectedId[module.id] ?? null)
  const select = useAppStore((s) => s.select)
  const editData = useAppStore((s) => s.editData)
  const saveModule = useAppStore((s) => s.saveModule)
  const setStatus = useAppStore((s) => s.setStatus)
  const fixWorkspace = useAppStore((s) => s.fixWorkspace)
  const ensureModuleDocs = useAppStore((s) => s.ensureModuleDocs)
  const primaryLang = useAppStore((s) => s.primaryLang[module.id])
  const setPrimaryLang = useAppStore((s) => s.setPrimaryLang)
  const primaryDocPath = useAppStore((s) => s.primaryDocPath[module.id])
  const setPrimaryDoc = useAppStore((s) => s.setPrimaryDoc)
  const importDoc = useAppStore((s) => s.importDoc)
  const removeDoc = useAppStore((s) => s.removeDoc)
  const rules = useRegexRules()

  const primaryDocs = useMemo(
    () => Object.values(docs).filter((d) => d.bindings[module.id]?.kind === 'primary'),
    [docs, module.id]
  )
  const toolsModule = module.id === 'cardname' || module.id === 'cardability' || module.id === 'passiveability' || module.id === 'effecttext'
  const noBrief = module.id === 'cardname' || module.id === 'cardability' || module.id === 'passiveability' || module.id === 'effecttext' || module.id === 'bookstory'
  const localizeDocs = useMemo(
    () => Object.values(docs).filter((d) => d.bindings[module.id]?.kind === 'localize'),
    [docs, module.id]
  )
  const preferredDocLang = editorLangToDocLang(lang)
  const dataDoc =
    primaryLang === '__none__'
      ? undefined
      : primaryDocs.find((d) => d.path === primaryDocPath) ??
        primaryDocs.find((d) => d.lang === primaryLang) ??
        primaryDocs.find((d) => d.lang === preferredDocLang) ??
        primaryDocs.find((d) => d.lang === 'cn') ??
        primaryDocs[0]

  const nameLang = useAppStore((s) => s.primaryLang['cardname'])
  const localizedNames = useMemo(() => {
    if (module.id !== 'cardinfo') return undefined
    if (nameLang === '__none__') return {}
    const schema = { root: 'BattleCardDescRoot', containerPath: ['cardDescList'], entity: 'BattleCardDesc', idAttr: 'ID', fields: [] }
    const nameDocs = Object.values(docs).filter((d) => d.bindings['cardname']?.kind === 'primary')
    const doc = nameDocs.find((d) => d.lang === nameLang) ?? nameDocs.find((d) => d.lang === 'cn') ?? nameDocs[0]
    if (!doc) return {}
    const map: Record<string, string> = {}
    for (const r of listEntities(doc.doc, schema)) {
      const n = getTextField(r.node, 'LocalizedName')
      if (n) map[r.id] = n
    }
    return map
  }, [module.id, docs, nameLang])
  const abilityLocalized = useMemo(() => {
    if (module.id !== 'cardability' || !dataDoc) return undefined
    const map: Record<string, string> = {}
    for (const r of listEntities(dataDoc.doc, module.entity)) {
      const d = getAllText(r.node, 'Desc')
      if (d) map[r.id] = d
    }
    return map
  }, [module.id, dataDoc, module.entity])

  const abilityLocalizedRender = useMemo(() => {
    if (!abilityLocalized) return undefined
    return (id: string): ReactNode => (
      <>
        <div className="text-[10px] leading-tight text-muted-foreground/60">{id}</div>
        <div className="whitespace-pre-wrap text-xs leading-snug text-foreground/90">{abilityLocalized[id] ? <RegexText text={abilityLocalized[id]} rules={rules} /> : t('empty')}</div>
      </>
    )
  }, [abilityLocalized, rules, t])

  const accentLookup = useMemo(() => {
    const sourceId = module.entity.accentFromModuleId
    if (!sourceId) return undefined
    const sourceModule = discoveredModules.find((m) => m.id === sourceId)
    const map = new Map<string, string>()
    for (const d of Object.values(docs)) {
      if (!sourceModule || d.bindings[sourceId]?.kind !== 'primary') continue
      for (const r of listEntities(d.doc, sourceModule.entity)) {
        const c = cardAccent(r.node)
        if (c) map.set(r.id, c)
      }
    }
    return (id: string) => map.get(id)
  }, [module.entity.accentFromModuleId, docs, discoveredModules])
  const refs = useMemo(() => (dataDoc ? listEntities(dataDoc.doc, module.entity) : []), [dataDoc, module.entity])
  const displayDoc = (dataDoc?.doc ?? []) as OrderedDoc
  const entity = refs.find((r) => r.id === selectedId) ?? null
  const issues = dataDoc?.bindings[module.id]?.issues ?? []
  const dirtyCount = useMemo(
    () => Object.values(docs).filter((d) => d.bindings[module.id] && d.dirty).length,
    [docs, module.id]
  )

  const dependencyIds = useMemo(
    () =>
      [module.entity.accentFromModuleId, module.preview?.nameWorkspaceId, module.preview?.abilityWorkspaceId].filter(
        (id): id is string => Boolean(id)
      ),
    [module.entity.accentFromModuleId, module.preview]
  )
  useEffect(() => {
    void ensureModuleDocs(module.id)
  }, [module.id, ensureModuleDocs])

  useEffect(() => {
    for (const id of dependencyIds) void ensureModuleDocs(id)
  }, [dependencyIds, ensureModuleDocs])

  const isEffectText = module.id === 'effecttext'
  const isPassive = module.id === 'passive'
  const isBookStory = module.id === 'bookstory'
  const [viewMode, setViewMode] = useState<'brief' | 'detail' | 'source'>('detail')
  const [toolsOpen, setToolsOpen] = useState(false)
  const rightCol = '360px'
  const leftCol = module.entity.idOnlyList ? `max(300px, ${Math.min(480, Math.max(...refs.map((r) => r.id.length), 1) * 8 + 48)}px)` : '280px'

  if (!modPath) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-sm text-muted-foreground">
        {t('pickMod')}
      </div>
    )
  }

  if (module.builtinImages) return <BuiltinImageWorkspace module={module} />

  if (module.builtinRegex) return <BuiltinRegexWorkspace module={module} />

  if (module.resource) return <ImageWorkspace module={module} />

  const nextId = (): string => {
    const nums = refs.map((r) => Number(r.id)).filter((n) => Number.isFinite(n))
    const max = nums.length ? Math.max(...nums) : 0
    return String(max + 1)
  }

  const addEntity = () => {
    const id = nextId()
    editData(module.id, (doc) => {
      const node = createEntity(module.entity, id)
      insertEntity(doc, module.entity, node)
    })
    select(module.id, id)
    setStatus(`已新增记录 #${id}`, 'success')
  }

  const duplicateEntity = () => {
    if (!entity) return
    const id = nextId()
    editData(module.id, (doc) => {
      const cur = listEntities(doc, module.entity).find((r) => r.id === entity.id)
      if (!cur) return
      const node = structuredClone(cur.node)
      setAttr(node, module.entity.idAttr, id)
      insertEntity(doc, module.entity, node, cur.index + 1)
    })
    select(module.id, id)
    setStatus(`已复制为 #${id}`, 'success')
  }

  const deleteEntity = () => {
    if (!entity) return
    const idx = refs.findIndex((r) => r.id === entity.id)
    editData(module.id, (doc) => {
      const cur = listEntities(doc, module.entity).find((r) => r.id === entity.id)
      if (cur) removeEntity(doc, module.entity, cur.index)
    })
    select(module.id, refs[Math.max(0, idx - 1)]?.id ?? null)
    setStatus('已删除记录（可撤销）', 'info')
  }

  const move = (delta: -1 | 1) => {
    if (!entity) return
    editData(module.id, (doc) => {
      const refs = listEntities(doc, module.entity)
      const from = refs.findIndex((r) => r.id === entity.id)
      const to = from + delta
      if (from < 0 || to < 0 || to >= refs.length) return
      moveEntity(doc, module.entity, refs[from].index, refs[to].index)
    })
  }

  const onFieldChange = (field: FieldDef, value: unknown) => {
    if (!entity) return
    editData(module.id, (doc) => {
      const cur = listEntities(doc, module.entity).find((r) => r.id === entity.id)
      if (cur) setFieldValue(cur.node, field, value)
    })
  }

  const onIdChange = (id: string) => {
    if (!entity) return
    editData(module.id, (doc) => {
      const cur = listEntities(doc, module.entity).find((r) => r.id === entity.id)
      if (cur) setAttr(cur.node, module.entity.idAttr, id)
    })
    select(module.id, id)
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
            <WorkspaceToolbar
        primaryDocs={primaryDocs}
        primaryLang={primaryLang}
        primaryDocPath={primaryDocPath}
        onPrimaryDoc={(v) => {
          if (v === '__none__') {
            setPrimaryLang(module.id, '__none__')
            setPrimaryDoc(module.id, '')
            return
          }
          const d = primaryDocs.find((x) => x.path === v)
          if (d) {
            setPrimaryDoc(module.id, d.path)
            setPrimaryLang(module.id, d.lang ?? d.path)
          }
        }}
        onImportDoc={() => void importDoc(module.id)}
        onRemoveDoc={() => {
          const p = primaryDocPath ?? dataDoc?.path
          if (p) removeDoc(module.id, p)
        }}
        removeDisabled={!dataDoc}
        viewMode={viewMode}
        onViewMode={setViewMode}
        noBrief={noBrief}
        noSource={false}
        refsCount={refs.length}
        issuesCount={issues.length}
        dirtyCount={dirtyCount}
        addDisabled={!dataDoc}
        duplicateDisabled={!entity || !dataDoc}
        deleteDisabled={!entity || !dataDoc}
        moveDisabled={!entity || !dataDoc}
        onAdd={addEntity}
        onDuplicate={duplicateEntity}
        onDelete={deleteEntity}
        onMoveUp={() => move(-1)}
        onMoveDown={() => move(1)}
        onFix={() => fixWorkspace(module.id)}
        onSave={() => saveModule(module.id)}
        fixDisabled={false}
      />
<div
        className="grid min-h-0 flex-1"
        style={{
          gridTemplateColumns: toolsModule || isPassive || isBookStory ? `${leftCol} minmax(0, 1fr)` : `${leftCol} minmax(420px, 1fr) ${rightCol}`
        }}
      >
        {module.id === 'effecttext' ? (
          <EffectTextListPanel doc={displayDoc} schema={module.entity} selectedId={selectedId} onSelect={(id) => select(module.id, id)} />
        ) : (
          <DataPanel key={dataDoc?.path ?? 'none'} doc={displayDoc} schema={module.entity} selectedId={selectedId} onSelect={(id) => select(module.id, id)} accentLookup={accentLookup} localizedNames={localizedNames} localizedRender={abilityLocalizedRender} scrollKey={module.id} />
        )}
        <div className="flex h-full min-h-0 min-w-0 flex-col">
          <div className="min-h-0 flex-1 overflow-hidden">
            {viewMode === 'brief' ? (
              entity ? (
                module.id === 'cardinfo' ? (
                  <CardBriefPanel module={module} entity={entity} onFieldChange={onFieldChange} onIdChange={onIdChange} />
                ) : (
                  <SummaryPanel module={module} entity={entity} onFieldChange={onFieldChange} onIdChange={onIdChange} />
                )
              ) : (
                <div className="flex items-center justify-center text-sm text-muted-foreground">请选择一条记录</div>
              )
            ) : viewMode === 'source' ? (
              <SourcePanel module={module} entity={entity} />
            ) : entity ? (
              <FormPanel module={module} entity={entity} issues={issues} onFieldChange={onFieldChange} onIdChange={onIdChange} />
            ) : (
              <div className="flex items-center justify-center text-sm text-muted-foreground">请选择一条记录</div>
            )}
          </div>
          {module.id === 'cardname' || module.id === 'cardability' || module.id === 'effecttext' || module.id === 'passiveability' ? <ProofPanel moduleId={module.id} /> : null}
        </div>
        {!toolsModule && !isPassive && !isBookStory ? (
          <div className="h-full min-h-0 min-w-0 border-l border-border bg-card">
            {module.preview ? (
              <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
                <PreviewPanel modPath={modPath} module={module} entity={entity} />
              </div>
            ) : localizeDocs.length > 0 ? (
              <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
                <LocalizePanel module={module} localizeDocs={localizeDocs} selectedId={selectedId} dataName={entity ? String(requireName(entity, module.entity.displayField ?? 'Name')) : ''} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
                此工作区没有预览或本地化区
              </div>
            )}
          </div>
        ) : null}
      </div>
      {toolsModule ? (
        <ToolDrawer open={toolsOpen} onToggle={() => setToolsOpen((v) => !v)}>
          {module.id === 'cardability' ? <CardAbilityTools /> : module.id === 'cardname' ? <CardNameTools /> : module.id === 'effecttext' ? <EffectTextTools /> : <PassiveAbilityTools />}
        </ToolDrawer>
      ) : null}
    </div>
  )
}

function requireName(entity: { node: any }, field: string): string {
  return getTextField(entity.node, field) ?? ''
}

