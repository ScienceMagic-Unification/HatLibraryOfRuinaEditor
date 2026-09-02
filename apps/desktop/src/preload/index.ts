import { contextBridge, ipcRenderer } from 'electron'

const api = {
  discover: () => ipcRenderer.invoke('game:discover'),
  pickModDirectory: () => ipcRenderer.invoke('dialog:pick-mod'),
  pickDirectory: (modPath: string) => ipcRenderer.invoke('dialog:pick-directory', modPath),
  pickImageFiles: () => ipcRenderer.invoke('dialog:pick-images'),
  pickXmlFiles: () => ipcRenderer.invoke('dialog:pick-xml'),
  listDataFiles: (modPath: string) => ipcRenderer.invoke('mod:list-data', modPath),
  readTextFile: (path: string) => ipcRenderer.invoke('fs:read-text', path),
  saveFile: (path: string, content: string) => ipcRenderer.invoke('fs:save', path, content),
  listFilesByGlobs: (dir: string, globs: string[]) => ipcRenderer.invoke('fs:list-glob', dir, globs),
  resolveAsset: (dir: string, name: string) => ipcRenderer.invoke('fs:resolve-asset', dir, name),
  readAssetAsDataUrl: (path: string) => ipcRenderer.invoke('fs:asset-data-url', path),
  listImages: (dir: string) => ipcRenderer.invoke('fs:list-images', dir),
  listImagesRecursive: (dir: string) => ipcRenderer.invoke('fs:list-images-recursive', dir),
  importImage: (dir: string, srcPath: string) => ipcRenderer.invoke('fs:import-image', dir, srcPath),
  importImageData: (dir: string, fileName: string, base64: string) => ipcRenderer.invoke('fs:import-image-data', dir, fileName, base64),
  deleteImage: (path: string) => ipcRenderer.invoke('fs:delete-image', path),
  renameImage: (path: string, newName: string) => ipcRenderer.invoke('fs:rename-image', path, newName),
  setDirty: (dirty: boolean) => ipcRenderer.send('ui:dirty-state', dirty),
  onConfirmClose: (cb: () => void) => {
    ipcRenderer.on('app:confirm-close', () => cb())
  },
  confirmExit: () => ipcRenderer.invoke('app:force-exit')
}

export type RuinaApi = typeof api

contextBridge.exposeInMainWorld('api', api)