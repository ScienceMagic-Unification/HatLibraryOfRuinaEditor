import { useState } from 'react'
import { Badge, Button, Select } from '@ruina/ui'
import { ArrowDown, ArrowUp, Copy, FileCode2, Languages, LayoutList, PenLine, Plus, Save, Trash2, Wrench } from 'lucide-react'
import { useI18n } from '../i18n'
import type { DocState } from '../store'
import { useAppStore } from '../store'

/** 标准工作区顶部工具条：新增/复制/删除、排序、本地化文档切换、视图模式、保存/校验。 */
export function WorkspaceToolbar({
  primaryDocs,
  primaryLang,
  onPrimaryLang,
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
  onPrimaryLang: (lang: string) => void
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
  return (
    <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2">
      <div className="flex gap-1">
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
      <div className="mx-1 h-5 w-px bg-border" />
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" className="size-7" title={t('moveUp')} onClick={onMoveUp} disabled={moveDisabled}>
          <ArrowUp />
        </Button>
        <Button size="icon" variant="ghost" className="size-7" title={t('moveDown')} onClick={onMoveDown} disabled={moveDisabled}>
          <ArrowDown />
        </Button>
      </div>
      <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted px-1.5 py-1">
        <span className="text-[10px] text-muted-foreground">{t('doc')}</span>
        <Select.Root value={primaryLang && primaryDocs.some((d) => (d.lang ?? d.path) === primaryLang) ? primaryLang : primaryDocs[0]?.lang ?? '__none__'} onValueChange={onPrimaryLang}>
            <Select.Trigger className="h-7 w-32 text-xs">
              <Select.Value placeholder={t('select.document')} />
            </Select.Trigger>
            <Select.Content>
              {primaryDocs.map((d) => (
                <Select.Item key={d.path} value={d.lang ?? d.path}>
                  {d.langLabel ?? d.lang ?? (d.path.split('\\').pop() as string)}
                </Select.Item>
              ))}
              <Select.Item value="__none__">{t('none')}</Select.Item>
            </Select.Content>
          </Select.Root>
      </div>
      <div className="flex-1" />
      <div className="flex rounded-lg border border-border bg-muted p-0.5">
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
      <span className="text-xs text-muted-foreground">
        {refsCount} {t('entries')} · {t('issues')} {issuesCount}
      </span>
      {dirtyCount > 0 ? (
        <Badge variant="warning">{t('unsaved', { n: dirtyCount })}</Badge>
      ) : (
        <Badge variant="success">{t('saved')}</Badge>
      )}
      <Button size="sm" variant="secondary" onClick={() => {
        void (async () => {
          await onFix()
          setTimeout(() => setNotice(useAppStore.getState().status), 150)
        })()
      }} title="按 XML 规则与特殊规则校验并修复当前工作区" disabled={fixDisabled}>
        <Wrench /> {t('fix')}
      </Button>
      <Button size="sm" onClick={() => {
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