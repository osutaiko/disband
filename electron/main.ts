import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { SUPPORTED_EXTENSIONS } from '../shared/constants'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

process.env.APP_ROOT = path.join(__dirname, '..')
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

let win: BrowserWindow | null = null
let audioSidecar: ReturnType<typeof spawn> | null = null
let audioRemainder = Buffer.alloc(0)
let recordedAudioChunks: Buffer[] = []
let recordedAudioBytes = 0

const AUDIO_SAMPLE_RATE = 48_000
const AUDIO_CHANNEL_COUNT = 1
const AUDIO_BITS_PER_SAMPLE = 16
const AUDIO_FORMAT_PCM = 1

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

app.whenReady().then(() => {
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
app.on('before-quit', () => {
  stopAudioSidecar()
})

const SONGS_PATH = path.join(app.getPath('documents'), 'Disband', 'Songs')
const RECORDINGS_PATH = path.join(app.getPath('documents'), 'Disband', 'Takes')

function getSidecarPath() {
  const base = path.join(process.env.APP_ROOT!, 'native', 'audio-capture', 'bin', process.platform)
  const exe = process.platform === 'win32' ? 'disband-audio-capture.exe' : 'disband-audio-capture'
  return path.join(base, exe)
}

function pad2(value: number) {
  return value.toString().padStart(2, '0')
}

function makeRecordingFileName(date = new Date()) {
  const yyyy = date.getFullYear()
  const mm = pad2(date.getMonth() + 1)
  const dd = pad2(date.getDate())
  const hh = pad2(date.getHours())
  const min = pad2(date.getMinutes())
  const ss = pad2(date.getSeconds())
  return `capture-${yyyy}${mm}${dd}-${hh}${min}${ss}.wav`
}

function writePcm16WavFile(filePath: string, pcm16Data: Buffer) {
  const dataSize = pcm16Data.length
  const blockAlign = AUDIO_CHANNEL_COUNT * (AUDIO_BITS_PER_SAMPLE / 8)
  const byteRate = AUDIO_SAMPLE_RATE * blockAlign
  const header = Buffer.alloc(44)

  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // PCM fmt chunk size
  header.writeUInt16LE(AUDIO_FORMAT_PCM, 20)
  header.writeUInt16LE(AUDIO_CHANNEL_COUNT, 22)
  header.writeUInt32LE(AUDIO_SAMPLE_RATE, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(AUDIO_BITS_PER_SAMPLE, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)

  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, Buffer.concat([header, pcm16Data], 44 + dataSize))
}

function startAudioSidecar() {
  if (audioSidecar) return

  const exe = getSidecarPath();
  audioRemainder = Buffer.alloc(0);
  recordedAudioChunks = [];
  recordedAudioBytes = 0;

  const sidecar = spawn(exe, [], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  audioSidecar = sidecar;

  sidecar.stdout.on('data', (chunk: Buffer) => {
    audioRemainder = Buffer.concat([audioRemainder, chunk])

    const usableBytes = audioRemainder.length - (audioRemainder.length % 2)
    if (usableBytes === 0) return

    const frame = audioRemainder.subarray(0, usableBytes);
    audioRemainder = audioRemainder.subarray(usableBytes);
    recordedAudioChunks.push(Buffer.from(frame));
    recordedAudioBytes += frame.length;

    win?.webContents.send("audio-capture-chunk", frame);
  });

  sidecar.on("exit", () => {
    audioSidecar = null;
  });
}

function stopAudioSidecar() {
  if (!audioSidecar) {
    return { ok: true, alreadyStopped: true }
  }

  const pcmBytes = recordedAudioBytes;
  const pcm16Data = Buffer.concat(recordedAudioChunks, recordedAudioBytes);
  const outputPath = path.join(RECORDINGS_PATH, makeRecordingFileName());

  audioSidecar.kill();
  audioSidecar = null;
  writePcm16WavFile(outputPath, pcm16Data)

  audioRemainder = Buffer.alloc(0);
  recordedAudioChunks = [];
  recordedAudioBytes = 0;

  let fileSize: number | null = null
  try {
    fileSize = fs.statSync(outputPath).size
  } catch {
    fileSize = null
  }

  return {
    ok: true,
    path: outputPath,
    saved: fileSize !== null && fileSize > 44,
    fileSize,
    pcmBytes,
    empty: pcmBytes === 0,
  };
}

ipcMain.handle("audio-start", async () => {
  startAudioSidecar();
  return { ok: true };
});

ipcMain.handle("audio-stop", async () => {
  return stopAudioSidecar();
});

// --- IPC Handlers --- //
// Open a song picker and import the chosen file into Songs.
ipcMain.handle('open-songs-folder', async () => {
  if (!fs.existsSync(SONGS_PATH)) {
    fs.mkdirSync(SONGS_PATH, { recursive: true })
  }

  const picker = win
    ? await dialog.showOpenDialog(win, {
        title: 'Select Song File',
        defaultPath: SONGS_PATH,
        properties: ['openFile'],
        filters: [
          {
            name: 'Guitar Pro Files',
            extensions: SUPPORTED_EXTENSIONS.map((ext) => ext.slice(1)),
          },
        ],
      })
    : await dialog.showOpenDialog({
    title: 'Select Song File',
    defaultPath: SONGS_PATH,
    properties: ['openFile'],
    filters: [
      {
        name: 'Guitar Pro Files',
        extensions: SUPPORTED_EXTENSIONS.map((ext) => ext.slice(1)),
      },
    ],
  })

  if (picker.canceled || picker.filePaths.length === 0) {
    return null
  }

  const selectedPath = picker.filePaths[0]
  const selectedName = path.basename(selectedPath)
  const selectedExt = path.extname(selectedName).toLowerCase()
  if (!SUPPORTED_EXTENSIONS.includes(selectedExt)) {
    return null
  }

  const destination = path.join(SONGS_PATH, selectedName)
  if (path.resolve(destination) !== path.resolve(selectedPath)) {
    fs.copyFileSync(selectedPath, destination)
  }

  return selectedName
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
