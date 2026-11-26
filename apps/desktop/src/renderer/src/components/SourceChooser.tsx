import { Button } from '@ruina/ui'
import { useI18n } from '../i18n'
import { sourceName } from '../lib/localizationSources'

export function SourceChooser({ paths, onChoose, onCancel }: { paths: string[]; onChoose: (path: string) => void; onCancel: () => void }): JSX.Element {
  const { t } = useI18n()
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/50" onKeyDown={(e) => { if (e.key === 'Escape') onCancel() }}>
    <section role="dialog" aria-label={t('doc.destination')} className="max-h-[80vh] max-w-lg space-y-2 overflow-auto rounded-xl border border-border bg-card p-4 shadow-xl">
      <h2 className="text-sm font-medium">{t('doc.destination')}</h2>
      {paths.map((path) => <Button key={path} autoFocus={path === paths[0]} title={path} variant="secondary" className="block w-full text-left" onClick={() => onChoose(path)}>
        {paths.some((p) => p !== path && sourceName(p) === sourceName(path)) ? path : sourceName(path)}
      </Button>)}
      <Button variant="ghost" onClick={onCancel}>{t('cancel')}</Button>
    </section>
  </div>
}
