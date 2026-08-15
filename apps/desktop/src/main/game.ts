import { execFile } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export interface ModInfo {
  name: string
  path: string
  dataPath: string
  localizePath: string
}

export interface DiscoveryResult {
  steamPath: string | null
  gamePath: string | null
  mods: ModInfo[]
}

function regQuery(args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    execFile('reg.exe', ['query', ...args], { encoding: 'utf8' }, (err, stdout) => {
      if (err) {
        resolve(null)
        return
      }
      const m = stdout.match(/REG_SZ\s+([^\r\n]+)/)
      resolve(m ? m[1].trim() : null)
    })
  })
}

export async function findSteamPath(): Promise<string | null> {
  if (process.platform === 'linux') {
    const home = homedir()
    const candidates = [join(home, '.steam', 'steam'), join(home, '.local', 'share', 'Steam'), join(home, '.var', 'app', 'com.valvesoftware.Steam', '.local', 'share', 'Steam')]
    return candidates.find((p) => existsSync(join(p, 'steamapps'))) ?? null
  }
  const fromReg =
    (await regQuery(['HKLM\\SOFTWARE\\WOW6432Node\\Valve\\Steam', '/v', 'InstallPath'])) ??
    (await regQuery(['HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath']))
  if (fromReg) return fromReg
  const candidates = [
    join(process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)', 'Steam'),
    join(process.env['ProgramW6432'] ?? 'C:\\Program Files', 'Steam'),
    'C:\\Steam',
    'D:\\Steam'
  ]
  return candidates.find((p) => existsSync(join(p, 'steamapps'))) ?? null
}

function libraryPaths(steamPath: string): string[] {
  const out: string[] = [steamPath]
  const vdf = join(steamPath, 'steamapps', 'libraryfolders.vdf')
  if (!existsSync(vdf)) return out
  const text = readFileSync(vdf, 'utf8')
  for (const m of text.matchAll(/"path"\s+"([^"]+)"/g)) out.push(m[1].replace(/\\\\/g, '\\'))
  return out
}

export async function discoverGame(): Promise<DiscoveryResult> {
  const steamPath = await findSteamPath()
  let gamePath: string | null = null
  const libs = steamPath ? libraryPaths(steamPath) : []
  for (const lib of libs) {
    const candidate = join(lib, 'steamapps', 'common', 'Library Of Ruina')
    if (existsSync(candidate)) {
      gamePath = candidate
      break
    }
  }
  const mods: ModInfo[] = []
  if (gamePath) {
    const modsDir = join(gamePath, 'LibraryOfRuina_Data', 'Mods')
    if (existsSync(modsDir)) {
      for (const name of readdirSync(modsDir, { withFileTypes: true })) {
        if (!name.isDirectory()) continue
        const p = join(modsDir, name.name)
        mods.push({
          name: name.name,
          path: p,
          dataPath: join(p, 'Data'),
          localizePath: join(p, 'Assemblies', 'Localize')
        })
      }
    }
  }
  return { steamPath, gamePath, mods }
}
