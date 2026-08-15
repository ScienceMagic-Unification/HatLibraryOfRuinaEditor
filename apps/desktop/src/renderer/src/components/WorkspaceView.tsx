import { useMemo, useState } from 'react'
import type { FieldDef, ModuleDefinition, OrderedDoc } from '@ruina/editor-core'
import { createEntity, getTextField, insertEntity, listEntities, moveEntity, removeEntity, setAttr, setFieldValue } from '@ruina/editor-core'
import { Badge, Button, Select } from '@ruina/ui'
import { ArrowDown, ArrowUp, ChevronsLeft, ChevronsRight, Copy, FileCode2, Languages, LayoutList, PenLine, Plus, Save, Trash2, Wrench } from 'lucide-react'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'
import { cardAccent } from '../lib/cardAccent'
import { DataPanel } from './DataPanel'
import { FormPanel } from './FormPanel'
import { SummaryPanel } from './SummaryPanel'
import { SourcePanel } from './SourcePanel'
import { LocalizePanel } from './LocalizePanel'
import { PreviewPanel } from './PreviewPanel'
import { CardNameTools } from './CardNameTools'
import { ProofPanel } from './ProofPanel'
import { CardBriefPanel } from './CardBriefPanel'
import { CardAbilityTools } from './CardAbilityTools'
import { ImageWorkspace } from './ImageWorkspace'

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
  const primaryLang = useAppStore((s) => s.primaryLang[module.id])
  const setPrimaryLang = useAppStore((s) => s.setPrimaryLang)

  const primaryDocs = useMemo(
    () => Object.values(docs).filter((d) => d.bindings[module.id]?.kind === 'primary'),
    [docs, module.id]
  )
  const toolsModule = module.id === 'cardname' || module.id === 'cardability'
  const localizeDocs = useMemo(
    () => Object.values(docs).filter((d) => d.bindings[module.id]?.kind === 'localize'),
    [docs, module.id]
  )
  const dataDoc = primaryLang === '__none__' ? undefined : primaryDocs.find((d) => d.lang === primaryLang) ?? primaryDocs[0]

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

  const [viewMode, setViewMode] = useState<'brief' | 'detail' | 'source'>('detail')
  const [toolsOpen, setToolsOpen] = useState(false)
  const rightCol = toolsModule ? (toolsOpen ? '360px' : '40px') : '360px'

  if (!modPath) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 text-sm text-muted-foreground">
        {t('pickMod')}
      </div>
    )
  }

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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2">
        <div className="flex gap-1">
          <Button size="sm" variant="secondary" onClick={addEntity} disabled={!dataDoc}>
            <Plus /> {t('add')}
          </Button>
          <Button size="sm" variant="secondary" onClick={duplicateEntity} disabled={!entity || !dataDoc}>
            <Copy /> {t('duplicate')}
          </Button>
          <Button size="sm" variant="secondary" onClick={deleteEntity} disabled={!entity || !dataDoc}>
            <Trash2 /> {t('delete')}
          </Button>
        </div>
        <div className="mx-1 h-5 w-px bg-border" />
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="size-7" title={t('moveUp')} onClick={() => move(-1)} disabled={!entity || !dataDoc}>
            <ArrowUp />
          </Button>
          <Button size="icon" variant="ghost" className="size-7" title={t('moveDown')} onClick={() => move(1)} disabled={!entity || !dataDoc}>
            <ArrowDown />
          </Button>
        </div>
        {primaryDocs.length > 1 ? (
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-1.5 py-1">
            <span className="text-[10px] text-muted-foreground">{t('doc')}</span>
            <Select.Root value={primaryLang ?? dataDoc?.lang ?? ''} onValueChange={(v) => setPrimaryLang(module.id, v)}>
              <Select.Trigger className="h-7 w-32 text-xs">
                <Select.Value placeholder="选择文档" />
              </Select.Trigger>
              <Select.Content>
                {primaryDocs.map((d) => (
                  <Select.Item key={d.path} value={d.lang ?? d.path}>
                    {d.langLabel ?? d.lang ?? (d.path.split('\\').pop() as string)}
                  </Select.Item>
                ))}
                <Select.Item value="__none__">{t('none')}</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>
        ) : null}
        <div className="flex-1" />
        <div className="flex rounded-lg border border-border bg-muted p-0.5">
          {(
            [
              { id: 'brief', label: t('brief'), icon: LayoutList },
              { id: 'detail', label: t('detail'), icon: PenLine },
              { id: 'source', label: t('source'), icon: FileCode2 }
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setViewMode(m.id)}
              disabled={toolsModule && m.id === 'brief'}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === m.id ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <m.icon className="size-3.5" />
              {m.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {refs.length} {t('entries')} · {t('issues')} {issues.length}
        </span>
        {dirtyCount > 0 ? (
          <Badge variant="warning">{t('unsaved', { n: dirtyCount })}</Badge>
        ) : (
          <Badge variant="success">{t('saved')}</Badge>
        )}
        <Button size="sm" variant="secondary" onClick={() => void fixWorkspace(module.id)} title="按 XML 规则与特殊规则校验并修复当前工作区">
          <Wrench /> {t('fix')}
        </Button>
        <Button size="sm" onClick={() => saveModule(module.id)} disabled={dirtyCount === 0}>
          <Save /> {t('saveModule')}
        </Button>
      </div>
      <div
        className="grid min-h-0 flex-1"
        style={{
          gridTemplateColumns: `${module.entity.idOnlyList ? `max(300px, ${Math.min(480, Math.max(...refs.map((r) => r.id.length), 1) * 8 + 48)}px)` : '280px'} minmax(420px, 1fr) ${rightCol}`
        }}
      >
        <DataPanel doc={displayDoc} schema={module.entity} selectedId={selectedId} onSelect={(id) => select(module.id, id)} accentLookup={accentLookup} localizedNames={localizedNames} />
        <div className="flex h-full min-h-0 min-w-0 flex-col">
          <div className="min-h-0 flex-1 overflow-hidden">
            {viewMode === 'brief' ? (
              entity ? (
                module.id === 'cardinfo' ? (
                  <CardBriefPanel module={module} entity={entity} onFieldChange={onFieldChange} onIdChange={onIdChange} />
                ) : (
                  <SummaryPanel module={module} entity={entity} onFieldChange={onFieldChange} />
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
          {module.id === 'cardname' || module.id === 'cardability' ? <ProofPanel moduleId={module.id} /> : null}
        </div>
        <div className={`h-full min-h-0 min-w-0 ${toolsModule && !toolsOpen ? '' : 'border-l border-border bg-card'}`}>
          {toolsModule ? (
            <div className="relative h-full min-h-0">
              {toolsOpen ? (
                <div className="h-full min-h-0 overflow-y-auto overscroll-contain pl-8">
                  {module.id === 'cardability' ? <CardAbilityTools /> : <CardNameTools />}
                </div>
              ) : null}
              <button
                className="absolute left-0 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 rounded-r-md border border-l-0 border-border bg-secondary px-1.5 py-3 text-xs text-muted-foreground shadow hover:bg-accent"
                onClick={() => setToolsOpen((v) => !v)}
              >
                {toolsOpen ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
                {!toolsOpen ? <span className="[writing-mode:vertical-rl]">{t('tools')}</span> : null}
              </button>
            </div>
          ) : module.id === 'cardability' ? (
            <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
              <CardAbilityTools />
            </div>
          ) : module.id === 'cardname' ? (
            <div className="h-full min-h-0 overflow-y-auto overscroll-contain">
              <CardNameTools />
            </div>
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
      </div>
    </div>
  )
}

function requireName(entity: { node: any }, field: string): string {
  return getTextField(entity.node, field) ?? ''
}

