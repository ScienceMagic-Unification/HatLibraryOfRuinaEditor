import { useState, type ReactNode } from 'react'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useI18n } from '../i18n'

/** 右侧可拉出功能按钮区模板：覆盖在现有 UI 上方，不挤占工作区列宽。 */
export function ToolDrawer({
  open,
  onToggle,
  children
}: {
  open: boolean
  onToggle: () => void
  children: ReactNode
}): JSX.Element {
  const { t } = useI18n()
  const [hover, setHover] = useState(false)

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 z-30">
      <div
        className={`pointer-events-auto absolute inset-y-0 right-0 w-[360px] max-w-[80vw] border-l border-border bg-card shadow-2xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          className="absolute -left-4 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 rounded-md border border-border bg-secondary px-1.5 py-3 text-xs text-muted-foreground shadow-lg hover:bg-accent"
        >
          <ChevronsRight className="size-4" />
        </button>
        <div className="h-full w-full min-w-0 overflow-y-auto overscroll-contain pl-8 pr-3">{children}</div>
      </div>

      {!open ? (
        <div
          className="pointer-events-none absolute inset-y-0 right-0"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <button
            type="button"
            onClick={onToggle}
            className={`pointer-events-auto absolute right-0 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 rounded-l-md border border-r-0 border-border bg-secondary px-1.5 py-3 text-xs text-muted-foreground shadow-lg transition-transform duration-200 hover:bg-accent ${
              hover ? '-translate-x-1' : ''
            }`}
          >
            <ChevronsLeft className="size-4" />
            {hover ? <span className="[writing-mode:vertical-rl]">{t('tools')}</span> : null}
          </button>
        </div>
      ) : null}
    </div>
  )
}