import { useRef, useState } from 'react'
import { FolderOpen, Loader2, UploadCloud } from 'lucide-react'
import { api, type ImageAssetInfo } from '../api'
import { useI18n } from '../i18n'

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function ImageImportDrop({
  dir,
  onImported
}: {
  dir: string
  onImported: (assets: ImageAssetInfo[]) => void
}): JSX.Element {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)

  const importPaths = async (paths: string[]) => {
    if (paths.length === 0) return
    setBusy(true)
    try {
      const out: ImageAssetInfo[] = []
      for (const p of paths) out.push(await api.importImage(dir, p))
      onImported(out)
    } finally {
      setBusy(false)
    }
  }

  const importFiles = async (files: File[]) => {
    if (files.length === 0) return
    setBusy(true)
    try {
      const out: ImageAssetInfo[] = []
      for (const file of files) {
        if (!/^image\//.test(file.type)) continue
        const dataUrl = await readAsDataUrl(file)
        out.push(await api.importImageData(dir, file.name, dataUrl))
      }
      onImported(out)
    } finally {
      setBusy(false)
    }
  }

  const browse = async () => {
    const paths = await api.pickImageFiles()
    await importPaths(paths ?? [])
  }

  return (
    <div
      className={`flex min-h-24 items-center justify-center gap-3 rounded-lg border border-dashed px-4 py-3 transition-colors ${
        dragging ? 'border-primary/70 bg-primary/10' : 'border-border bg-secondary/20 hover:border-primary/40'
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        void importFiles(Array.from(e.dataTransfer.files))
      }}
    >
      {busy ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t('loading', { title: '' })}
        </div>
      ) : (
        <>
          <UploadCloud className="size-6 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{t('image.dropHint')}</div>
            <div className="text-[11px] text-muted-foreground">PNG / JPG / WEBP / GIF</div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-accent"
            onClick={() => void browse()}
          >
            <FolderOpen className="size-4" />
            {t('image.import')}
          </button>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) void importFiles(Array.from(e.target.files))
          e.target.value = ''
        }}
      />
    </div>
  )
}