import { app, BrowserWindow, ipcMain, shell } from 'electron'
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

app.whenReady().then(createWindow)

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

function convertFloatToPcm16Data(pcmFloatData: Buffer) {
  const sampleCount = Math.floor(pcmFloatData.length / 4)
  const pcm16Data = Buffer.alloc(sampleCount * 2)

  for (let i = 0; i < sampleCount; i++) {
    const floatSample = pcmFloatData.readFloatLE(i * 4)
    const safeSample = Number.isFinite(floatSample)
      ? Math.max(-1, Math.min(1, floatSample))
      : 0
    const intSample = safeSample < 0
      ? Math.round(safeSample * 32768)
      : Math.round(safeSample * 32767)
    pcm16Data.writeInt16LE(intSample, i * 2)
  }

  return pcm16Data
}

function writeWavFile(filePath: string, pcmFloatData: Buffer) {
  const pcmData = convertFloatToPcm16Data(pcmFloatData)
  const dataSize = pcmData.length
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
  fs.writeFileSync(filePath, Buffer.concat([header, pcmData], 44 + dataSize))
}

// --- Sidecar for Audio --- //
function startAudioSidecar() {
  if (audioSidecar) return;

  const exe = getSidecarPath();
  audioRemainder = Buffer.alloc(0);
  recordedAudioChunks = [];
  recordedAudioBytes = 0;

  const sidecar = spawn(exe, [], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  audioSidecar = sidecar;

  sidecar.stdout.on("data", (chunk: Buffer) => {
    audioRemainder = Buffer.concat([audioRemainder, chunk]);

    const usableBytes = audioRemainder.length - (audioRemainder.length % 4);
    if (usableBytes === 0) return;

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
    return { ok: true, alreadyStopped: true };
  }

  const pcmBytes = recordedAudioBytes;
  const pcmData = Buffer.concat(recordedAudioChunks, recordedAudioBytes);
  const outputPath = path.join(RECORDINGS_PATH, makeRecordingFileName());

  audioSidecar.kill();
  audioSidecar = null;
  writeWavFile(outputPath, pcmData);

  audioRemainder = Buffer.alloc(0);
  recordedAudioChunks = [];
  recordedAudioBytes = 0;

  console.log('[audio] saved recording', {
    path: outputPath,
    pcmBytes,
    empty: pcmBytes === 0,
  });

  return {
    ok: true,
    path: outputPath,
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
