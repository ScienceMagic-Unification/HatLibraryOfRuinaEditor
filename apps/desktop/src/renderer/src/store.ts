import { create } from 'zustand'
import {
  SnapshotHistory,
  findRootName,
  fixDuplicateIds,
  getFieldValue,
  getMulti,
  getTextField,
  removeField,
  setFieldValue,
  setTextField,
  inferEntitySchema,
  listEntities,
  parseXml,
  serializeXml,
  validateEntities,
  type EntityRef,
  type EntitySchema,
  type LocalizationRootDef,
  type ModuleDefinition,
  type OrderedDoc,
  type ValidationIssue
} from '@ruina/editor-core'
import { modules as registryModules, singularityModules } from '@ruina/schemas'
import { api, type DiscoveryResult, type FileInfo, type ModInfo } from './api'
import { detectLang, editorLangToDocLang } from './lib/lang'
import { joinPath } from './lib/path'

export interface DiscoveredDataFile {
  path: string
  name: string
  size: number
  root: string | null
}

export interface DiscoveredLocalizeFile {
  path: string
  root: string | null
  lang: string
  label: string
}

export interface DocBinding {
  kind: 'primary' | 'localize'
  locDef?: LocalizationRootDef
  issues: ValidationIssue[]
}

export interface DocState {
  path: string
  doc: OrderedDoc
  dirty: boolean
  rev: number
  history: SnapshotHistory
  lastSavedText?: string
  loadError?: string
  root: string | null
  lang?: string
  langLabel?: string
  /** 同一个文件可被多个工作区共享（例如卡牌名称同时出现在 CardInfo 的本地化区） */
  bindings: Record<string, DocBinding>
}

interface AppState {
  ready: boolean
  steamPath: string | null
  gamePath: string | null
  mods: ModInfo[]
  modPath: string | null
  dataFiles: DiscoveredDataFile[]
  localizeFiles: DiscoveredLocalizeFile[]
  modules: ModuleDefinition[]
  docs: Record<string, DocState>
  activeModuleId: string
  primaryLang: Record<string, string>
  selectedId: Record<string, string | null>
  lastEditedPath: string | null
  historyTick: number
  status: string
  statusKind: 'info' | 'success' | 'error'
  artCache: Record<string, string | null>
  buffIcons: Record<string, string>
  modEpoch: number
  assetPick: { fromModuleId: string; field: string; initialAssetName?: string } | null
  hatEnabled: boolean
  proofMode: Record<string, boolean>
  proofPreview: Record<string, boolean>
  boot: () => Promise<void>
  openMod: (path: string) => Promise<void>
  pickMod: () => Promise<void>
  setActiveModule: (moduleId: string) => Promise<void>
  ensureModuleDocs: (moduleId: string) => Promise<void>
  openWorkspaceAndSelect: (moduleId: string, id: string) => Promise<void>
  setPrimaryLang: (moduleId: string, lang: string) => void
  select: (moduleId: string, id: string | null) => void
  editData: (moduleId: string, mutate: (doc: OrderedDoc, refs: EntityRef[]) => void) => void
  editDoc: (path: string, mutate: (doc: OrderedDoc) => void) => void
  undo: () => void
  redo: () => void
  saveModule: (moduleId: string) => Promise<boolean>
  saveAll: () => Promise<boolean>
  fixWorkspace: (moduleId: string) => Promise<void>
  loadArtwork: (folder: string, name: string) => Promise<string | null>
  loadBuffIcons: () => Promise<void>
  requestAssetPick: (fromModuleId: string, field: string, initialAssetName?: string) => Promise<void>
  completeAssetPick: (assetName: string) => Promise<void>
  cancelAssetPick: () => void
  setStatus: (status: string, kind?: 'info' | 'success' | 'error') => void
  setHatEnabled: (enabled: boolean) => void
  setProofMode: (moduleId: string, on: boolean) => void
  setProofPreview: (moduleId: string, on: boolean) => void
}

const KNOWN_DATA_ROOTS = new Set(registryModules.filter((m) => m.dataRoot).map((m) => m.dataRoot as string))
const KNOWN_LOC_ROOTS = new Set(
  registryModules.flatMap((m) => (m.localizeRoots ?? []).map((r) => r.root))
)

function hintForDataFile(name: string): string | null {
  const n = name.toLowerCase()
  if (n.includes('cardinfo') || n === 'card.xml') return 'cardinfo'
  if (n.includes('passive')) return 'passive'
  if (n.includes('enemy')) return 'enemy'
  return null
}

function hintForLocalizeFile(name: string): string | null {
  const n = name.toLowerCase()
  if (n.includes('battlecardabilit') || n.includes('cardabilit')) return 'cardability'
  if (n.includes('battlecards') || n.includes('battlecarddesc') || n.includes('cardname')) return 'cardname'
  if (n.includes('passivedesc')) return 'passiveability'
  if (n.includes('effecttext')) return 'effecttext'
  return null
}


/** 扫描整个 Mod：所有 Data XML + 所有本地化 XML，按根节点自适应分配工作区 */
async function scanMod(modPath: string): Promise<{
  dataFiles: DiscoveredDataFile[]
  localizeFiles: DiscoveredLocalizeFile[]
  modules: ModuleDefinition[]
}> {
  const list: FileInfo[] = await api.listDataFiles(modPath)
  const dataFiles: DiscoveredDataFile[] = []
  const inferredData = new Map<string, EntitySchema>()
  for (const f of list) {
    const path = `${modPath}\\Data\\${f.name}`.replace(/\\/g, '\\')
    try {
      const text = await api.readTextFile(path)
      const doc = parseXml(text)
      const root = findRootName(doc)
      dataFiles.push({ path, name: f.name, size: f.size, root })
      if (root && !KNOWN_DATA_ROOTS.has(root) && !inferredData.has(root)) {
        const schema = inferEntitySchema(doc, root)
        if (schema) inferredData.set(root, schema)
      }
    } catch {
      dataFiles.push({ path, name: f.name, size: f.size, root: null })
    }
  }

    const locCandidates = await api.listFilesByGlobs(modPath, ['**/*.xml', '**/*.txt'])
  const localizeFiles: DiscoveredLocalizeFile[] = []
  const inferredLoc = new Map<string, EntitySchema>()
  const LANG_SEG = /(^|[\\/])(cn|zh|chs|cht|en|jp|ja|ko|kr|ru|de|fr|es|pt|trcn)([\\/]|$)/i
  for (const path of locCandidates) {
    const rel = path.slice(modPath.length).replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase()
    const hasLocalizeSeg = /(^|[\\/])localize([\\/]|$)/i.test(rel)
    const langSeg = LANG_SEG.test(rel)
    const excluded = !hasLocalizeSeg && /^(data|resource|artwork|char|bufficon|assemblies)[\\/]/.test(rel)
    if (excluded) continue
    if (!hasLocalizeSeg && !langSeg) continue
    try {
      const text = await api.readTextFile(path)
      const doc = parseXml(text)
      const root = findRootName(doc)
      if (!root || KNOWN_DATA_ROOTS.has(root)) continue
      const lang = detectLang(path, text)
      localizeFiles.push({ path, root, lang: lang.lang, label: lang.label })
      if (!KNOWN_LOC_ROOTS.has(root) && !inferredLoc.has(root)) {
        const schema = inferEntitySchema(doc, root)
        if (schema) inferredLoc.set(root, schema)
      }
    } catch {
      // 无法解析的文件跳过，不阻塞整体扫描
    }
  }

  // 第三层兜底：目录名没有 Localize / 语言段时，按根节点识别
  for (const path of locCandidates) {
    if (localizeFiles.some((f) => f.path === path)) continue
    const rel = path.slice(modPath.length).replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase()
    if (/^(data|resource|artwork|char|bufficon|assemblies)[\\/]/.test(rel)) continue
    try {
      const text = await api.readTextFile(path)
      const doc = parseXml(text)
      const root = findRootName(doc)
      if (!root || !KNOWN_LOC_ROOTS.has(root)) continue
      const lang = detectLang(path, text)
      localizeFiles.push({ path, root, lang: lang.lang, label: lang.label })
      if (!inferredLoc.has(root)) {
        const schema = inferEntitySchema(doc, root)
        if (schema) inferredLoc.set(root, schema)
      }
    } catch {
      // 跳过无法解析的文件
    }
  }

  const modules: ModuleDefinition[] = []
  const knownDataPaths = new Set<string>()
  const knownLocPaths = new Set<string>()

  for (const tmpl of registryModules.filter((m) => !m.resource)) {
    const matches = tmpl.dataRoot
      ? dataFiles.filter((d) => d.root === tmpl.dataRoot)
      : tmpl.dataFile
        ? [{ path: tmpl.dataFile } as DiscoveredDataFile]
        : []
    const locMatches = localizeFiles.filter((f) => f.root && (tmpl.localizeRoots ?? []).some((r) => r.root === f.root))
    if (matches.length > 0) {
      if (tmpl.dataFile) {
        modules.push({ ...tmpl })
        knownDataPaths.add(tmpl.dataFile)
      } else {
        const paths = matches.map((m) => m.path)
        for (const p of paths) knownDataPaths.add(p)
        modules.push({ ...tmpl, dataRoot: undefined, dataFile: undefined, dataFiles: paths })
      }
    }
    if (locMatches.length > 0) {
      for (const f of locMatches) knownLocPaths.add(f.path)
      if (matches.length === 0) modules.push({ ...tmpl })
    }
  }

  for (const d of dataFiles) {
    if (!d.root || knownDataPaths.has(d.path)) continue
    const hint = hintForDataFile(d.name)
    const tmpl = hint ? registryModules.find((m) => m.id === hint) : undefined
    if (tmpl) {
      knownDataPaths.add(d.path)
      const baseExists = modules.some((m) => m.id === tmpl.id)
      modules.push({
        ...tmpl,
        id: baseExists ? `${tmpl.id}@${d.name}` : tmpl.id,
        title: baseExists ? `${tmpl.title} · ${d.name}` : tmpl.title,
        dataRoot: undefined,
        dataFile: undefined,
        dataFiles: [d.path],
        entity: { ...tmpl.entity, root: d.root }
      })
      continue
    }
    knownDataPaths.add(d.path)
    const schema = inferredData.get(d.root) ?? {
      root: d.root,
      entity: 'Item',
      idAttr: 'ID',
      fields: []
    }
    modules.push({
      id: `auto-data-${d.name}`,
      title: d.name,
      icon: 'FileCode2',
      description: '自动识别的工作区（无预设模板）',
      dataFile: d.path,
      entity: schema
    })
  }

  // 按文件名兜底归类本地化文件（根节点与注册模板不一致时也能分配）
  const locHinted = new Map<string, ModuleDefinition>()
  for (const f of localizeFiles) {
    if (!f.root || knownLocPaths.has(f.path)) continue
    const hint = hintForLocalizeFile(f.path.split(/[\\\\/]/).pop() ?? '')
    const tmpl = hint ? registryModules.find((m) => m.id === hint) : undefined
    if (!tmpl) continue
    const key = `${hint}@${f.root}`
    let mod = locHinted.get(key)
    if (!mod) {
      const baseExists = modules.some((m) => m.id === tmpl.id)
      const newMod: ModuleDefinition = {
        ...tmpl,
        id: baseExists ? key : tmpl.id,
        title: tmpl.title,
        dataRoot: undefined,
        entity: { ...tmpl.entity, root: f.root as string },
        localizeRoots: (tmpl.localizeRoots ?? []).map((r) => ({ ...r, root: f.root as string }))
      }
      locHinted.set(key, newMod)
      modules.push(newMod)
    }
    knownLocPaths.add(f.path)
  }

  const remainingLoc = localizeFiles.filter((f) => !knownLocPaths.has(f.path))
  const remainingByRoot = new Map<string, DiscoveredLocalizeFile[]>()
  for (const f of remainingLoc) {
    if (!f.root) continue
    const arr = remainingByRoot.get(f.root) ?? []
    arr.push(f)
    remainingByRoot.set(f.root, arr)
  }
  for (const [root, files] of remainingByRoot) {
    const schema = inferredLoc.get(root)
    if (!schema) continue
    const def: LocalizationRootDef = {
      root: schema.root,
      containerPath: schema.containerPath,
      entity: schema.entity,
      idAttr: schema.idAttr,
      fields: schema.fields
        .filter((fd) => fd.kind === 'text' || fd.kind === 'multiline')
        .map((fd) => ({ name: fd.name, label: fd.label ?? fd.name, kind: fd.kind as 'text' | 'multiline' }))
    }
    modules.push({
      id: `auto-loc-${schema.root}`,
      title: `${schema.root}（本地化）`,
      icon: 'Languages',
      description: `${files.length} 个语言文件 · 自动识别的本地化工作区`,
      entity: schema,
      localizeRoots: [def]
    })
  }

  for (const tmpl of registryModules.filter((m) => m.resource)) modules.push({ ...tmpl })

  

  // 奇点大工作区：仅在选择 Mod 后追加（未选 Mod 不可进入）
  if (modPath) {
    for (const tmpl of singularityModules) modules.push({ ...tmpl })
  }

  return { dataFiles, localizeFiles, modules }
}

function bindingFor(module: ModuleDefinition, kind: DocBinding['kind'], locDef?: LocalizationRootDef): DocBinding {
  return { kind, locDef, issues: [] }
}

function locSchemaFrom(def: LocalizationRootDef): EntitySchema {
  return { root: def.root, entity: def.entity, idAttr: def.idAttr ?? 'ID', containerPath: def.containerPath, fields: [] }
}

function cardInfoSpecialFixes(doc: OrderedDoc, module: ModuleDefinition): number {
  const refs = listEntities(doc, module.entity)
  const field = (name: string) => module.entity.fields.find((f) => f.name === name)
  const rangeField = field('Range')
  const costField = field('Cost')
  const affectionField = field('Affection')
  const emotionField = field('EmotionLimit')
  let fixes = 0
  for (const r of refs) {
    if (getTextField(r.node, 'TextId') !== '-1') {
      setTextField(r.node, 'TextId', '-1')
      fixes++
    }
    if (getTextField(r.node, 'Category') !== 'None') {
      setTextField(r.node, 'Category', 'None')
      fixes++
    }
    removeField(r.node, 'SpecialEffect')
    const ego = getMulti(r.node, 'Option').some((t) => /ego/i.test(t))
    const cool = getTextField(r.node, 'MaxCooltimeForEgo')
    if (!ego && cool !== undefined) {
      removeField(r.node, 'MaxCooltimeForEgo')
      fixes++
    } else if (ego && (!cool || cool.trim() === '' || cool.trim() === '0')) {
      setTextField(r.node, 'MaxCooltimeForEgo', '9')
      fixes++
    }
    if (rangeField && getFieldValue(r.node, rangeField) === undefined) {
      setFieldValue(r.node, rangeField, 'Near')
      fixes++
    }
    if (costField && getFieldValue(r.node, costField) === undefined) {
      setFieldValue(r.node, costField, '0')
      fixes++
    }
    if (affectionField && getFieldValue(r.node, affectionField) === undefined) {
      setFieldValue(r.node, affectionField, 'One')
      fixes++
    }
    if (emotionField && getFieldValue(r.node, emotionField) === undefined) {
      setFieldValue(r.node, emotionField, '0')
      fixes++
    }
  }
  return fixes
}

function primaryDocsOf(docs: Record<string, DocState>, moduleId: string): DocState[] {
  return Object.values(docs).filter((d) => d.bindings[moduleId]?.kind === 'primary')
}

function activePrimaryDoc(
  docs: Record<string, DocState>,
  moduleId: string,
  primaryLang: string | undefined
): DocState | undefined {
  const primaries = primaryDocsOf(docs, moduleId)
  if (primaries.length === 0) return undefined
  if (primaries.length === 1) return primaries[0]
  return primaries.find((d) => d.lang === primaryLang) ?? primaries[0]
}

const hatInitial = typeof localStorage !== 'undefined' ? localStorage.getItem('hatSingularityEnabled') === '1' : false

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  steamPath: null,
  gamePath: null,
  mods: [],
  modPath: null,
  dataFiles: [],
  localizeFiles: [],
  modules: [],
  docs: {},
  activeModuleId: '',
  primaryLang: {},
  selectedId: {},
  lastEditedPath: null,
  historyTick: 0,
  status: '正在启动…',
  statusKind: 'info',
  artCache: {},
  buffIcons: {},
  modEpoch: 0,
  assetPick: null,
  hatEnabled: hatInitial,
  proofMode: {},
  proofPreview: {},

  setStatus: (status, kind = 'info') => set({ status, statusKind: kind }),

  setProofMode: (moduleId, on) => set((s) => ({ proofMode: { ...s.proofMode, [moduleId]: on } })),

  setProofPreview: (moduleId, on) => set((s) => ({ proofPreview: { ...s.proofPreview, [moduleId]: on } })),

  setHatEnabled: (enabled) => {
    try {
      localStorage.setItem('hatSingularityEnabled', enabled ? '1' : '0')
    } catch {
      // localStorage 不可用时忽略
    }
    set({ hatEnabled: enabled })
  },

  boot: async () => {
    try {
      const d: DiscoveryResult = await api.discover()
      const saved = (() => {
        try {
          return localStorage.getItem('lastModPath')
        } catch {
          return null
        }
      })()
      const target = d.mods.find((m) => m.path === saved) ?? d.mods.find((m) => m.name === '梦幻宇宙') ?? d.mods[0] ?? null
      set({ steamPath: d.steamPath, gamePath: d.gamePath, mods: d.mods })
      if (target) await get().openMod(target.path)
      else set({ ready: true, status: '未找到 Mod，请手动选择目录', statusKind: 'info' })
    } catch (e) {
      set({ ready: true, status: `启动失败：${e instanceof Error ? e.message : String(e)}`, statusKind: 'error' })
    }
  },

  openMod: async (path) => {
    set({ status: '正在扫描 Mod 的全部 XML…', statusKind: 'info' })
    try {
      localStorage.setItem('lastModPath', path)
    } catch {
      // ignore
    }
    try {
      const { dataFiles, localizeFiles, modules } = await scanMod(path)
      set({
        modPath: path,
        dataFiles,
        localizeFiles,
        modules,
        docs: {},
        selectedId: {},
        primaryLang: {},
        artCache: {},
        modEpoch: get().modEpoch + 1,
        activeModuleId: modules[0]?.id ?? ''
      })
      const active = modules[0]?.id ?? ''
      if (active) {
        set({ activeModuleId: active })
        await get().setActiveModule(active)
      }
      // 打开 Mod 时直接读取全部 XML 工作区的文档并填充，避免首次点击才加载导致空/红标
      for (const m of modules) {
        if (m.resource || m.builtin) continue
        await get().ensureModuleDocs(m.id)
      }
      set({
        ready: true,
        status: `扫描完成：${dataFiles.length} 个数据 XML、${localizeFiles.length} 个本地化 XML → ${modules.length} 个工作区`,
        statusKind: 'success'
      })
      void get().loadBuffIcons()
    } catch (e) {
      set({ ready: true, status: `扫描失败：${e instanceof Error ? e.message : String(e)}`, statusKind: 'error' })
    }
  },

  pickMod: async () => {
    const p = await api.pickModDirectory()
    if (p) await get().openMod(p)
  },

  setActiveModule: async (moduleId) => {
    set({ activeModuleId: moduleId })
    await get().ensureModuleDocs(moduleId)
  },

  ensureModuleDocs: async (moduleId) => {
    const module = get().modules.find((m) => m.id === moduleId)
    const modPath = get().modPath
    if (!module || !modPath) return
    const epoch = get().modEpoch
    const nextDocs: Record<string, DocState> = {}
    const ensureBinding = (state: DocState, binding: DocBinding) => {
      if (!state.bindings[moduleId]) {
        if (binding.kind === 'primary') binding.issues = validateEntities(state.doc, module.entity)
        state.bindings[moduleId] = binding
      }
    }

    const loadFile = async (
      path: string,
      binding: DocBinding,
      root: string | null,
      lang: string | undefined,
      label: string | undefined
    ) => {
      const merged: Record<string, DocState> = { ...get().docs, ...nextDocs }
      const existingState = merged[path]
      if (existingState) {
        ensureBinding(existingState, binding)
        return
      }
      try {
        const text = await api.readTextFile(path)
        const doc = parseXml(text)
        if (binding.kind === 'primary' && (module.stripFields ?? []).length > 0) {
          for (const ref of listEntities(doc, module.entity)) {
            for (const stripName of module.stripFields as string[]) removeField(ref.node, stripName)
          }
        }
        if (binding.kind === 'primary') binding.issues = validateEntities(doc, module.entity)
        nextDocs[path] = {
          path,
          doc,
          dirty: false,
          rev: 0,
          history: new SnapshotHistory(),
          lastSavedText: text,
          root,
          lang,
          langLabel: label,
          bindings: { [moduleId]: binding }
        }
      } catch {
        // 单个文件失败不阻塞整体加载
      }
    }

    const dataPaths: string[] = []
    if (module.dataFiles?.length) {
      dataPaths.push(...module.dataFiles)
    } else if (module.dataFile) {
      dataPaths.push(/^[a-zA-Z]:[\\/]/.test(module.dataFile) || module.dataFile.startsWith('/') ? module.dataFile : joinPath(modPath, 'Data', module.dataFile))
    } else if (module.dataRoot) {
      dataPaths.push(...get().dataFiles.filter((d) => d.root === module.dataRoot).map((d) => d.path))
    }

    const locDefs = module.localizeRoots ?? []
    const locFiles = get().localizeFiles.filter((f) => f.root && locDefs.some((r) => r.root === f.root))
    const hasData = dataPaths.length > 0

    for (const p of dataPaths) {
      await loadFile(p, bindingFor(module, 'primary'), null, undefined, undefined)
    }
    for (const f of locFiles) {
      const def = locDefs.find((r) => r.root === f.root)
      if (!def) continue
      await loadFile(f.path, bindingFor(module, hasData ? 'localize' : 'primary', def), f.root, f.lang, f.label)
    }

    if (get().modEpoch !== epoch) return
    set((s) => ({ docs: { ...s.docs, ...nextDocs } }))
    const primaries = primaryDocsOf({ ...get().docs, ...nextDocs }, moduleId)
    const editorLang = typeof localStorage !== 'undefined' ? localStorage.getItem('editorLang') ?? 'zh' : 'zh'
    const preferred = editorLangToDocLang(editorLang)
    const first = primaries.find((d) => d.lang === preferred) ?? primaries.find((d) => d.lang === 'cn') ?? primaries.find((d) => d.lang === 'zh') ?? primaries[0]
    if (first) {
      const refs = listEntities(first.doc, module.entity)
      if (get().modEpoch !== epoch) return
      set((s) => ({
        selectedId: { ...s.selectedId, [moduleId]: refs[0]?.id ?? null },
        primaryLang: { ...s.primaryLang, [moduleId]: first.lang ?? first.path }
      }))
    }
  },

  setPrimaryLang: (moduleId, lang) => set((s) => ({ primaryLang: { ...s.primaryLang, [moduleId]: lang } })),

  openWorkspaceAndSelect: async (moduleId, id) => {
    if (!get().modules.some((m) => m.id === moduleId)) {
      get().setStatus('目标工作区不存在', 'error')
      return
    }
    set({ activeModuleId: moduleId })
    await get().setActiveModule(moduleId)
    set((s) => ({ selectedId: { ...s.selectedId, [moduleId]: id } }))
    get().setStatus('已跳转到对应词条', 'success')
  },

  select: (moduleId, id) => set((state) => ({ selectedId: { ...state.selectedId, [moduleId]: id } })),

  editData: (moduleId, mutate) => {
    const module = get().modules.find((m) => m.id === moduleId)
    if (!module) return
    const doc = activePrimaryDoc(get().docs, moduleId, get().primaryLang[moduleId])
    if (!doc) return
    get().editDoc(doc.path, (d) => {
      const refs = listEntities(d, module.entity)
      mutate(d, refs)
    })
  },

  editDoc: (path, mutate) => {
    const d = get().docs[path]
    if (!d) return
    const before = serializeXml(d.doc)
    mutate(d.doc)
    if (serializeXml(d.doc) === before) return
    const cloned = structuredClone(d.doc)
    d.history.push(before)
    // 为每个绑定了该文件的工作区重新校验
    for (const [moduleId, binding] of Object.entries(d.bindings)) {
      if (binding.kind !== 'primary') continue
      const module = get().modules.find((m) => m.id === moduleId)
      if (module) binding.issues = validateEntities(cloned, module.entity)
    }
    set((state) => ({
      docs: { ...state.docs, [path]: { ...d, doc: cloned, dirty: true, rev: d.rev + 1 } },
      lastEditedPath: path,
      historyTick: state.historyTick + 1
    }))
  },

  undo: () => {
    const path = get().lastEditedPath
    const d = path ? get().docs[path] : undefined
    if (!path || !d) return
    const current = serializeXml(d.doc)
    const prev = d.history.undo(current)
    if (prev === null) return
    const doc = parseXml(prev)
    for (const [moduleId, binding] of Object.entries(d.bindings)) {
      if (binding.kind !== 'primary') continue
      const module = get().modules.find((m) => m.id === moduleId)
      if (module) binding.issues = validateEntities(doc, module.entity)
    }
    set((state) => ({ docs: { ...state.docs, [path]: { ...d, doc, dirty: true, rev: d.rev + 1 } }, historyTick: state.historyTick + 1 }))
    get().setStatus('已撤销', 'info')
  },

  redo: () => {
    const path = get().lastEditedPath
    const d = path ? get().docs[path] : undefined
    if (!path || !d) return
    const current = serializeXml(d.doc)
    const next = d.history.redo(current)
    if (next === null) return
    const doc = parseXml(next)
    for (const [moduleId, binding] of Object.entries(d.bindings)) {
      if (binding.kind !== 'primary') continue
      const module = get().modules.find((m) => m.id === moduleId)
      if (module) binding.issues = validateEntities(doc, module.entity)
    }
    set((state) => ({ docs: { ...state.docs, [path]: { ...d, doc, dirty: true, rev: d.rev + 1 } }, historyTick: state.historyTick + 1 }))
    get().setStatus('已重做', 'info')
  },

  saveModule: async (moduleId) => {
    const dirty = Object.values(get().docs).filter((d) => d.bindings[moduleId] && d.dirty)
    if (dirty.length === 0) {
      get().setStatus('当前模块没有需要保存的修改', 'info')
      return true
    }
    try {
      for (const d of dirty) {
        const text = serializeXml(d.doc)
        await api.saveFile(d.path, text)
        d.lastSavedText = text
        d.dirty = false
        d.history.clear()
      }
      set((state) => ({ docs: { ...state.docs } }))
      get().setStatus(`已保存当前模块 ${dirty.length} 个文件`, 'success')
      return true
    } catch (e) {
      get().setStatus(`保存失败：${e instanceof Error ? e.message : String(e)}`, 'error')
      return false
    }
  },

  saveAll: async () => {
    const dirty = Object.values(get().docs).filter((d) => d.dirty)
    if (dirty.length === 0) {
      get().setStatus('所有模块均无需要保存的修改', 'info')
      return true
    }
    try {
      for (const d of dirty) {
        const text = serializeXml(d.doc)
        await api.saveFile(d.path, text)
        d.lastSavedText = text
        d.dirty = false
        d.history.clear()
      }
      set((state) => ({ docs: { ...state.docs } }))
      get().setStatus(`全部保存完成：共 ${dirty.length} 个文件`, 'success')
      return true
    } catch (e) {
      get().setStatus(`全部保存失败：${e instanceof Error ? e.message : String(e)}`, 'error')
      return false
    }
  },

  fixWorkspace: async (moduleId) => {
    const module = get().modules.find((m) => m.id === moduleId)
    if (!module) return
    const bound = Object.values(get().docs).filter((d) => d.bindings[moduleId])
    let fixes = 0
    for (const d of bound) {
      const binding = d.bindings[moduleId]
      const schema = binding.kind === 'primary' ? module.entity : binding.locDef ? locSchemaFrom(binding.locDef) : module.entity
      get().editDoc(d.path, (doc) => {
        fixes += fixDuplicateIds(doc, schema)
        if (moduleId === 'cardinfo' && binding.kind === 'primary') {
          fixes += cardInfoSpecialFixes(doc, module)
        }
      })
    }
    get().setStatus(fixes > 0 ? `校验修正完成：共修复 ${fixes} 处` : '校验通过：未发现需要修复的问题', fixes > 0 ? 'success' : 'info')
  },

  requestAssetPick: async (fromModuleId, field, initialAssetName) => {
    if (!get().modules.some((m) => m.id === 'page-artwork')) {
      get().setStatus('书页图片工作区不存在', 'error')
      return
    }
    set({ assetPick: { fromModuleId, field, initialAssetName } })
    set({ activeModuleId: 'page-artwork' })
    await get().setActiveModule('page-artwork')
    get().setStatus('请选择一张图片', 'info')
  },

  completeAssetPick: async (assetName) => {
    const pick = get().assetPick
    if (!pick) return
    const module = get().modules.find((m) => m.id === pick.fromModuleId)
    const field = module?.entity.fields.find((f) => f.name === pick.field)
    if (module && field) {
      get().editData(pick.fromModuleId, (doc) => {
        const refs = listEntities(doc, module.entity)
        const selected = get().selectedId[pick.fromModuleId]
        const ref = refs.find((r) => r.id === selected) ?? refs[0]
        if (ref) setFieldValue(ref.node, field, assetName)
      })
    }
    set({ assetPick: null })
    set({ activeModuleId: pick.fromModuleId })
    await get().setActiveModule(pick.fromModuleId)
    get().setStatus('已回填图片资源', 'success')
  },

  cancelAssetPick: () => {
    const pick = get().assetPick
    set({ assetPick: null })
    if (pick) {
      set({ activeModuleId: pick.fromModuleId })
      void get().setActiveModule(pick.fromModuleId)
    }
  },

  loadBuffIcons: async () => {
    try {
      const modPath = get().modPath
      if (!modPath) return
      const saved = localStorage.getItem('imageDir_buff-icons')
      const dir = saved || `${modPath}\\Resource\\BuffIcon`.replace(/\\/g, '\\')
      const list = await api.listImagesRecursive(dir)
      const map: Record<string, string> = {}
      for (const asset of list) {
        const url = await api.readAssetAsDataUrl(asset.path)
        if (url) map[asset.name.replace(/\.[^.]+$/, '')] = url
      }
      set({ buffIcons: map })
    } catch {
      // ignore
    }
  },

    loadArtwork: async (folder, name) => {
    const cache = get().artCache[name]
    if (cache !== undefined) return cache
    const path = await api.resolveAsset(folder, name)
    const url = path ? await api.readAssetAsDataUrl(path) : null
    set((state) => ({ artCache: { ...state.artCache, [name]: url } }))
    return url
  }
}))