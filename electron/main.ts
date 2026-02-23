import {
  app, BrowserWindow, dialog, ipcMain,
} from 'electron';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import {
  getSidecarPath,
  makeRecordingFileName,
} from './utils';

import { SUPPORTED_EXTENSIONS } from '../shared/constants';

const fileName = fileURLToPath(import.meta.url);
const dirName = path.dirname(fileName);

process.env.APP_ROOT = path.join(dirName, '..');
const { VITE_DEV_SERVER_URL } = process.env;
const ENABLE_TEST_AUDIO_FIXTURES = process.env.VITE_ENABLE_TEST_AUDIO_FIXTURES === '1';

let win: BrowserWindow | null = null;
let audioSidecar: ReturnType<typeof spawn> | null = null;
let audioRecordingPath: string | null = null;
let audioRecordingUrl: string | null = null;

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
const TESTS_DATA_PATH = path.resolve(process.env.APP_ROOT!, 'tests', 'data');

function isPathInside(basePath: string, targetPath: string): boolean {
  const relativePath = path.relative(basePath, targetPath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function startAudioSidecar() {
  if (audioSidecar) return;

  const exe = getSidecarPath(process.env.APP_ROOT!);
  const outputPath = path.join(RECORDINGS_PATH, makeRecordingFileName());
  const outputUrl = pathToFileURL(outputPath).toString();

  const sidecar = spawn(exe, ['--output', outputPath], {
    stdio: ['pipe', 'ignore', 'pipe'],
  });
  audioSidecar = sidecar;
  audioRecordingPath = outputPath;
  audioRecordingUrl = outputUrl;

  sidecar.stderr?.on('data', (chunk: Buffer) => {
    console.info(chunk.toString('utf8'));
  });

  sidecar.on('exit', () => {
    audioSidecar = null;
  });
}

async function stopAudioSidecar() {
  if (!audioSidecar) {
    return { ok: true, alreadyStopped: true };
  }

  const sidecar = audioSidecar;
  const outputPath = audioRecordingPath;
  const outputUrl = audioRecordingUrl;

  const exitPromise = new Promise<'exit'>((resolve) => {
    sidecar.once('exit', () => resolve('exit'));
  });

  try {
    sidecar.stdin?.write('stop\n');
    sidecar.stdin?.end();
  } catch {
    // Ignore write failures for now
  }

  const exitResult = await Promise.race([
    exitPromise,
    new Promise<'timeout'>((resolve) => {
      setTimeout(() => resolve('timeout'), 1000);
    }),
  ]);

  if (exitResult === 'timeout') {
    sidecar.kill();
  }

  audioSidecar = null;

  let fileSize: number | null = null;
  if (outputPath) {
    try {
      fileSize = fs.statSync(outputPath).size;
    } catch {
      fileSize = null;
    }
  }

  return {
    ok: true,
    path: outputPath ?? undefined,
    url: outputUrl ?? undefined,
    saved: fileSize !== null && fileSize > 44,
    fileSize,
  };
}

app.on('before-quit', () => {
  stopAudioSidecar();
});

ipcMain.handle('audio-start', async () => {
  startAudioSidecar();
  return {
    ok: true,
    path: audioRecordingPath ?? undefined,
    url: audioRecordingUrl ?? undefined,
  };
});

ipcMain.handle('audio-stop', async () => stopAudioSidecar());
ipcMain.handle('audio-read', async (_event, filePath: string) => {
  if (!filePath) {
    throw new Error('Invalid recording path');
  }

  const resolvedPath = path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(process.env.APP_ROOT!, filePath);

  const allowedBasePaths = [RECORDINGS_PATH];
  if (ENABLE_TEST_AUDIO_FIXTURES) {
    allowedBasePaths.push(TESTS_DATA_PATH);
  }

  const isAllowedPath = allowedBasePaths.some((basePath) => isPathInside(basePath, resolvedPath));
  if (!isAllowedPath) {
    throw new Error('Invalid recording path');
  }

  const buffer = await fs.promises.readFile(resolvedPath);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
});

// --- IPC Handlers --- //
// Open a song picker and import the chosen file into Songs
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
