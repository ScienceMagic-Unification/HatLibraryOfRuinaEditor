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

export interface FileInfo {
  name: string
  size: number
}

export interface ImageAssetInfo {
  name: string
  path: string
  size: number
  mtimeMs: number
}

export const api = window.api