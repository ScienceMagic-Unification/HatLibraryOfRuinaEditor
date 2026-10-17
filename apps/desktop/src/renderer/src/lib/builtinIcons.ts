import manifest from '../assets/plugins/manifest.json'

const pluginImages = import.meta.glob('../assets/plugins/*.{png,jpg,jpeg,webp,gif}', { eager: true, import: 'default' }) as Record<string, string>
/** All embedded images belong in the browser; only registered keyword icons belong in the keyword resolver. */
export const pluginImageResources = manifest.resources.filter((r) => r.kind === 'image').map((r) => ({ ...r, url: pluginImages[`../assets/plugins/${r.path}`] }))
export const pluginIconResources = manifest.resources.filter((r) => r.kind === 'image' && (/\.buficons\./i.test(r.name) || r.id === 'Hat_Tags_Trait'))
const allModules = {
  ...import.meta.glob('../assets/images/range/*.png', { eager: true, import: 'default' }),
  ...import.meta.glob('../assets/images/dice/*.png', { eager: true, import: 'default' }),
  ...import.meta.glob('../assets/images/chapter/*.png', { eager: true, import: 'default' }),
  ...import.meta.glob('../assets/images/singularity/*.png', { eager: true, import: 'default' }),
  ...import.meta.glob('../assets/images/vanilla/*.png', { eager: true, import: 'default' }),
  ...import.meta.glob('../assets/images/other/*.png', { eager: true, import: 'default' })
} as Record<string, string>

const byBaseName = new Map<string, string>()
for (const [path, url] of Object.entries(allModules)) {
  let base = path.split('/').pop() ?? path
  try {
    base = decodeURIComponent(base)
  } catch {
    // 保留原值
  }
  base = base.replace(/\.(png|jpe?g|webp|gif)$/i, '')
  byBaseName.set(base, url)
}

/** 根据 KeywordIconId 从内置资源中解析图标 URL（可附加额外资源，如 Buff 图标）。 */
export function resolveBuiltinIconUrl(iconId?: string, extra?: Record<string, string>, plugin?: string, sheet?: string): string | undefined {
  if (!iconId) return undefined
  const resources = pluginIconResources.filter((r) => r.id === iconId)
  const resource = resources.find((r) => r.plugin === (sheet || plugin)) ?? (!sheet && resources.length === 1 ? resources[0] : undefined)
  if (resource) return pluginImages[`../assets/plugins/${resource.path}`]
  if (sheet) return undefined // Never substitute an unrelated image for an unavailable atlas.
  return byBaseName.get(iconId) ?? extra?.[iconId]
}
