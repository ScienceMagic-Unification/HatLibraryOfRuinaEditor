import { app, BrowserWindow } from 'electron'
import { writeFile, appendFileSync } from 'node:fs'
import { writeFile as writeFileAsync } from 'node:fs/promises'
import { join } from 'node:path'
import { isRendererDirty, registerIpc } from './ipc'

const devUrl = process.env['ELECTRON_RENDERER_URL']

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0d1117',
    title: '帽子的废墟图书馆编辑器',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  if (devUrl) win.loadURL(devUrl)
  else win.loadFile(join(__dirname, '../renderer/index.html'))
  return win
}

app.whenReady().then(() => {
  registerIpc()
  const win = createWindow()
  win.on('close', (e) => {
    if (!isRendererDirty()) return
    e.preventDefault()
    win.webContents.send('app:confirm-close')
  })
  if (process.env['RUINA_SCREENSHOT']) win.webContents.setBackgroundThrottling(false)
  win.once('ready-to-show', () => {
    if (!process.env['RUINA_SCREENSHOT']) win.show()
  })

  // 无界面验收模式：渲染完成后截图 + 抓取页面文本，再自动退出（供开发期视觉走查）
  const shotPath = process.env['RUINA_SCREENSHOT']
  if (shotPath) {
    const errLog = process.env['RUINA_ERROR_LOG']
    if (errLog) {
      win.webContents.on('console-message', (_e, level, message) => {
        if (level >= 2) {
          try { appendFileSync(errLog, `${message}\n`) } catch { /* ignore */ }
        }
      })
    }
    win.webContents.once('did-finish-load', async () => {
      try {
        await new Promise((r) => setTimeout(r, Number(process.env['RUINA_SCREENSHOT_DELAY'] ?? 1600)))
        const execScript = process.env['RUINA_EXEC_JS']
        if (execScript) {
          await win.webContents.executeJavaScript(execScript)
          await new Promise((r) => setTimeout(r, 700))
        }
        win.webContents.invalidate()
        await new Promise((r) => setTimeout(r, 300))
        const image = await win.webContents.capturePage()
        await writeFileAsync(shotPath, image.toPNG())
        const dumpPath = process.env['RUINA_DUMP_TEXT']
        if (dumpPath) {
          try {
            const bodyText = await win.webContents.executeJavaScript('document.body.innerText')
            await writeFileAsync(dumpPath, String(bodyText), 'utf8')
          } catch (dumpErr) {
            await writeFileAsync(`${dumpPath}.error.txt`, String(dumpErr), 'utf8')
          }
        }
      } catch (err) {
        const errPath = process.env['RUINA_ERROR_LOG']
        if (errPath) await writeFileAsync(errPath, String(err), 'utf8')
      } finally {
        app.exit(0)
      }
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})