import { useMemo, useState } from 'react'
import type { ModuleDefinition } from '@ruina/editor-core'
import { useI18n } from '../i18n'
import { Input } from '@ruina/ui'
import { pluginImageResources } from '../lib/builtinIcons'

type BuiltinImageTab = 'range' | 'dice' | 'chapter' | 'singularity' | 'vanilla' | 'other'

const imageModules: Record<BuiltinImageTab, Record<string, string>> = {
  range: import.meta.glob('../assets/images/range/*.png', { eager: true, import: 'default' }) as Record<string, string>,
  dice: import.meta.glob('../assets/images/dice/*.png', { eager: true, import: 'default' }) as Record<string, string>,
  chapter: import.meta.glob('../assets/images/chapter/*.png', { eager: true, import: 'default' }) as Record<string, string>,
  singularity: import.meta.glob('../assets/images/singularity/*.png', { eager: true, import: 'default' }) as Record<string, string>,
  vanilla: import.meta.glob('../assets/images/vanilla/*.png', { eager: true, import: 'default' }) as Record<string, string>,
  other: import.meta.glob('../assets/images/other/*.png', { eager: true, import: 'default' }) as Record<string, string>
}

interface BuiltinImageEntry {
  name: string
  url: string
  plugin?: string
  resourceName?: string
}

function toEntries(modules: Record<string, string>): BuiltinImageEntry[] {
  return Object.entries(modules)
    .map(([path, url]) => {
      const rawName = path.split('/').pop() ?? path
      let name = rawName
      try {
        name = decodeURIComponent(rawName)
      } catch {
        // 文件名不是编码路径时保留原值
      }
      return { name, url }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
}

const TABS: { id: BuiltinImageTab; labelKey: string }[] = [
  { id: 'range', labelKey: 'tab.range' },
  { id: 'dice', labelKey: 'tab.dice' },
  { id: 'chapter', labelKey: 'tab.chapter' },
  { id: 'singularity', labelKey: 'tab.singularity' },
  { id: 'vanilla', labelKey: 'tab.vanilla' },
  { id: 'other', labelKey: 'tab.other' }
]

// Legacy copies remain available to icon resolution, but have one home in the gallery.
const pluginImageIds = new Set(pluginImageResources.map((resource) => resource.id))
const otherImages = toEntries(imageModules.other).filter((entry) => !pluginImageIds.has(entry.name.replace(/\.png$/i, '')))

/** 奇点大工作区 - 内置图片：只读平铺展示，无导入/删除/重命名。 */
export function BuiltinImageWorkspace({ module }: { module: ModuleDefinition }): JSX.Element {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState<BuiltinImageTab>('range')
  const [query, setQuery] = useState('')
  const entries = useMemo<BuiltinImageEntry[]>(() => activeTab === 'singularity'
    ? pluginImageResources.map((r) => ({ name: r.id, url: r.url, plugin: r.plugin, resourceName: r.name })).sort((a, b) => a.name.localeCompare(b.name))
    : activeTab === 'other' ? otherImages : toEntries(imageModules[activeTab]), [activeTab])
  const filtered = useMemo(() => entries.filter((e) => `${e.name} ${e.plugin ?? ''} ${e.resourceName ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())), [entries, query])

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="builtin-images">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
        <Input className="ml-auto w-60" value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t('keyword.search')} placeholder={t('keyword.search')}/>
        <span className="text-xs text-muted-foreground">{t('builtin.readonlyHint')}</span>
        <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {t('total', { n: entries.length })}{query ? ` · ${t('hits', { n: filtered.length })}` : ''}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t('image.empty')}</div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {filtered.map((entry) => (
              <div key={entry.resourceName ?? entry.name} data-resource-id={entry.name} className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex h-28 items-center justify-center overflow-hidden bg-black/30 p-2">
                  <img
                    src={entry.url}
                    alt={entry.name}
                    draggable={false}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="break-all border-t border-border px-2 py-1.5 text-center text-xs text-muted-foreground" title={entry.resourceName ?? entry.name}>
                  {entry.name}{entry.plugin ? <div className="mt-1 text-[10px] text-muted-foreground/70">{entry.plugin}</div> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
