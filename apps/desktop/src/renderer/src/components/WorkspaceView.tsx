import { useRowGroups } from './RowGroups'
import { AnnotationBar } from './Annotations'
import { supportsTags, useTagNavigation } from '../lib/annotations'
import { entitySchemaForRow, localizedIndex, rowKey, sameLanguageSources, sourceGroup, type ListRow } from '../lib/localizationSources'
import { SourceChooser } from './SourceChooser'
import { SchemaPreview } from './SchemaPreview'
import { DocumentFields } from './DocumentFields'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { EntitySchema, FieldDef, ModuleDefinition, OrderedDoc } from '@ruina/editor-core'
import { createEntity, getAllText, getFieldValue, getRootChildren, getTextField, insertEntity, listEntities, makeElement, moveEntity, removeEntity, setAttr, setFieldValue } from '@ruina/editor-core'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'
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
import { PageArtworkWorkspace } from './PageArtworkWorkspace'
import { BuiltinImageWorkspace } from './BuiltinImageWorkspace'
import { BuiltinRegexWorkspace } from './BuiltinRegexWorkspace'
import { SingularityAbilitiesWorkspace } from './SingularityAbilitiesWorkspace'
import { VanillaAbilitiesWorkspace } from './VanillaAbilitiesWorkspace'
import { CorePageForm } from './CorePageForm'
import { CorePagePreview } from './CorePagePreview'
import { isCorePage } from '../lib/corePages'
import { selectPrimaryDocument } from '../lib/documentSelection'

export function WorkspaceView({ module }: { module: ModuleDefinition }): JSX.Element {
  const { t } = useI18n()
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
  const dirtyEntities = useAppStore((s) => s.dirtyEntities)
  const markEntitiesDirty = useAppStore((s) => s.markEntitiesDirty)


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
  const preferredDocLang = 'cn'
  const dataDoc = selectPrimaryDocument(docs, module.id, primaryLang, primaryDocPath, preferredDocLang)

  const [combinedGroup, setCombinedGroup] = useState<string | null>(null)
  const [choosingSource, setChoosingSource] = useState(false)
  const groups = useMemo(() => {
    const groups = new Map<string, typeof primaryDocs>()
    for (const d of primaryDocs) {
      if (!d.bindings[module.id]?.locDef) continue
      const key = sourceGroup(d)
      const group = groups.get(key) ?? []
      group.push(d)
      groups.set(key, group)
    }
    return groups
  }, [primaryDocs, module.id])
  const group = combinedGroup && dataDoc && sourceGroup(dataDoc) === combinedGroup ? groups.get(combinedGroup) : undefined
  const combined = group && group.length > 1 ? group : undefined
  const combinedRows = useMemo(() => combined?.flatMap((d) => listEntities(d.doc, module.entity).map((r) => ({ ...r, source: d.path }))), [combined, module.entity])
  const refs = useMemo(() => (dataDoc ? listEntities(dataDoc.doc, module.entity) : []), [dataDoc, module.entity])
  const listRows = useMemo(() => {
    if (combinedRows) return combinedRows
    if (!dataDoc || refs.length === new Set(refs.map((r) => r.id)).size) return undefined
    return refs.map((r) => ({ ...r, source: dataDoc.path }))
  }, [combinedRows, refs, dataDoc])
  const dirtyIds = useMemo(() => {
    const marked = new Set(dirtyEntities[module.id] ?? [])
    const keys = new Set<string>()
    const rows: ListRow[] = listRows ?? refs
    for (const row of rows) {
      const path = row.source ?? dataDoc?.path
      if (path && docs[path]?.dirty && marked.has(JSON.stringify([path, row.id]))) keys.add(rowKey(row))
    }
    return keys
  }, [listRows, refs, docs, dataDoc, dirtyEntities, module.id])
  const [rowSelection, setRowSelection] = useState('')
  const grouping = useRowGroups(module, dataDoc?.path ?? '', listRows ?? refs, combined,
    Boolean(dataDoc && !dataDoc.bindings[module.id]?.locDef && !module.readonly), (r) => setRowSelection(rowKey(r)))
  const selectedRow = listRows?.find((r) => r.source === dataDoc?.path && r.id === selectedId && rowKey(r) === rowSelection)
    ?? listRows?.find((r) => r.source === dataDoc?.path && r.id === selectedId)
  const selectRow = (key: string) => {
    setRowSelection(key)
    const row = listRows?.find((r) => rowKey(r) === key)
    if (row) setPrimaryDoc(module.id, row.source)
    select(module.id, row?.id ?? key)
  }
  const selectedKey = selectedRow ? rowKey(selectedRow) : selectedId
  const namePath = useAppStore((s) => s.primaryDocPath.cardname)
  const nameLang = useAppStore((s) => s.primaryLang['cardname'])
  const localizedNames = useMemo(() => {
    if (module.id !== 'cardinfo') return undefined
    if (nameLang === '__none__') return {}
    const schema = { root: 'BattleCardDescRoot', containerPath: ['cardDescList'], entity: 'BattleCardDesc', idAttr: 'ID', fields: [] }
    const nameDocs = Object.values(docs).filter((d) => d.bindings['cardname']?.kind === 'primary')
    const map: Record<string, string> = {}
    for (const [id, { ref }] of localizedIndex(sameLanguageSources(nameDocs, nameLang, namePath), schema)) {
      const name = getTextField(ref.node, 'LocalizedName')
      if (name) map[id] = name
    }
    return map
  }, [module.id, docs, nameLang, namePath])

  const abilityLocalizedRender = useMemo(() => {
    if (module.id !== 'cardability') return undefined
    return (id: string, row: ListRow): ReactNode => {
      const desc = getAllText(row.node, 'Desc')
      return <><div className="break-all font-mono text-xs leading-5 text-muted-foreground">{id}</div>
        <div className="whitespace-pre-wrap text-xs leading-snug text-foreground/90">{desc ? <RegexText text={desc} rules={rules} /> : t('empty')}</div></>
    }
  }, [module.id, rules, t])

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
  const displayDoc = (dataDoc?.doc ?? []) as OrderedDoc
  const entity = selectedRow ?? refs.find((r) => r.id === selectedId) ?? null
  const canTag = supportsTags(module.id)
  const tagTarget = useMemo(() => {
    if (!canTag || !entity || !dataDoc) return null
    const ordinal = refs.filter((r) => r.id === entity.id).findIndex((r) => r.node === entity.node)
    return { moduleId: module.id, path: dataDoc.path, id: entity.id, ordinal }
  }, [module.id, canTag, entity, refs, dataDoc])
  const tagFocus = useTagNavigation((s) => s.focus)
  useEffect(() => {
    if (!tagFocus || tagFocus.moduleId !== module.id || tagFocus.path !== dataDoc?.path) return
    const row = refs.filter((r) => r.id === tagFocus.id)[tagFocus.ordinal]
    if (row) setRowSelection(rowKey({ ...row, source: tagFocus.path }))
    useTagNavigation.setState({ focus: null })
  }, [tagFocus, module.id, dataDoc?.path, refs])
  const issues = dataDoc?.bindings[module.id]?.issues ?? []
  const dirtyCount = useMemo(
    () => Object.values(docs).filter((d) => d.bindings[module.id] && d.dirty).length,
    [docs, module.id]
  )

  const dependencyIds = useMemo(
    () =>
      [module.entity.accentFromModuleId, module.preview?.nameWorkspaceId, module.preview?.abilityWorkspaceId, isCorePage(module.id) ? 'bookstory' : undefined].filter(
        (id): id is string => Boolean(id)
      ),
    [module.id, module.entity.accentFromModuleId, module.preview]
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
  const leftCol = module.entity.idOnlyList ? 'clamp(300px, 28vw, 480px)' : '280px'

  if (!modPath) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-sm text-muted-foreground">
        {t('pickMod')}
      </div>
    )
  }

  if (module.builtinImages) return <BuiltinImageWorkspace module={module} />

  if (module.builtinRegex) return <BuiltinRegexWorkspace module={module} />
  if (module.id === 'vanilla-passives' || module.id === 'vanilla-abilities' || module.id === 'vanilla-cards') return <VanillaAbilitiesWorkspace key={module.id} kind={module.id === 'vanilla-passives' ? 'passive' : module.id === 'vanilla-cards' ? 'card' : 'ability'}/>
  if (module.id === 'singularity-abilities') return <SingularityAbilitiesWorkspace />

  if (module.id === 'page-artwork') return <PageArtworkWorkspace module={module}/>
  if (module.resource) return <ImageWorkspace module={module} />

  const nextId = (): string => {
    const nums = (combinedRows ?? refs).map((r) => Number(r.id)).filter((n) => Number.isFinite(n))
    const max = nums.length ? Math.max(...nums) : 0
    return String(max + 1)
  }

  const effectTextInsertSchema = (): EntitySchema => ({
    root: module.entity.root,
    entity: 'BattleEffectText',
    idAttr: module.entity.idAttr,
    containerPath: ['effectTextList'],
    fields: module.entity.fields
  })

  const ensureEffectTextList = (doc: OrderedDoc): void => {
    const rootChildren = getRootChildren(doc, module.entity.root)
    const exists = rootChildren.some((c) => c && typeof c === 'object' && !Array.isArray(c) && Object.keys(c as Record<string, unknown>)[0] === 'effectTextList')
    if (!exists) rootChildren.push(makeElement('effectTextList'))
  }

  const addEntity = (path?: string) => {
    if (combined && !path) { setChoosingSource(true); return }
    if (path) setPrimaryDoc(module.id, path)
    setChoosingSource(false)
    const id = nextId()
    if (module.id === 'effecttext') {
      editData(module.id, (doc) => {
        ensureEffectTextList(doc)
        const schema = effectTextInsertSchema()
        insertEntity(doc, schema, createEntity(schema, id))
      })
    } else {
      editData(module.id, (doc) => {
        const node = createEntity(module.entity, id)
        insertEntity(doc, module.entity, node)
      })
    }
    select(module.id, id)
    markEntitiesDirty(module.id, [id])
    setStatus(`已新增记录 #${id}`, 'success')
  }

  const duplicateEntity = () => {
    if (!entity) return
    const id = nextId()
    editData(module.id, (doc) => {
      const schema = entitySchemaForRow(module.entity, entity)
      const node = structuredClone(entity.node)
      setAttr(node, schema.idAttr, id)
      insertEntity(doc, schema, node, entity.index + 1)
    })
    select(module.id, id)
    markEntitiesDirty(module.id, [id])
    setStatus(`已复制为 #${id}`, 'success')
  }

  const deleteEntity = () => {
    if (!entity) return
    const idx = refs.findIndex((r) => r.node === entity.node)
    editData(module.id, (doc) => {
      removeEntity(doc, entitySchemaForRow(module.entity, entity), entity.index)
    })
    select(module.id, refs[idx - 1]?.id ?? refs[idx + 1]?.id ?? null)
    setStatus('已删除记录（可撤销）', 'info')
  }

  const move = (delta: -1 | 1) => {
    if (!entity) return
    editData(module.id, (doc) => {
      const schema = entitySchemaForRow(module.entity, entity)
      const rows = listEntities(doc, schema)
      const next = rows[rows.findIndex((r) => r.index === entity.index) + delta]
      if (next) {
        moveEntity(doc, schema, entity.index, next.index)
        if (dataDoc) setRowSelection(rowKey({ ...entity, source: dataDoc.path, index: next.index }))
      }
    })
  }

  const onFieldChange = (field: FieldDef, value: unknown) => {
    if (!entity) return
    editData(module.id, (doc) => {
      const cur = listEntities(doc, entitySchemaForRow(module.entity, entity)).find((r) => r.index === entity.index && r.id === entity.id)
      if (cur) setFieldValue(cur.node, field, value)
    })
  }

  const onIdChange = (id: string): boolean => {
    if (!entity || !dataDoc || !id.trim()) return false
    if (id === entity.id) return true
    if (listEntities(dataDoc.doc, module.entity).some((r) => r.id === id)) {
      setStatus(t('id.duplicate', { id }))
      return false
    }
    editData(module.id, (doc) => {
      const cur = listEntities(doc, entitySchemaForRow(module.entity, entity)).find((r) => r.index === entity.index && r.id === entity.id)
      if (cur) setAttr(cur.node, module.entity.idAttr, id)
    })
    select(module.id, id)
    markEntitiesDirty(module.id, [id])
    return true
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <WorkspaceToolbar
        combinedGroups={Array.from(groups).filter(([, files]) => files.length > 1).map(([value, [first]]) => ({
          value, label: [t('doc.combined'), first.langLabel ?? first.lang, first.root === 'CharactersNameRoot' ? first.path.split(/[\\/]/).slice(-2)[0] : undefined].filter(Boolean).join(' · ')
        }))}
        combinedValue={combined ? combinedGroup ?? undefined : undefined}
        primaryDocs={primaryDocs}
        primaryLang={primaryLang}
        primaryDocPath={primaryDocPath}
        onPrimaryDoc={(v) => {
          setChoosingSource(false)
          const group = groups.get(v)
          setCombinedGroup(group ? v : null)
          if (v === '__none__') {
            setPrimaryLang(module.id, '__none__')
            setPrimaryDoc(module.id, '')
            return
          }
          const d = group?.find((x) => x.path === primaryDocPath) ?? group?.[0] ?? primaryDocs.find((x) => x.path === v)
          if (d) {
            setPrimaryDoc(module.id, d.path)
            setPrimaryLang(module.id, d.lang ?? d.path)
            const targetRefs = listEntities(d.doc, module.entity)
            if (!targetRefs.some((r) => r.id === selectedId)) select(module.id, targetRefs[0]?.id ?? null)
          }
        }}
        onImportDoc={() => void importDoc(module.id)}
        onRemoveDoc={() => {
          const p = primaryDocPath ?? dataDoc?.path
          if (p) removeDoc(module.id, p)
        }}
        removeDisabled={!dataDoc || Boolean(combined)}
        viewMode={viewMode}
        onViewMode={setViewMode}
        noBrief={noBrief}
        noSource={false}
        refsCount={(combinedRows ?? refs).length}
        issuesCount={combined ? combined.reduce((n, d) => n + d.bindings[module.id].issues.length, 0) : issues.length}
        dirtyCount={dirtyCount}
        addDisabled={!dataDoc}
        duplicateDisabled={!entity || !dataDoc}
        deleteDisabled={!entity || !dataDoc}
        moveDisabled={!entity || !dataDoc}
        onAdd={() => addEntity()}
        onDuplicate={duplicateEntity}
        onDelete={deleteEntity}
        onMoveUp={() => move(-1)}
        onMoveDown={() => move(1)}
        onFix={() => fixWorkspace(module.id)}
        onSave={() => saveModule(module.id)}
        fixDisabled={false}
      />
      {choosingSource && combined && <SourceChooser paths={combined.map((d) => d.path)} onChoose={addEntity} onCancel={() => setChoosingSource(false)}/>}
      <div
        className="grid min-h-0 flex-1"
        style={{
          gridTemplateColumns: toolsModule || isPassive || isBookStory ? `${leftCol} minmax(0, 1fr)` : `${leftCol} minmax(420px, 1fr) ${rightCol}`
        }}
      >
        {module.id === 'effecttext' ? (
          <EffectTextListPanel grouping={grouping} doc={displayDoc} schema={module.entity} rows={listRows} selectedId={selectedKey} onSelect={selectRow} dirtyIds={dirtyIds} />
        ) : (
          <DataPanel grouping={grouping} annotationModule={canTag ? module.id : undefined} annotationPath={dataDoc?.path} key={'list:' + (combined ? combinedGroup : dataDoc?.path ?? 'none')} doc={displayDoc} schema={module.entity} rows={listRows} selectedId={selectedKey} onSelect={selectRow} accentLookup={accentLookup} localizedNames={localizedNames} localizedRender={abilityLocalizedRender} scrollKey={module.id} dirtyIds={dirtyIds} />
        )}
        <div key={'detail:' + (dataDoc?.path ?? module.id)} className="flex h-full min-h-0 min-w-0 flex-col">
          {tagTarget && <AnnotationBar target={tagTarget}/>}
          {dataDoc ? <DocumentFields module={module} path={dataDoc.path}/> : null}
          <div className="min-h-0 flex-1 overflow-hidden">
            {viewMode === 'brief' ? (
              entity ? (
                isCorePage(module.id) ? (
                  <CorePageForm module={module} entity={entity} brief issues={issues} onFieldChange={onFieldChange} onIdChange={onIdChange}/>
                ) : module.id === 'cardinfo' ? (
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
              isCorePage(module.id) ? <CorePageForm module={module} entity={entity} issues={issues} onFieldChange={onFieldChange} onIdChange={onIdChange}/> : <FormPanel module={module} entity={entity} issues={issues} onFieldChange={onFieldChange} onIdChange={onIdChange} />
            ) : (
              <div className="flex items-center justify-center text-sm text-muted-foreground">请选择一条记录</div>
            )}
          </div>
          {module.id === 'cardname' || module.id === 'cardability' || module.id === 'effecttext' || module.id === 'passiveability' ? <ProofPanel moduleId={module.id} /> : null}
        </div>
        {!toolsModule && !isPassive && !isBookStory ? (
          <div className="h-full min-h-0 min-w-0 border-l border-border bg-card">
            {isCorePage(module.id) ? (
              <div className="h-full overflow-y-auto"><CorePagePreview module={module} entity={entity}/></div>
            ) : module.overview ? (
              <SchemaPreview module={module} entity={entity}/>
            ) : module.preview ? (
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

