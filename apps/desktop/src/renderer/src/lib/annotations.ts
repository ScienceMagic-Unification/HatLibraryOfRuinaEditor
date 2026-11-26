import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ListRow } from './localizationSources'

export interface Tag { id: string; name: string; color: string }
export interface Target { moduleId: string; path: string; id: string; ordinal: number }
export interface GroupLayout { enabled: boolean; order: string[]; names: Record<string, string>; collapsed: string[] }
export interface Placement { group: string; rank: number }
export interface ProjectTags { layouts?: Record<string, GroupLayout>; placements?: Record<string, Placement>; tags: Tag[]; links: Record<string, string[]> }

const defaults = [['done', '#4ade80'], ['todo', '#60a5fa'], ['undecided', '#fbbf24'], ['placeholder', '#c084fc']]
export const emptyProject: ProjectTags = { tags: defaults.map(([id, color]) => ({ id, name: '', color })), links: {} }
export const tagName = (tag: Tag, t: (key: string) => string): string => tag.name || t('tags.' + tag.id)
export const projectKey = (path: string): string => path.replace(/\\/g, '/').replace(/\/$/, '')
export const supportsTags = (id: string): boolean => /^(cardinfo|cardname|cardability|passive|passiveability|equippage-(enemy|librarian)|vanilla-(cards|abilities|passives)|singularity-abilities)(@|$)/.test(id)
export const targetKey = (target: Target): string => JSON.stringify([target.moduleId, target.path, target.id, target.ordinal])
export function decodeTarget(key: string): Target {
  const [moduleId, path, id, ordinal] = JSON.parse(key)
  return { moduleId, path, id, ordinal }
}

// The ordinal only counts equal IDs within this particular source.
export function rowTargets(moduleId: string, path: string, rows: ListRow[]): Target[] {
  const counts = new Map<string, number>()
  return rows.map((row) => {
    const source = row.source ?? path
    const key = JSON.stringify([source, row.id])
    const ordinal = counts.get(key) ?? 0
    counts.set(key, ordinal + 1)
    return { moduleId, path: source, id: row.id, ordinal }
  })
}

interface Annotations {
  enabled: boolean
  projects: Record<string, ProjectTags>
  toggleMode: () => void
  update: (project: string, change: (data: ProjectTags) => ProjectTags) => void
}
export const useAnnotations = create<Annotations>()(persist((set) => ({
  enabled: false,
  projects: {},
  toggleMode: () => set((s) => ({ enabled: !s.enabled })),
  update: (project, change) => set((s) => {
    const key = projectKey(project)
    return { projects: { ...s.projects, [key]: change(s.projects[key] ?? emptyProject) } }
  })
}), { name: 'ruina.annotations.v1' }))

export function toggleTag(project: string, target: Target, tagId: string): void {
  useAnnotations.getState().update(project, (data) => {
    const key = targetKey(target)
    const links = { ...data.links }, ids = links[key] ?? []
    links[key] = ids.includes(tagId) ? ids.filter((id) => id !== tagId) : [...ids, tagId]
    if (!links[key].length) delete links[key]
    return { ...data, links }
  })
}

export function deleteTag(project: string, id: string): void {
  useAnnotations.getState().update(project, (data) => {
    const links: Record<string, string[]> = {}
    for (const [key, ids] of Object.entries(data.links)) {
      const rest = ids.filter((v) => v !== id)
      if (rest.length) links[key] = rest
    }
    return { ...data, tags: data.tags.filter((tag) => tag.id !== id), links }
  })
}

// Dialog and navigation state only live for the current editor session.
export const useTagNavigation = create<{
  filter: string | null
  focus: Target | null
  open: (filter: string | null) => void
  jump: (target: Target) => void
}>((set) => ({ filter: null, focus: null, open: (filter) => set({ filter }), jump: (focus) => set({ focus, filter: null }) }))
