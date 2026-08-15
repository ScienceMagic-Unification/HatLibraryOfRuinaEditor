import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { getTextField, listEntities, type ModuleDefinition } from '@ruina/editor-core'
import { Badge, Button, Input } from '@ruina/ui'
import { FolderOpen, Image, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { api, type ImageAssetInfo } from '../api'
import { useAppStore } from '../store'
import { useI18n } from '../i18n'
import { ImageCard } from './ImageCard'
import { ImageImportDrop } from './ImageImportDrop'
import { ConfirmDialog } from './ConfirmDialog'

function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}

const GAP = 12
const MIN_CARD_WIDTH = 150
const CARD_HEIGHT = 200

export function ImageWorkspace({ module }: { module: ModuleDefinition }): JSX.Element {
  const { t } = useI18n()
  const modPath = useAppStore((s) => s.modPath)
  const modules = useAppStore((s) => s.modules)
  const docs = useAppStore((s) => s.docs)
  const primaryLang = useAppStore((s) => s.primaryLang)
  const setStatus = useAppStore((s) => s.setStatus)
  const assetPick = useAppStore((s) => s.assetPick)
  const completeAssetPick = useAppStore((s) => s.completeAssetPick)
  const cancelAssetPick = useAppStore((s) => s.cancelAssetPick)

  const resourceDir = module.resource?.dir ?? 'Resource'
  const initialDir = useMemo(() => {
    const parts = resourceDir.replace(/\\/g, '/').split('/').filter(Boolean)
    return modPath ? [modPath, ...parts].join('\\') : resourceDir
  }, [modPath, resourceDir])


  const [dir, setDir] = useState(initialDir)

  const displayDir = useMemo(() => {
    if (!modPath) return dir
    const root = modPath.replace(/[\\/]+$/, '').replace(/\\/g, '/')
    const current = dir.replace(/\\/g, '/')
    if (current.toLowerCase().startsWith(root.toLowerCase() + '/')) return current.slice(root.length + 1)
    return dir
  }, [dir, modPath])

  const [images, setImages] = useState<ImageAssetInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [deleteQueue, setDeleteQueue] = useState<ImageAssetInfo[] | null>(null)
  const [renaming, setRenaming] = useState<ImageAssetInfo | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<string | null>(null)
  const [containerWidth, setContainerWidth] = useState(1200)

  const reload = useCallback(async (d: string) => {
    setLoading(true)
    try {
      const list = await api.listImages(d)
      setImages(list)
    } catch (e) {
      setImages([])
      setStatus(`读取图片失败：${e instanceof Error ? e.message : String(e)}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [setStatus])

  useEffect(() => {
    setDir(initialDir)
  }, [initialDir])

  useEffect(() => {
    setSelectedPaths(new Set())
    anchorRef.current = null
    void reload(dir)
  }, [dir, reload])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth || 1200))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const columns = Math.max(1, Math.floor((containerWidth + GAP) / (MIN_CARD_WIDTH + GAP)))
  const rows = useMemo(() => {
    const out: ImageAssetInfo[][] = []
    for (let i = 0; i < images.length; i += columns) out.push(images.slice(i, i + columns))
    return out
  }, [images, columns])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CARD_HEIGHT + GAP,
    overscan: 4
  })

  const pickActive = Boolean(assetPick && module.id === 'page-artwork')
  const pickInitialBase = assetPick?.initialAssetName ?? ''
  const showUsage = Boolean(module.resource?.bindModuleId)

  const usageCounts = useMemo(() => {
    const bindModuleId = module.resource?.bindModuleId
    const bindField = module.resource?.bindField ?? 'Artwork'
    if (!bindModuleId) return new Map<string, number>()
    const targetModule = modules.find((m) => m.id === bindModuleId)
    if (!targetModule) return new Map<string, number>()
    const lang = primaryLang[bindModuleId]
    const primaries = Object.values(docs).filter((d) => d.bindings[bindModuleId]?.kind === 'primary')
    const chosen = primaries.find((d) => d.lang === lang) ?? primaries[0]
    if (!chosen) return new Map<string, number>()
    const map = new Map<string, number>()
    for (const ref of listEntities(chosen.doc, targetModule.entity)) {
      const art = (getTextField(ref.node, bindField) ?? '').replace(/\.[^.]+$/, '')
      if (!art) continue
      map.set(art, (map.get(art) ?? 0) + 1)
    }
    return map
  }, [module, modules, docs, primaryLang])

  useEffect(() => {
    if (!pickActive || !pickInitialBase || images.length === 0) return
    const idx = images.findIndex((i) => i.name.replace(/\.[^.]+$/, '') === pickInitialBase)
    if (idx < 0) return
    const row = Math.floor(idx / columns)
    const top = row * (CARD_HEIGHT + GAP)
    scrollRef.current?.scrollTo({ top })
  }, [pickActive, pickInitialBase, images, columns])

  const baseOf = (asset: ImageAssetInfo) => asset.name.replace(/\.[^.]+$/, '')

  const togglePath = (path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const rangeSelect = (path: string) => {
    const startIdx = anchorRef.current ? images.findIndex((i) => i.path === anchorRef.current) : -1
    const endIdx = images.findIndex((i) => i.path === path)
    if (startIdx < 0 || endIdx < 0) {
      setSelectedPaths(new Set([path]))
      return
    }
    const [a, b] = startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
    setSelectedPaths(new Set(images.slice(a, b + 1).map((i) => i.path)))
  }

  const handleSelect = (asset: ImageAssetInfo, e: React.MouseEvent) => {
    if (pickActive) {
      void completeAssetPick(asset.name)
      return
    }
    const path = asset.path
    if (e.shiftKey) {
      rangeSelect(path)
      return
    }
    if (e.ctrlKey || e.metaKey) {
      anchorRef.current = path
      togglePath(path)
      return
    }
    anchorRef.current = path
    if (selectedPaths.has(path)) {
      setSelectedPaths((prev) => {
        const next = new Set(prev)
        next.delete(path)
        return next
      })
    } else if (selectedPaths.size > 0) {
      setSelectedPaths((prev) => new Set(prev).add(path))
    } else {
      setSelectedPaths(new Set([path]))
    }
  }

  const pickDirectory = async () => {
    if (!modPath) return
    const p = await api.pickDirectory(modPath)
    if (p) {
      setSelectedPaths(new Set())
      anchorRef.current = null
      setDir(p)
      setStatus('已切换资源目录', 'success')
    }
  }

  const confirmDelete = async () => {
    if (!deleteQueue || deleteQueue.length === 0) return
    try {
      for (const asset of deleteQueue) await api.deleteImage(asset.path)
      const deletedPaths = new Set(deleteQueue.map((a) => a.path))
      setSelectedPaths((prev) => {
        const next = new Set(prev)
        for (const p of deletedPaths) next.delete(p)
        return next
      })
      setDeleteQueue(null)
      await reload(dir)
      setStatus(`已删除 ${deleteQueue.length} 张图片`, 'success')
    } catch (e) {
      setStatus(`删除失败：${e instanceof Error ? e.message : String(e)}`, 'error')
    }
  }

  const confirmRename = async () => {
    if (!renaming) return
    const next = renameValue.trim()
    if (!next) {
      setStatus('文件名不能为空', 'error')
      return
    }
    try {
      await api.renameImage(renaming.path, next)
      setRenaming(null)
      await reload(dir)
      setStatus('已重命名图片', 'success')
    } catch (e) {
      setStatus(`重命名失败：${e instanceof Error ? e.message : String(e)}`, 'error')
    }
  }

  const deleteMessage =
    deleteQueue && deleteQueue.length > 1
      ? t('image.confirmDeleteManyMessage', { n: deleteQueue.length })
      : t('image.confirmDeleteMessage', { name: deleteQueue?.[0]?.name ?? '' })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Image className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">{t('module.' + module.id) || module.title}</div>
          <div className="max-w-[460px] truncate font-mono text-[10px] text-muted-foreground/80" title={dir}>
            {displayDir}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => void pickDirectory()}>
          <FolderOpen className="size-4" /> {t('image.redirect')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void reload(dir)} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
        {!pickActive && selectedPaths.size > 0 ? (
          <Button size="sm" variant="destructive" onClick={() => setDeleteQueue(images.filter((i) => selectedPaths.has(i.path)))}>
            <Trash2 className="size-4" /> {t('image.batchDelete')} ({selectedPaths.size})
          </Button>
        ) : null}
        <div className="flex-1" />
        {pickActive ? (
          <div className="flex items-center gap-2 rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-xs text-amber-300">
            <span>{t('image.pickHint', { field: module.resource?.bindField ?? 'Artwork' })}</span>
            <Button size="sm" variant="destructive" onClick={() => cancelAssetPick()}>
              {t('image.cancelPick')}
            </Button>
          </div>
        ) : null}
        <Badge variant="outline">{t('image.total', { n: images.length })}</Badge>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <ImageImportDrop
          dir={dir}
          onImported={() => {
            setSelectedPaths(new Set())
            anchorRef.current = null
            void reload(dir)
          }}
        />
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {loading && images.length === 0 ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {t('loading', { title: module.title })}
            </div>
          ) : images.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t('image.empty')}</div>
          ) : (
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
              {virtualizer.getVirtualItems().map((v) => {
                const rowImages = rows[v.index]
                return (
                  <div
                    key={v.key}
                    className="grid"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: v.size,
                      transform: `translateY(${v.start}px)`,
                      display: 'grid',
                      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                      gap: GAP
                    }}
                  >
                    {rowImages.map((asset) => {
                      const base = baseOf(asset)
                      const selected =
                        selectedPaths.has(asset.path) ||
                        (pickActive &&
                          Boolean(pickInitialBase) &&
                          (pickInitialBase === base || pickInitialBase === asset.name || stripExt(pickInitialBase) === base))
                      return (
                        <ImageCard
                          key={asset.path}
                          asset={asset}
                          selected={selected}
                          picking={pickActive}
                          usageCount={usageCounts.get(base) ?? 0}
                          showUsage={showUsage}
                          onSelect={handleSelect}
                          onDelete={(a) => setDeleteQueue([a])}
                          onRename={(a) => {
                            setRenameValue(a.name)
                            setRenaming(a)
                          }}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteQueue && deleteQueue.length > 0)}
        message={deleteMessage}
        onCancel={() => setDeleteQueue(null)}
        onConfirm={() => void confirmDelete()}
      />

      {renaming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-1 text-base font-semibold text-foreground">{t('image.confirmRenameTitle')}</div>
            <p className="mb-3 text-xs text-muted-foreground">{t('image.renamePrompt')}</p>
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-md border border-border bg-secondary px-4 py-2 text-sm text-secondary-foreground hover:bg-accent" onClick={() => setRenaming(null)}>
                {t('confirm.cancel')}
              </button>
              <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90" onClick={() => void confirmRename()}>
                {t('confirm.ok')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}