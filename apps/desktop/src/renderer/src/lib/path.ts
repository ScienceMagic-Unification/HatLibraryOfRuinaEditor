/** 跨平台路径拼接（统一使用 /），Windows 绝对路径保持不变 */
export function joinPath(...parts: string[]): string {
  const first = parts.find((p) => p !== '') ?? ''
  const isAbs = /^[a-zA-Z]:[\\/]/.test(first) || first.startsWith('/')
  let p = parts.filter(Boolean).join('/').replace(/\/+/g, '/')
  if (isAbs && /^[a-zA-Z]:\//.test(p)) p = p.slice(0, 2) + '\\' + p.slice(3)
  return p
}