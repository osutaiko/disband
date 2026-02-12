import {
  app, BrowserWindow, dialog, ipcMain,
} from 'electron';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  getSidecarPath,
  makeRecordingFileName,
  writePcm16WavFile,
} from './utils';

import { SUPPORTED_EXTENSIONS } from '../shared/constants';

const fileName = fileURLToPath(import.meta.url);
const dirName = path.dirname(fileName);

process.env.APP_ROOT = path.join(dirName, '..');
const { VITE_DEV_SERVER_URL } = process.env;

let win: BrowserWindow | null = null;
let audioSidecar: ReturnType<typeof spawn> | null = null;
let audioRemainder = Buffer.alloc(0);
let recordedAudioChunks: Buffer[] = [];
let recordedAudioBytes = 0;

function createWindow() {
  win = new BrowserWindow({
    minWidth: 1280,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(dirName, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.maximize();
  win.show();

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.APP_ROOT!, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const SONGS_PATH = path.join(app.getPath('documents'), 'Disband', 'Songs');
const RECORDINGS_PATH = path.join(app.getPath('documents'), 'Disband', 'Takes');

function startAudioSidecar() {
  if (audioSidecar) return;

  const exe = getSidecarPath(process.env.APP_ROOT!);
  audioRemainder = Buffer.alloc(0);
  recordedAudioChunks = [];
  recordedAudioBytes = 0;

  const sidecar = spawn(exe, [], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  audioSidecar = sidecar;

  sidecar.stdout.on('data', (chunk: Buffer) => {
    audioRemainder = Buffer.concat([audioRemainder, chunk]);

    const usableBytes = audioRemainder.length - (audioRemainder.length % 2);
    if (usableBytes === 0) return;

    const frame = audioRemainder.subarray(0, usableBytes);
    audioRemainder = audioRemainder.subarray(usableBytes);
    recordedAudioChunks.push(Buffer.from(frame));
    recordedAudioBytes += frame.length;

    win?.webContents.send('audio-capture-chunk', frame);
  });

  sidecar.on('exit', () => {
    audioSidecar = null;
  });
}

function stopAudioSidecar() {
  if (!audioSidecar) {
    return { ok: true, alreadyStopped: true };
  }

  const pcmBytes = recordedAudioBytes;
  const pcm16Data = Buffer.concat(recordedAudioChunks, recordedAudioBytes);
  const outputPath = path.join(RECORDINGS_PATH, makeRecordingFileName());

  audioSidecar.kill();
  audioSidecar = null;
  writePcm16WavFile(outputPath, pcm16Data);

  audioRemainder = Buffer.alloc(0);
  recordedAudioChunks = [];
  recordedAudioBytes = 0;

  let fileSize: number | null = null;
  try {
    fileSize = fs.statSync(outputPath).size;
  } catch {
    fileSize = null;
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

app.on('before-quit', () => {
  stopAudioSidecar();
});

ipcMain.handle('audio-start', async () => {
  startAudioSidecar();
  return { ok: true };
});

ipcMain.handle('audio-stop', async () => stopAudioSidecar());

// --- IPC Handlers --- //
// Open a song picker and import the chosen file into Songs.
ipcMain.handle('open-songs-folder', async () => {
  if (!fs.existsSync(SONGS_PATH)) {
    fs.mkdirSync(SONGS_PATH, { recursive: true });
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
    });

  if (picker.canceled || picker.filePaths.length === 0) {
    return null;
  }

  const selectedPath = picker.filePaths[0];
  const selectedName = path.basename(selectedPath);
  const selectedExt = path.extname(selectedName).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(selectedExt)) {
    return null;
  }

  const destination = path.join(SONGS_PATH, selectedName);
  if (path.resolve(destination) !== path.resolve(selectedPath)) {
    fs.copyFileSync(selectedPath, destination);
  }

  return selectedName;
});

// Return list of .gp* files in Songs folder
ipcMain.handle('get-songs', async () => {
  if (!fs.existsSync(SONGS_PATH)) {
    fs.mkdirSync(SONGS_PATH, { recursive: true });
    return [];
  }

  const files = fs.readdirSync(SONGS_PATH);
  return files.filter((file) => {
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
