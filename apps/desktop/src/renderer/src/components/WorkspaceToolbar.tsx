import { useState } from 'react'
import { Badge, Button, Select } from '@ruina/ui'
import { ArrowDown, ArrowUp, Copy, FileCode2, FolderOpen, Languages, LayoutList, PenLine, Plus, Save, Trash2, Wrench, X } from 'lucide-react'
import { useI18n } from '../i18n'
import type { DocState } from '../store'
import { useAppStore } from '../store'

/** 标准工作区顶部工具条：新增/复制/删除、排序、本地化文档切换、视图模式、保存/校验。 */
export function WorkspaceToolbar({
  primaryDocs,
  primaryLang,
  primaryDocPath,
  onPrimaryDoc,
  onImportDoc,
  onRemoveDoc,
  removeDisabled,
  viewMode,
  onViewMode,
  noBrief,
  noSource,
  refsCount,
  issuesCount,
  dirtyCount,
  addDisabled,
  duplicateDisabled,
  deleteDisabled,
  moveDisabled,
  fixDisabled,
  onAdd,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onFix,
  onSave
}: {
  primaryDocs: DocState[]
  primaryLang?: string
  primaryDocPath?: string
  onPrimaryDoc: (value: string) => void
  onImportDoc: () => void
  onRemoveDoc: () => void
  removeDisabled?: boolean
  viewMode: 'brief' | 'detail' | 'source'
  onViewMode: (mode: 'brief' | 'detail' | 'source') => void
  noBrief?: boolean
  noSource?: boolean
  refsCount: number
  issuesCount: number
  dirtyCount: number
  addDisabled?: boolean
  duplicateDisabled?: boolean
  deleteDisabled?: boolean
  moveDisabled?: boolean
  fixDisabled?: boolean
  onAdd: () => void
  onDuplicate: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onFix: () => void
  onSave: () => void
}): JSX.Element {
  const { t } = useI18n()
  const [notice, setNotice] = useState<string | null>(null)
  const docName = (p: string): string => p.replace(/\\/g, '/').split('/').pop() ?? p
  const langHint = (d: DocState): string => (d.lang && d.lang !== 'unknown' ? (d.langLabel ?? d.lang) : '')
  const selectedLabel = (() => {
    if (primaryLang === '__none__') return t('none')
    const d = primaryDocs.find((x) => x.path === primaryDocPath) ?? primaryDocs[0]
    return d ? `${docName(d.path)}${langHint(d) ? ' · ' + langHint(d) : ''}` : t('none')
  })()
  return (
    <div className="flex h-[52px] shrink-0 items-center gap-2 overflow-hidden border-b border-border bg-card px-3 py-2">
      <div className="flex shrink-0 gap-1">
        <Button size="sm" variant="secondary" onClick={onAdd} disabled={addDisabled}>
          <Plus /> {t('add')}
        </Button>
        <Button size="sm" variant="secondary" onClick={onDuplicate} disabled={duplicateDisabled}>
          <Copy /> {t('duplicate')}
        </Button>
        <Button size="sm" variant="secondary" onClick={onDelete} disabled={deleteDisabled}>
          <Trash2 /> {t('delete')}
        </Button>
      </div>
      <div className="mx-1 h-5 w-px shrink-0 bg-border" />
      <div className="flex shrink-0 gap-1">
        <Button size="icon" variant="ghost" className="size-7" title={t('moveUp')} onClick={onMoveUp} disabled={moveDisabled}>
          <ArrowUp />
        </Button>
        <Button size="icon" variant="ghost" className="size-7" title={t('moveDown')} onClick={onMoveDown} disabled={moveDisabled}>
          <ArrowDown />
        </Button>
      </div>
      <div className="flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-muted px-1.5 py-1">
        <span className="shrink-0 text-[10px] text-muted-foreground">{t('doc')}</span>
        <Select.Root value={primaryLang === '__none__' ? '__none__' : (primaryDocPath && primaryDocs.some((d) => d.path === primaryDocPath) ? primaryDocPath : (primaryDocs[0]?.path ?? '__none__'))} onValueChange={onPrimaryDoc}>
          <Select.Trigger className="h-7 w-40 max-w-full text-xs" title={selectedLabel}>
            <span className="min-w-0 flex-1 truncate text-left">{selectedLabel}</span>
          </Select.Trigger>
          <Select.Content>
            {primaryDocs.map((d) => (
              <Select.Item key={d.path} value={d.path} textValue={docName(d.path) + (langHint(d) ? ' ' + langHint(d) : '')} title={d.path}>
                <span className="inline-block max-w-[180px] truncate align-bottom">{docName(d.path)}</span>
                {langHint(d) ? <span className="ml-1 text-[10px] text-muted-foreground/70">{langHint(d)}</span> : null}
              </Select.Item>
            ))}
            <Select.Item value="__none__">{t('none')}</Select.Item>
          </Select.Content>
        </Select.Root>
        <Button size="icon" variant="ghost" className="size-7" title={t('doc.import')} onClick={onImportDoc}>
          <FolderOpen className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" className="size-7" title={t('doc.remove')} onClick={onRemoveDoc} disabled={removeDisabled}>
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex-1" />
      <div className="flex shrink-0 rounded-lg border border-border bg-muted p-0.5">
        {(
          [
            { id: 'brief', label: t('brief'), icon: LayoutList },
            { id: 'detail', label: t('detail'), icon: PenLine },
            { id: 'source', label: t('source'), icon: FileCode2 }
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            onClick={() => onViewMode(m.id)}
            disabled={(noBrief && m.id === 'brief') || (noSource && m.id === 'source')}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              viewMode === m.id ? 'bg-background text-foreground shadow' : 'text-muted-foreground hover:text-foreground'
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <m.icon className="size-3.5" />
            {m.label}
          </button>
        ))}
      </div>
      <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
        {refsCount} {t('entries')} · {t('issues')} {issuesCount}
      </span>
      {dirtyCount > 0 ? (
        <Badge variant="warning" className="shrink-0 whitespace-nowrap">{t('unsaved', { n: dirtyCount })}</Badge>
      ) : (
        <Badge variant="success" className="shrink-0 whitespace-nowrap">{t('saved')}</Badge>
      )}
      <Button size="sm" variant="secondary" className="shrink-0" onClick={() => {
        void (async () => {
          await onFix()
          setTimeout(() => setNotice(useAppStore.getState().status), 150)
        })()
      }} title="按 XML 规则与特殊规则校验并修复当前工作区" disabled={fixDisabled}>
        <Wrench /> {t('fix')}
      </Button>
      <Button size="sm" className="shrink-0" onClick={() => {
        void (async () => {
          await onSave()
          setNotice(useAppStore.getState().status)
        })()
      }} disabled={dirtyCount === 0}>
        <Save /> {t('saveModule')}
      </Button>
      {notice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-4 shadow-2xl">
            <div className="mb-3 text-sm font-medium text-foreground">{t('fix')} / {t('saveModule')}</div>
            <div className="mb-4 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">{notice}</div>
            <button className="w-full rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90" onClick={() => setNotice(null)}>OK</button>
          </div>
        </div>
      ) : null}
    </div>
  )
}