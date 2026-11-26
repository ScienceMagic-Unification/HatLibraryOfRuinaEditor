import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Pencil, Plus, Search, Tags, Trash2, X } from 'lucide-react'
import { Button, Input } from '@ruina/ui'
import { getFieldValue, listEntities } from '@ruina/editor-core'
import { useI18n } from '../i18n'
import { useAppStore } from '../store'
import { decodeTarget, deleteTag, emptyProject, projectKey, tagName, targetKey, toggleTag, useAnnotations, useTagNavigation, type Tag, type Target } from '../lib/annotations'
import { sourceCaption } from '../lib/localizationSources'

function useProjectTags() {
  const path = useAppStore((s) => s.modPath ?? '')
  const project = useAnnotations((s) => s.projects[projectKey(path)] ?? emptyProject)
  return { path, project }
}

function Swatch({ color }: { color: string }): JSX.Element {
  return <span aria-hidden className="size-2 shrink-0 rounded-full ring-1 ring-current/20" style={{ backgroundColor: color }}/>
}

export function AnnotationBar({ target }: { target: Target }): JSX.Element | null {
  const { t } = useI18n()
  const { path, project } = useProjectTags()
  const enabled = useAnnotations((s) => s.enabled)
  const open = useTagNavigation((s) => s.open)
  if (!enabled || !path) return null
  const assigned = project.links[targetKey(target)] ?? []
  return <section aria-label={t('tags.assign')} className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border bg-card px-3 py-2">
    <Tags aria-hidden className="mr-1 size-4 text-muted-foreground"/>
    {project.tags.map((tag) => {
      const checked = assigned.includes(tag.id)
      return <button key={tag.id} type="button" aria-pressed={checked} onClick={() => toggleTag(path, target, tag.id)}
        style={{ borderColor: checked ? tag.color : undefined }}
        className={'inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-accent ' + (checked ? 'bg-secondary text-foreground' : 'border-border text-muted-foreground')}>
        <Swatch color={tag.color}/><span className="truncate">{tagName(tag, t)}</span>{checked && <Check className="size-3"/>}
      </button>
    })}
    <button aria-label={t('tags.manage')} title={t('tags.manage')} className="rounded p-1 text-muted-foreground hover:bg-accent" onClick={() => open('manage')}><Pencil className="size-3.5"/></button>
  </section>
}

export function AnnotationControls(): JSX.Element {
  const { t } = useI18n()
  const { path } = useProjectTags()
  const { enabled, toggleMode } = useAnnotations()
  const { filter, open } = useTagNavigation()
  useEffect(() => { open(null) }, [path, open])
  return <div className="inline-flex shrink-0 items-center gap-0.5">
    <Button size="sm" variant="outline" aria-pressed={enabled} disabled={!path}
      className={enabled ? 'border-violet-400/70 bg-violet-400/15 text-violet-200' : ''}
      onClick={() => { toggleMode(); open(null) }}><Tags className="size-4"/>{t('tags.mode')}</Button>
    {enabled && path && <Button size="icon" variant="ghost" aria-label={t('tags.lookup')} title={t('tags.lookup')} onClick={() => open('all')}><Search className="size-4"/></Button>}
    {enabled && path && filter && <TagDialog key={path} filter={filter}/>}
  </div>
}

function TagDialog({ filter }: { filter: string }): JSX.Element {
  const { t } = useI18n()
  const { path, project } = useProjectTags()
  const docs = useAppStore((s) => s.docs)
  const modules = useAppStore((s) => s.modules)
  const { open, jump } = useTagNavigation()
  const update = useAnnotations((s) => s.update)
  const dialog = useRef<HTMLDialogElement>(null)
  const [editing, setEditing] = useState<Tag | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    const el = dialog.current
    el?.showModal()
    return () => el?.close()
  }, [])
  const records = useMemo(() => {
    const bySource = new Map<string, Map<string, ReturnType<typeof listEntities>>>()
    return Object.entries(project.links).flatMap(([key, ids]) => {
      const target = decodeTarget(key)
      const module = modules.find((m) => m.id === target.moduleId)
      if (!module) return []
      let name = ''
      if (target.path) {
        const doc = docs[target.path]
        if (!doc?.bindings[module.id]) return []
        const group = JSON.stringify([module.id, target.path])
        let byId = bySource.get(group)
        if (!byId) {
          byId = new Map()
          for (const ref of listEntities(doc.doc, module.entity)) {
            const items = byId.get(ref.id) ?? []
            items.push(ref)
            byId.set(ref.id, items)
          }
          bySource.set(group, byId)
        }
        const ref = byId.get(target.id)?.[target.ordinal]
        if (!ref) return []
        const field = module.entity.fields.find((f) => f.name === (module.entity.displayField ?? 'Name'))
        if (field) name = String(getFieldValue(ref.node, field) ?? '').split('\n')[0]
      }
      return [{ key, ids, target, name, language: docs[target.path]?.langLabel }]
    })
  }, [project.links, docs, modules])
  const needle = query.trim().toLowerCase()
  const results = records.filter((r) => (filter === 'all' || r.ids.includes(filter)) && [r.target.id, r.name, r.target.path].some((v) => v.toLowerCase().includes(needle)))
  const go = async (target: Target) => {
    const state = useAppStore.getState()
    if (target.path) {
      state.setPrimaryDoc(target.moduleId, target.path)
      state.setPrimaryLang(target.moduleId, state.docs[target.path].lang ?? target.path)
    }
    await state.openWorkspaceAndSelect(target.moduleId, target.id)
    jump({ ...target })
  }
  const startEdit = (tag?: Tag) => {
    setEditing(tag ? { ...tag, name: tagName(tag, t) } : { id: crypto.randomUUID(), name: '', color: '#22d3ee' })
    setRemoving(null)
    setError('')
  }
  const save = () => {
    if (!editing) return
    const name = editing.name.trim()
    if (!name || project.tags.some((tag) => tag.id !== editing.id && tagName(tag, t).toLowerCase() === name.toLowerCase())) {
      setError(t('tags.invalid')); return
    }
    const tag = { ...editing, name }
    update(path, (data) => ({ ...data, tags: data.tags.some((v) => v.id === tag.id) ? data.tags.map((v) => v.id === tag.id ? tag : v) : [...data.tags, tag] }))
    setEditing(null)
  }
  return <dialog ref={dialog} onCancel={() => open(null)} aria-label={t('tags.lookup')}
    className="fixed inset-0 m-auto w-[min(42rem,92vw)] rounded-xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/60">
    <div className="flex max-h-[76vh] flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-3"><h2 className="flex items-center gap-2 font-semibold"><Tags className="size-4 text-primary"/>{t('tags.lookup')}</h2>
        <Button size="icon" variant="ghost" aria-label={t('tags.close')} onClick={() => open(null)}><X className="size-4"/></Button></header>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border p-3">
        <Button size="sm" aria-pressed={filter === 'all'} variant={filter === 'all' ? 'secondary' : 'ghost'} onClick={() => open('all')}>{t('tags.all')} · {records.length}</Button>
        {project.tags.map((tag) => <Button size="sm" key={tag.id} aria-pressed={filter === tag.id} variant={filter === tag.id ? 'secondary' : 'ghost'} onClick={() => open(tag.id)}><Swatch color={tag.color}/>{tagName(tag, t)} · {records.filter((r) => r.ids.includes(tag.id)).length}</Button>)}
        <Button size="icon" variant={filter === 'manage' ? 'secondary' : 'ghost'} aria-label={t('tags.manage')} title={t('tags.manage')} onClick={() => open('manage')}><Pencil className="size-4"/></Button>
      </div>
      {filter === 'manage' ? <div className="space-y-2 overflow-y-auto p-4">
        {project.tags.map((tag) => <div key={tag.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-1">
          <Swatch color={tag.color}/><span className="min-w-0 flex-1 break-all text-sm">{tagName(tag, t)}</span>
          <Button size="icon" variant="ghost" aria-label={t('tags.edit') + ' ' + tagName(tag, t)} onClick={() => startEdit(tag)}><Pencil className="size-3.5"/></Button>
          {removing === tag.id ? <Button size="sm" variant="destructive" onClick={() => { deleteTag(path, tag.id); setRemoving(null); setEditing(null) }}>{t('confirm.ok')}</Button>
            : <Button size="icon" variant="ghost" aria-label={t('delete') + ' ' + tagName(tag, t)} onClick={() => setRemoving(tag.id)}><Trash2 className="size-3.5"/></Button>}
        </div>)}
        {editing ? <form className="flex flex-wrap items-center gap-2 pt-2" onSubmit={(e) => { e.preventDefault(); save() }}>
          <input type="color" aria-label={t('tags.color')} className="h-8 w-9 cursor-pointer" value={editing.color} onChange={(e) => setEditing({ ...editing, color: e.target.value })}/>
          <Input autoFocus maxLength={48} aria-label={t('tags.name')} placeholder={t('tags.name')} className="min-w-0 flex-1" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })}/>
          <Button size="sm" type="submit">{t('apply')}</Button>{error && <span role="alert" className="w-full text-xs text-red-300">{error}</span>}
        </form> : <Button size="sm" variant="outline" onClick={() => startEdit()}><Plus className="size-4"/>{t('tags.create')}</Button>}
      </div> : <><div className="p-3"><Input value={query} placeholder={t('search.idName')} aria-label={t('search.idName')} onChange={(e) => setQuery(e.target.value)}/></div>
        <div className="overflow-y-auto px-3 pb-3">{results.map(({ key, target, name, ids, language }) => <button key={key} title={target.path || target.id} className="block w-full rounded-md border-b border-border px-3 py-2 text-left hover:bg-accent" onClick={() => void go(target)}>
          <span className="block break-all text-sm font-medium">{name ? name + ' · ' : ''}{target.id}</span>
          <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{t('module.' + target.moduleId.split('@')[0])}{target.path && <span title={target.path}>{[sourceCaption(target.path), language].filter(Boolean).join(' · ')}</span>}
            {target.ordinal > 0 && <span>#{target.ordinal + 1}</span>}{project.tags.filter((tag) => ids.includes(tag.id)).map((tag) => <span key={tag.id} className="inline-flex items-center gap-1"><Swatch color={tag.color}/>{tagName(tag, t)}</span>)}</span>
        </button>)}{!results.length && <p className="p-5 text-center text-sm text-muted-foreground">{t('noMatch')}</p>}</div></>}
    </div>
  </dialog>
}
