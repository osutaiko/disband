import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process'
import { SUPPORTED_EXTENSIONS } from '../shared/constants'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

process.env.APP_ROOT = path.join(__dirname, '..')
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

let win: BrowserWindow | null = null
let audioSidecar: ChildProcessWithoutNullStreams | null = null

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
app.on('before-quit', () => {
  stopAudioSidecar()
})

const SONGS_PATH = path.join(app.getPath('documents'), 'Disband', 'Songs')

function getSidecarPath() {
  const base = path.join(process.env.APP_ROOT!, 'native', 'audio-capture', 'bin', process.platform)
  const exe = process.platform === 'win32' ? 'disband-audio-capture.exe' : 'disband-audio-capture'
  return path.join(base, exe)
}

// --- Sidecar for Audio --- //
function startAudioSidecar() {
  if (audioSidecar) return;

  const exe = getSidecarPath();

  audioSidecar = spawn(exe, [], {
    stdio: ["ignore", "pipe", "inherit"],
  });

  let audioRemainder = Buffer.alloc(0);

  audioSidecar.stdout.on("data", (chunk: Buffer) => {
    audioRemainder = Buffer.concat([audioRemainder, chunk]);

    const usableBytes = audioRemainder.length - (audioRemainder.length % 4);
    if (usableBytes === 0) return;

    const frame = audioRemainder.subarray(0, usableBytes);
    audioRemainder = audioRemainder.subarray(usableBytes);

    win?.webContents.send("audio-capture-chunk", frame);
  });

  audioSidecar.on("exit", () => {
    audioSidecar = null;
  });
}

function stopAudioSidecar() {
  if (!audioSidecar) return;

  audioSidecar.kill();
  audioSidecar = null;
}

ipcMain.handle("audio-start", async () => {
  startAudioSidecar();
});

ipcMain.handle("audio-stop", async () => {
  stopAudioSidecar();
});

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
    return SUPPORTED_EXTENSIONS.includes(ext);
  });
});

// Parse and return binary data for a song file
ipcMain.handle('get-song-data', async (_, filename: string) => {
  const filePath = path.join(SONGS_PATH, filename);
  const buffer = await fs.promises.readFile(filePath);
  return buffer;
});
