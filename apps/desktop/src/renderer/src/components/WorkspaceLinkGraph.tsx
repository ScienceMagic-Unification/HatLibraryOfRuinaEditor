import type { ModuleDefinition } from '@ruina/editor-core'
import { useI18n } from '../i18n'
import { useAppStore } from '../store'
import { BadgeCheck, BookOpen, Database, FileCode2, FileText, Image as ImageIcon, MoreHorizontal, Shield, Skull, Sparkles, Swords, Tags, User } from 'lucide-react'

const ICONS: Record<string, typeof Swords> = { Swords, BadgeCheck, Tags, Image: ImageIcon, FileCode2, FileText, Sparkles, Shield, Skull, User, BookOpen }

function Graph({
  title,
  icon: Icon,
  ids,
  modules,
  activeId,
  onSelect,
  disabled = false,
  emptyIds
}: {
  title: string
  icon: typeof Swords
  ids: string[]
  modules: ModuleDefinition[]
  activeId: string
  onSelect: (id: string) => void
  disabled?: boolean
  emptyIds?: Set<string>
}): JSX.Element | null {
  const { t } = useI18n()
  const items = ids
    .map((id) => modules.find((m) => m.id === id))
    .filter((m): m is ModuleDefinition => Boolean(m))
  if (items.length === 0) return null

  const rowH = 34
  const gap = 5
  const circleSize = 44
  const rightX = circleSize + 10
  const circleCenterY = circleSize / 2
  const height = Math.max(items.length * rowH + (items.length - 1) * gap, circleSize)

  return (
    <div className="px-2 pb-3 pt-1">
      <div className={`mb-1 px-1 text-sm font-semibold tracking-wide ${disabled ? 'text-muted-foreground/60' : 'text-primary/80'}`}>{title}</div>
      <div className="relative" style={{ height }}>
        <svg className="pointer-events-none absolute inset-0" width="100%" height={height}>
          {items.map((m, i) => {
            const y = i * rowH + i * gap + rowH / 2
            return (
              <path
                key={m.id}
                d={`M ${circleSize} ${circleCenterY} C ${circleSize + 6} ${circleCenterY}, ${rightX - 6} ${y}, ${rightX} ${y}`}
                stroke={disabled ? 'hsl(var(--muted-foreground) / 0.35)' : 'hsl(var(--primary) / 0.5)'}
                strokeWidth={1.5}
                fill="none"
              />
            )
          })}
        </svg>
        <div
          className={`absolute left-0 top-0 flex items-center justify-center rounded-full border ${disabled ? 'border-border bg-secondary/40 text-muted-foreground/60' : 'border-primary/50 bg-primary/15 text-primary'}`}
          style={{ width: circleSize, height: circleSize }}
          title={title}
        >
          <Icon className="size-5" />
        </div>
        <div className="absolute inset-y-0 right-0 flex flex-col" style={{ left: rightX, gap }}>
          {items.map((m) => {
            const ItemIcon = ICONS[m.icon] ?? Database
            const active = m.id === activeId
            const empty = emptyIds?.has(m.id)
            return (
              <button
                key={m.id}
                onClick={() => onSelect(m.id)}
                disabled={disabled}
                className={`flex items-center gap-2 rounded-md border px-2 text-left text-xs transition-colors ${
                  disabled
                    ? 'cursor-not-allowed border-border bg-card text-muted-foreground/50 opacity-60'
                    : active
                      ? 'border-primary/60 bg-primary/15 font-medium text-primary'
                      : empty
                        ? 'border-red-500/70 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                        : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
                style={{ height: rowH }}
              >
                <ItemIcon className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{(t('module.' + m.id) === 'module.' + m.id ? m.title : t('module.' + m.id))}</span>
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
  onSelect,
  hatEnabled
}: {
  modules: ModuleDefinition[]
  activeId: string
  onSelect: (id: string) => void
  hatEnabled: boolean
}): JSX.Element | null {
  const { t } = useI18n()
  const docs = useAppStore((s) => s.docs)

  const groups = [
    { title: t('graph.title'), icon: Swords, ids: ['cardinfo', 'cardname', 'cardability'], disabled: false },
    { title: t('graph.keypages'), icon: BookOpen, ids: ['equippage-enemy', 'equippage-librarian', 'bookstory'], disabled: false },
    { title: t('graph.passive'), icon: Shield, ids: ['passive', 'passiveability'], disabled: false },
    { title: t('graph.effect'), icon: FileText, ids: ['effecttext'], disabled: false },
    { title: t('graph.image'), icon: ImageIcon, ids: ['page-artwork', 'buff-icons', 'other-images'], disabled: false },
    { title: t('graph.singularity'), icon: Sparkles, ids: ['builtin-images', 'vanilla-regex', 'singularity-regex', 'mod-regex'], disabled: !hatEnabled }
  ]

  const knownIds = new Set(groups.flatMap((g) => g.ids))
  const otherIds = modules.filter((m) => !knownIds.has(m.id)).map((m) => m.id)

  const emptyIds = new Set<string>()
  for (const m of modules) {
    if (m.resource || m.builtin || m.modRegex) continue
    const hasDoc = Object.values(docs).some((d) => d.bindings[m.id])
    if (!hasDoc) emptyIds.add(m.id)
  }

  return (
    <div className="space-y-1">
      {groups.map((g) => (
        <Graph key={g.ids.join('-')} title={g.title} icon={g.icon} ids={g.ids} modules={modules} activeId={activeId} onSelect={onSelect} disabled={g.disabled} emptyIds={emptyIds} />
      ))}
      {otherIds.length > 0 ? (
        <Graph key="other" title={t('graph.other')} icon={MoreHorizontal} ids={otherIds} modules={modules} activeId={activeId} onSelect={onSelect} disabled={false} emptyIds={emptyIds} />
      ) : null}
    </div>
  )
}