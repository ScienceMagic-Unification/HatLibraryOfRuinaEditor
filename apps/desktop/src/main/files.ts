import { copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { app } from 'electron'
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path'

export async function listXmlFiles(dir: string): Promise<{ name: string; size: number }[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const out: { name: string; size: number }[] = []
    for (const e of entries) {
      if (!e.isFile() || !e.name.toLowerCase().endsWith('.xml')) continue
      const p = join(dir, e.name)
      const s = await stat(p).catch(() => null)
      out.push({ name: e.name, size: s?.size ?? 0 })
    }
    return out.sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}

export async function readTextFile(path: string): Promise<string> {
  return readFile(path, 'utf8')
}

export async function saveTextFile(path: string, content: string): Promise<{ backupPath: string | null }> {
  const original = await readFile(path, 'utf8').catch(() => null)
  let backupPath: string | null = null
  if (original !== null) {
    const day = new Date().toISOString().slice(0, 10)
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    backupPath = join(app.getPath('userData'), 'backups', day, `${stamp}_${basename(path)}`)
    await mkdir(join(app.getPath('userData'), 'backups', day), { recursive: true })
    await writeFile(backupPath, original, 'utf8')
  }
  const tmp = `${path}.ruina-tmp`
  await writeFile(tmp, content, 'utf8')
  await rename(tmp, path)
  return { backupPath }
}

function globToRegExp(g: string): RegExp {
  const escaped = g
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0001')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0001/g, '.*')
  return new RegExp(`^${escaped}$`, 'i')
}

export async function listFilesByGlobs(dir: string, globs: string[]): Promise<string[]> {
  const matchers = globs.map((g) => globToRegExp(g.replace(/\\/g, '/')))
  const out: string[] = []
  try {
    const entries = await readdir(dir, { withFileTypes: true, recursive: true })
    for (const e of entries) {
      if (!e.isFile()) continue
      const full = resolve(dir, e.parentPath ?? dir, e.name)
      const rel = relative(dir, full).replace(/\\/g, '/')
      if (matchers.some((m) => m.test(rel))) out.push(full)
    }
  } catch {
    return []
  }
  return out.sort()
}

const ASSET_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif']

export async function resolveAsset(dir: string, name: string): Promise<string | null> {
  if (!name) return null
  const clean = name.replace(/\\/g, '/').split('/').pop() ?? name
  const candidates = [clean, ...ASSET_EXTS.map((x) => clean + x)]
  try {
    const files = await readdir(dir, { withFileTypes: true })
    const lower = new Map<string, string>()
    for (const f of files) {
      if (!f.isFile()) continue
      const full = join(dir, f.name)
      lower.set(f.name.toLowerCase(), full)
      lower.set(f.name.toLowerCase().replace(extname(f.name), ''), full)
    }
    for (const c of candidates) {
      const hit = lower.get(c.toLowerCase())
      if (hit) return hit
    }
  } catch {
    return null
  }
  return null
}

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
}

export async function readAssetAsDataUrl(path: string): Promise<string | null> {
  try {
    const s = await stat(path)
    if (s.size > 25 * 1024 * 1024) return null
    const buf = await readFile(path)
    const mime = MIME[extname(path).toLowerCase()]
    if (!mime) return null
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

export interface ImageAssetInfo {
  name: string
  path: string
  size: number
  mtimeMs: number
}

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif']

function assertResourcePath(path: string): string {
  const abs = resolve(path)
  const norm = abs.replace(/\\/g, '/')
  if (!/\/Resource(\/|$)/i.test(norm)) throw new Error('路径必须位于 Mod 的 Resource 资源目录内')
  return abs
}

function sanitizeImageName(name: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/^\.+$/, '')
    .trim()
  return cleaned || 'image'
}

function imageExtFor(fileName: string): string {
  const ext = extname(fileName).toLowerCase()
  return IMAGE_EXTS.includes(ext) ? ext : '.png'
}

async function uniqueImagePath(dir: string, name: string): Promise<string> {
  const safe = sanitizeImageName(name)
  const ext = imageExtFor(safe)
  const base = basename(safe, ext)
  let candidate = join(dir, `${base}${ext}`)
  let i = 1
  while (true) {
    try {
      await stat(candidate)
      candidate = join(dir, `${base} (${i})${ext}`)
      i++
    } catch {
      return candidate
    }
  }
}

export async function listImages(dir: string): Promise<ImageAssetInfo[]> {
  const abs = assertResourcePath(dir)
  try {
    const entries = await readdir(abs, { withFileTypes: true })
    const out: ImageAssetInfo[] = []
    for (const e of entries) {
      if (!e.isFile()) continue
      const ext = extname(e.name).toLowerCase()
      if (!IMAGE_EXTS.includes(ext)) continue
      const p = join(abs, e.name)
      const s = await stat(p).catch(() => null)
      out.push({ name: e.name, path: p, size: s?.size ?? 0, mtimeMs: s?.mtimeMs ?? 0 })
    }
    return out.sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}

export async function importImageFile(dir: string, srcPath: string): Promise<ImageAssetInfo> {
  const absDir = assertResourcePath(dir)
  const src = resolve(srcPath)
  const ext = imageExtFor(src)
  const base = basename(src, extname(src)) || 'image'
  const target = await uniqueImagePath(absDir, `${base}${ext}`)
  await mkdir(absDir, { recursive: true })
  await copyFile(src, target)
  const s = await stat(target)
  return { name: basename(target), path: target, size: s.size, mtimeMs: s.mtimeMs }
}

export async function importImageData(dir: string, fileName: string, base64: string): Promise<ImageAssetInfo> {
  const absDir = assertResourcePath(dir)
  const ext = imageExtFor(fileName)
  const base = basename(fileName, extname(fileName)) || 'image'
  const target = await uniqueImagePath(absDir, `${base}${ext}`)
  await mkdir(absDir, { recursive: true })
  const data = base64.replace(/^data:[^;]+;base64,/, '')
  await writeFile(target, Buffer.from(data, 'base64'))
  const s = await stat(target)
  return { name: basename(target), path: target, size: s.size, mtimeMs: s.mtimeMs }
}

export async function deleteImage(path: string): Promise<{ ok: true }> {
  const abs = assertResourcePath(path)
  await rm(abs)
  return { ok: true }
}

export async function renameImage(path: string, newName: string): Promise<ImageAssetInfo> {
  const abs = assertResourcePath(path)
  const ext = extname(abs).toLowerCase()
  const keepExt = IMAGE_EXTS.includes(ext) ? ext : '.png'
  const safe = sanitizeImageName(newName)
  const base = basename(safe, extname(safe))
  const target = await uniqueImagePath(dirname(abs), `${base}${keepExt}`)
  await rename(abs, target)
  const s = await stat(target)
  return { name: basename(target), path: target, size: s.size, mtimeMs: s.mtimeMs }
}