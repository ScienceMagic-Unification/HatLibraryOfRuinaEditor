import { useI18n } from '../i18n'

export function ConfirmDialog({
  open,
  message,
  onCancel,
  onConfirm
}: {
  open: boolean
  message: string
  onCancel: () => void
  onConfirm: () => void
}): JSX.Element | null {
  const { t } = useI18n()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl">
        <div className="mb-1 text-base font-semibold text-foreground">{t('confirm.title')}</div>
        <p className="mb-4 text-sm text-muted-foreground">{message}</p>
        <div className="flex justify-end gap-2">
          <button className="rounded-md border border-border bg-secondary px-4 py-2 text-sm text-secondary-foreground hover:bg-accent" onClick={onCancel}>
            {t('confirm.cancel')}
          </button>
          <button className="rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90" onClick={onConfirm}>
            {t('confirm.ok')}
          </button>
        </div>
      </div>
    </div>
  )
}