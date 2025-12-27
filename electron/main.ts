import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import { SUPPORTED_EXTENSIONS } from '../shared/constants'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

process.env.APP_ROOT = path.join(__dirname, '..')
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

let win: BrowserWindow | null = null

function createWindow() {
  win = new BrowserWindow({
    minWidth: 1280,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.maximize()
  win.show()

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(process.env.APP_ROOT!, 'dist', 'index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

const SONGS_PATH = path.join(app.getPath('documents'), 'Disband', 'Songs')

// --- IPC Handlers --- //
// Reveal Songs folder in user's file explorer
ipcMain.on('open-songs-folder', () => {
  if (!fs.existsSync(SONGS_PATH)) {
    fs.mkdirSync(SONGS_PATH, { recursive: true })
  }
  
  shell.openPath(SONGS_PATH)
})

// Return list of .gp* files in Songs folder
ipcMain.handle('get-songs', async () => {
  if (!fs.existsSync(SONGS_PATH)) {
    fs.mkdirSync(SONGS_PATH, { recursive: true });
    return [];
  }

  const files = fs.readdirSync(SONGS_PATH);
  return files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext as any);
  });
});

// Parse and return binary data for a song file
ipcMain.handle('get-song-data', async (event, filename: string) => {
  const filePath = path.join(SONGS_PATH, filename);
  const buffer = await fs.promises.readFile(filePath);
  return buffer;
});
