import type { ModuleDefinition } from '@ruina/editor-core'
import { useI18n } from '../i18n'
import { BadgeCheck, Database, Image as ImageIcon, Swords, Tags } from 'lucide-react'

const ICONS: Record<string, typeof Swords> = { Swords, BadgeCheck, Tags, Image: ImageIcon }

function Graph({
  title,
  icon: Icon,
  ids,
  modules,
  activeId,
  onSelect
}: {
  title: string
  icon: typeof Swords
  ids: string[]
  modules: ModuleDefinition[]
  activeId: string
  onSelect: (id: string) => void
}): JSX.Element | null {
  const { t } = useI18n()
  const items = ids
    .map((id) => modules.find((m) => m.id === id))
    .filter((m): m is ModuleDefinition => Boolean(m))
  if (items.length === 0) return null

  const rowH = 36
  const gap = 6
  const nodeW = 48
  const leftX = 24
  const rightX = 68
  const height = items.length * rowH + (items.length - 1) * gap
  const leftY = height / 2

  return (
    <div className="px-2 pb-3 pt-1">
      <div className="mb-1 px-1 text-sm font-semibold tracking-wide text-primary/80">{title}</div>
      <div className="relative" style={{ height }}>
        <svg className="pointer-events-none absolute inset-0" width="100%" height={height}>
          {items.map((m, i) => {
            const y = i * rowH + i * gap + rowH / 2
            return (
              <path
                key={m.id}
                d={`M ${nodeW} ${leftY} C ${nodeW + 12} ${leftY}, ${rightX - 12} ${y}, ${rightX} ${y}`}
                stroke="hsl(var(--primary) / 0.5)"
                strokeWidth={1.5}
                fill="none"
              />
            )
          })}
        </svg>
        <div
          className="absolute left-0 flex size-12 items-center justify-center rounded-full border border-primary/50 bg-primary/15 text-primary"
          style={{ top: leftY - 24 }}
          title={title}
        >
          <Icon className="size-5" />
        </div>
        <div className="absolute inset-y-0 right-0 flex flex-col justify-between" style={{ left: rightX }}>
          {items.map((m) => {
            const ItemIcon = ICONS[m.icon] ?? Database
            const active = m.id === activeId
            return (
              <button
                key={m.id}
                onClick={() => onSelect(m.id)}
                className={`flex h-9 items-center gap-2 rounded-md border px-2 text-left text-xs transition-colors ${
                  active
                    ? 'border-primary/60 bg-primary/15 font-medium text-primary'
                    : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <ItemIcon className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{t('module.' + m.id) || m.title}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function WorkspaceLinkGraph({
  modules,
  activeId,
  onSelect
}: {
  modules: ModuleDefinition[]
  activeId: string
  onSelect: (id: string) => void
}): JSX.Element | null {
  const { t } = useI18n()
  const groups = [
    { title: t('graph.title'), icon: Swords, ids: ['cardinfo', 'cardname', 'cardability'] },
    { title: t('graph.image'), icon: ImageIcon, ids: ['page-artwork', 'buff-icons', 'other-images'] }
  ]

  return (
    <div className="space-y-1">
      {groups.map((g) => (
        <Graph key={g.ids.join('-')} title={g.title} icon={g.icon} ids={g.ids} modules={modules} activeId={activeId} onSelect={onSelect} />
      ))}
    </div>
  )
}