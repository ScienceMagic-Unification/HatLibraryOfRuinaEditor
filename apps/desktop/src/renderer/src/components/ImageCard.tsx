import { useEffect, useState } from 'react'
import { ImageOff, Pencil, Trash2 } from 'lucide-react'
import { api, type ImageAssetInfo } from '../api'
import { useI18n } from '../i18n'

function formatSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function ImageCard({
  asset,
  selected,
  picking,
  usageCount,
  showUsage,
  onSelect,
  onDelete,
  onRename
}: {
  asset: ImageAssetInfo
  selected: boolean
  picking: boolean
  usageCount: number
  showUsage: boolean
  onSelect: (asset: ImageAssetInfo, e: React.MouseEvent) => void
  onDelete: (asset: ImageAssetInfo) => void
  onRename: (asset: ImageAssetInfo) => void
}): JSX.Element {
  const { t } = useI18n()
  const [thumb, setThumb] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setThumb(null)
    void api.readAssetAsDataUrl(asset.path).then((url) => {
      if (alive) setThumb(url)
    })
    return () => {
      alive = false
    }
  }, [asset.path])

  return (
    <div
      className={`group relative flex h-full cursor-pointer flex-col rounded-lg border bg-card transition-colors ${
        selected ? 'border-primary/70 bg-primary/10' : 'border-border hover:border-primary/40 hover:bg-accent/40'
      }`}
      onClick={(e) => onSelect(asset, e)}
    >
      <div className="relative flex h-24 shrink-0 items-center justify-center overflow-hidden rounded-t-lg bg-black/30">
        {thumb ? (
          <img src={thumb} alt={asset.name} className="absolute inset-0 size-full object-cover" draggable={false} />
        ) : (
          <ImageOff className="size-8 opacity-40" />
        )}
        {selected ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-t-lg bg-primary/25">
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              {picking ? '✓' : '✓'}
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-between gap-1 p-2">
        <div className="whitespace-normal break-words text-xs font-medium leading-snug" title={asset.name}>
          {asset.name}
        </div>
        <div className="flex min-h-0 flex-1 items-center py-0.5">
          {showUsage ? (
            <span className={`text-[10px] leading-tight ${usageCount > 0 ? 'text-emerald-400/80' : 'text-muted-foreground/60'}`}>
              {usageCount > 0 ? t('image.usedByPages', { n: usageCount }) : t('image.unusedByPages')}
            </span>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] text-muted-foreground">{formatSize(asset.size)}</span>
          <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              title={t('image.rename')}
              onClick={(e) => {
                e.stopPropagation()
                onRename(asset)
              }}
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              className="rounded p-1 text-red-400 hover:bg-red-500/15 hover:text-red-300"
              title={t('image.delete')}
              onClick={(e) => {
                e.stopPropagation()
                onDelete(asset)
              }}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}