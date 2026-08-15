import { BrowserWindow, dialog, ipcMain } from 'electron'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { discoverGame } from './game'
import {
  deleteImage,
  importImageData,
  importImageFile,
  listFilesByGlobs,
  listImages,
  listXmlFiles,
  readAssetAsDataUrl,
  readTextFile,
  renameImage,
  resolveAsset,
  saveTextFile
} from './files'

function requireString(v: unknown, name: string): string {
  if (typeof v !== 'string' || v.length === 0) throw new Error(`参数 ${name} 必须是字符串`)
  return v
}

let rendererDirty = false

export function isRendererDirty(): boolean {
  return rendererDirty
}

export function clearRendererDirty(): void {
  rendererDirty = false
}

export function registerIpc(): void {
  ipcMain.on('ui:dirty-state', (_e, dirty: unknown) => {
    rendererDirty = dirty === true
  })
  ipcMain.handle('app:force-exit', (e) => {
    rendererDirty = false
    const win = BrowserWindow.fromWebContents(e.sender)
    win?.destroy()
  })
  ipcMain.handle('game:discover', () => discoverGame())

  ipcMain.handle('dialog:pick-mod', async () => {
    const r = await dialog.showOpenDialog({
      title: '选择 Mod 文件夹（包含 Data 子目录的根目录）',
      properties: ['openDirectory']
    })
    return r.canceled || r.filePaths.length === 0 ? null : r.filePaths[0]
  })

  ipcMain.handle('dialog:pick-directory', async (_e, modPath: unknown) => {
    const root = resolve(requireString(modPath, 'modPath'), 'Resource')
    const r = await dialog.showOpenDialog({
      title: '选择 Mod 资源目录',
      defaultPath: root,
      properties: ['openDirectory']
    })
    if (r.canceled || r.filePaths.length === 0) return null
    const selected = resolve(r.filePaths[0])
    const rel = relative(root, selected)
    if (!isAbsolute(selected) || rel === '..' || rel.startsWith(`..\\`) || rel.startsWith(`../`)) return null
    return selected
  })

  ipcMain.handle('dialog:pick-images', async () => {
    const r = await dialog.showOpenDialog({
      title: '选择要导入的图片',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
    })
    return r.canceled ? [] : r.filePaths
  })

  ipcMain.handle('mod:list-data', async (_e, modPath: unknown) => {
    return listXmlFiles(join(requireString(modPath, 'modPath'), 'Data'))
  })

  ipcMain.handle('fs:read-text', async (_e, path: unknown) => {
    return readTextFile(requireString(path, 'path'))
  })

  ipcMain.handle('fs:save', async (_e, path: unknown, content: unknown) => {
    return saveTextFile(requireString(path, 'path'), requireString(content, 'content'))
  })

  ipcMain.handle('fs:list-glob', async (_e, dir: unknown, globs: unknown) => {
    const d = requireString(dir, 'dir')
    if (!Array.isArray(globs) || !globs.every((g) => typeof g === 'string')) throw new Error('globs 必须是字符串数组')
    return listFilesByGlobs(d, globs as string[])
  })

  ipcMain.handle('fs:resolve-asset', async (_e, dir: unknown, name: unknown) => {
    return resolveAsset(requireString(dir, 'dir'), requireString(name, 'name'))
  })

  ipcMain.handle('fs:asset-data-url', async (_e, path: unknown) => {
    return readAssetAsDataUrl(requireString(path, 'path'))
  })

  ipcMain.handle('fs:list-images', async (_e, dir: unknown) => {
    return listImages(requireString(dir, 'dir'))
  })

  ipcMain.handle('fs:import-image', async (_e, dir: unknown, srcPath: unknown) => {
    return importImageFile(requireString(dir, 'dir'), requireString(srcPath, 'srcPath'))
  })

  ipcMain.handle('fs:import-image-data', async (_e, dir: unknown, fileName: unknown, base64: unknown) => {
    return importImageData(requireString(dir, 'dir'), requireString(fileName, 'fileName'), requireString(base64, 'base64'))
  })

  ipcMain.handle('fs:delete-image', async (_e, path: unknown) => {
    return deleteImage(requireString(path, 'path'))
  })

  ipcMain.handle('fs:rename-image', async (_e, path: unknown, newName: unknown) => {
    return renameImage(requireString(path, 'path'), requireString(newName, 'newName'))
  })
}