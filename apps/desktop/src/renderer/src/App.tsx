import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Button, Select } from '@ruina/ui'
import {
  Atom,
  BadgeCheck,
  Database,
  FileCode2,
  FolderOpen,
  Loader2,
  Redo2,
  Save,
  Skull,
  Sparkles,
  Swords,
  Tags,
  Undo2
} from 'lucide-react'
import { useAppStore } from './store'
import { useI18n } from './i18n'
import { WorkspaceView } from './components/WorkspaceView'
import { WorkspaceLinkGraph } from './components/WorkspaceLinkGraph'

const ICONS: Record<string, typeof Swords> = { Swords, Sparkles, Skull, BadgeCheck, Tags, Languages: Database, FileCode2 }

export function App(): JSX.Element {
  const { lang, setLang, t } = useI18n()
  const ready = useAppStore((s) => s.ready)
  const boot = useAppStore((s) => s.boot)
  const mods = useAppStore((s) => s.mods)
  const modPath = useAppStore((s) => s.modPath)
  const openMod = useAppStore((s) => s.openMod)
  const pickMod = useAppStore((s) => s.pickMod)
  const activeModuleId = useAppStore((s) => s.activeModuleId)
  const setActiveModule = useAppStore((s) => s.setActiveModule)
  const dataFiles = useAppStore((s) => s.dataFiles)
  const docs = useAppStore((s) => s.docs)
  const historyTick = useAppStore((s) => s.historyTick)
  const lastEditedPath = useAppStore((s) => s.lastEditedPath)
  const undo = useAppStore((s) => s.undo)
  const redo = useAppStore((s) => s.redo)
  const saveModule = useAppStore((s) => s.saveModule)
  const saveAll = useAppStore((s) => s.saveAll)
  const discoveredModules = useAppStore((s) => s.modules)
  const gamePath = useAppStore((s) => s.gamePath)
  const hatEnabled = useAppStore((s) => s.hatEnabled)
  const setHatEnabled = useAppStore((s) => s.setHatEnabled)

  const booted = useRef(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  useEffect(() => {
    if (!booted.current) {
      booted.current = true
      void boot()
    }
  }, [boot])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.key.toLowerCase() === 'y') || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  const module = discoveredModules.find((m) => m.id === activeModuleId) ?? discoveredModules[0]
  const lastDoc = lastEditedPath ? docs[lastEditedPath] : undefined
  const canUndo = Boolean(lastDoc?.history.canUndo)
  const canRedo = Boolean(lastDoc?.history.canRedo)
  void historyTick

  const dirtyTotal = useMemo(() => Object.values(docs).filter((d) => d.dirty).length, [docs])

  useEffect(() => {
    window.api.setDirty(dirtyTotal > 0)
  }, [dirtyTotal])

  useEffect(() => {
    window.api.onConfirmClose(() => setShowCloseConfirm(true))
  }, [])

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card px-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/15 text-primary">
            <FileCode2 className="size-4" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">{t('app.title')}</div>
            <div className="text-[10px] leading-tight text-muted-foreground">V0.1.2</div>
          </div>
        </div>
        <div className="mx-1 h-5 w-px bg-border" />
        <div className="flex min-w-0 items-center gap-1.5">
          <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
          <Select.Root value={modPath ?? ''} onValueChange={(p) => void openMod(p)}>
            <Select.Trigger className="h-8 w-[260px] text-xs">
              <Select.Value placeholder={t('mod.browse')} />
            </Select.Trigger>
            <Select.Content>
              {mods.map((m) => (
                <Select.Item key={m.path} value={m.path}>
                  {m.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          <Button size="sm" variant="outline" onClick={() => void pickMod()} title="手动选择 Mod 目录">
            {t('browse')}
          </Button>
          <Select.Root value={lang} onValueChange={(v) => setLang(v as 'zh' | 'en' | 'jp')}>
            <Select.Trigger className="h-8 w-24 text-xs" aria-label={t('lang')}>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="zh">中文</Select.Item>
              <Select.Item value="en">English</Select.Item>
              <Select.Item value="jp">日本語</Select.Item>
            </Select.Content>
          </Select.Root>
          <Button
            size="sm"
            variant={hatEnabled ? 'default' : 'outline'}
            onClick={() => setHatEnabled(!hatEnabled)}
            aria-label="帽子奇点开关"
            className={
              hatEnabled
                ? 'border-amber-400/80 bg-amber-400/20 font-semibold text-amber-300 hover:bg-amber-400/30'
                : 'border-dashed font-medium text-muted-foreground hover:text-foreground'
            }
            title={hatEnabled ? '帽子奇点已开启（功能后续实装）' : '开启帽子奇点（功能后续实装）'}
          >
            <Atom className="size-4" />
            {hatEnabled ? t('hat.on') : t('hat.off')}
          </Button>
        </div>
        <div className="flex-1" />
        <div
          className="min-w-0 max-w-[360px] truncate font-mono text-[10px] text-muted-foreground/70"
          title={(() => {
            const m = discoveredModules.find((x) => x.id === activeModuleId)
            return m?.dataFile ?? m?.dataFiles?.[0] ?? Object.values(docs).find((d) => d.bindings[activeModuleId]?.kind === 'primary')?.path ?? ''
          })()}
        >
          {(() => {
            const m = discoveredModules.find((x) => x.id === activeModuleId)
            const p = m?.dataFile ?? m?.dataFiles?.[0] ?? Object.values(docs).find((d) => d.bindings[activeModuleId]?.kind === 'primary')?.path ?? ''
            return p ? p.split(/[\\/]/).slice(-2).join('/') : ''
          })()}
        </div>
        <Button size="sm" variant="ghost" disabled={!canUndo} onClick={undo} title="撤销">
          <Undo2 />
        </Button>
        <Button size="sm" variant="ghost" disabled={!canRedo} onClick={redo} title="重做">
          <Redo2 />
        </Button>
        {dirtyTotal > 0 ? <Badge variant="warning">{dirtyTotal} 未保存</Badge> : null}
        <Button size="sm" onClick={() => void saveAll()} disabled={dirtyTotal === 0} title="保存所有工作区的未保存修改">
          <Save /> {t('saveAll')}
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex min-h-0 w-56 shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-border bg-card">
          <div className="border-b border-border p-3 pb-2">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">工作区</div>
            <nav className="space-y-2">
              <WorkspaceLinkGraph
                modules={discoveredModules}
                activeId={module?.id ?? ''}
                onSelect={(id) => void setActiveModule(id)}
              />
            </nav>
          </div>

        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {showCloseConfirm ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
            <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl">
              <div className="mb-1 text-base font-semibold text-foreground">{t('close.title')}</div>
              <p className="mb-4 text-sm text-muted-foreground">{t('close.message')}</p>
              <div className="flex justify-end gap-2">
                <button
                  className="rounded-md border border-border bg-secondary px-4 py-2 text-sm text-secondary-foreground hover:bg-accent"
                  onClick={() => setShowCloseConfirm(false)}
                >
                  {t('close.cancel')}
                </button>
                <button
                  className="rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => window.api.confirmExit()}
                >
                  {t('close.exit')}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {modPath && module ? (
            <WorkspaceView key={module.id} module={module} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Database className="size-8" />
              </div>
              {!ready ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> 正在寻找游戏与 Mod…
                </div>
              ) : (
                <div className="text-center">
                  <p className="mb-1 text-sm text-muted-foreground">未找到 Mod 目录</p>
                  <p className="mb-3 text-xs text-muted-foreground/70">
                    游戏路径：{gamePath ?? '未发现'} · 已发现 {mods.length} 个 Mod
                  </p>
                  <Button onClick={() => void pickMod()}>
                    <FolderOpen /> 手动选择 Mod 目录
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>


    </div>
  )
}
