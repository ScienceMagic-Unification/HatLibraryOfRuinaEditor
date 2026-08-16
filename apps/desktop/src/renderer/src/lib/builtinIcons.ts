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
export function resolveBuiltinIconUrl(iconId?: string, extra?: Record<string, string>): string | undefined {
  if (!iconId) return undefined
  return byBaseName.get(iconId) ?? extra?.[iconId]
}
