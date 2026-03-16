import {
  app, BrowserWindow, dialog, ipcMain, Menu,
} from 'electron';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveAndValidateRecordingPath,
} from './utils';
import { createSettingsWindow, createWindow } from './window';
import {
  analyzeRecordingFile,
  disposeAudioSidecar,
  startAudioSidecar,
  stopAudioSidecar,
} from './audio-sidecar';
import { getSettings, setSettings } from './settings-store';
import type { AppSettings } from '../shared/settings';

import { SUPPORTED_EXTENSIONS } from '../shared/constants';
import { buildApplicationMenu } from './menu';

const fileName = fileURLToPath(import.meta.url);
const dirName = path.dirname(fileName);

process.env.APP_ROOT = path.join(dirName, '..');
const { VITE_DEV_SERVER_URL } = process.env;
const ENABLE_TEST_AUDIO_FIXTURES = process.env.VITE_ENABLE_TEST_AUDIO_FIXTURES === '1';

let win: BrowserWindow | null = null;
let settingsWin: BrowserWindow | null = null;
let audioSidecar: ReturnType<typeof import('node:child_process').spawn> | null = null;
let audioRecordingPath: string | null = null;
let audioRecordingUrl: string | null = null;

function openSettingsWindow() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    if (settingsWin.isMinimized()) {
      settingsWin.restore();
    }
    settingsWin.focus();
    return;
  }

  settingsWin = createSettingsWindow({
    dirName,
    viteDevServerUrl: VITE_DEV_SERVER_URL,
    appRoot: process.env.APP_ROOT!,
    parent: win ?? undefined,
  });
  settingsWin.on('closed', () => {
    settingsWin = null;
  });
}

app.whenReady().then(() => {
  win = createWindow({
    dirName,
    viteDevServerUrl: VITE_DEV_SERVER_URL,
    appRoot: process.env.APP_ROOT!,
  });
  Menu.setApplicationMenu(
    buildApplicationMenu({
      win,
      onOpenSettings: openSettingsWindow,
    }),
  );

  // Keep recorder sidecar warm so recording can start immediately.
  startAudioSidecar({
    state: audioState,
    recordingsPath: RECORDINGS_PATH,
    appRoot: process.env.APP_ROOT!,
    startRecording: false,
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const SONGS_PATH = path.join(app.getPath('documents'), 'Disband', 'Songs');
const RECORDINGS_PATH = path.join(app.getPath('documents'), 'Disband', 'Takes');
const TESTS_DATA_PATH = path.resolve(process.env.APP_ROOT!, 'tests', 'data');

const audioState = {
  getAudioSidecar: () => audioSidecar,
  setAudioSidecar: (value: ReturnType<typeof import('node:child_process').spawn> | null) => {
    audioSidecar = value;
  },
  getAudioRecordingPath: () => audioRecordingPath,
  setAudioRecordingPath: (value: string | null) => {
    audioRecordingPath = value;
  },
  getAudioRecordingUrl: () => audioRecordingUrl,
  setAudioRecordingUrl: (value: string | null) => {
    audioRecordingUrl = value;
  },
};

function resolveRecordingPath(filePath: string): string {
  const allowedBasePaths = [RECORDINGS_PATH];
  if (ENABLE_TEST_AUDIO_FIXTURES) {
    allowedBasePaths.push(TESTS_DATA_PATH);
  }

  return resolveAndValidateRecordingPath(filePath, process.env.APP_ROOT!, allowedBasePaths);
}
app.on('before-quit', () => {
  void disposeAudioSidecar({ state: audioState });
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

// Start audio recording
ipcMain.handle('audio-start', async () => {
  startAudioSidecar({
    state: audioState,
    recordingsPath: RECORDINGS_PATH,
    appRoot: process.env.APP_ROOT!,
  });
  return {
    ok: true,
    path: audioRecordingPath ?? undefined,
    url: audioRecordingUrl ?? undefined,
  };
});

// Stop audio recording
ipcMain.handle('audio-stop', async () => stopAudioSidecar({ state: audioState }));

// Read recorded audio from path
ipcMain.handle('audio-read', async (_event, filePath: string) => {
  const resolvedPath = resolveRecordingPath(filePath);
  const buffer = await fs.promises.readFile(resolvedPath);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
});

// Analyze recording
ipcMain.handle('audio-analyze', async (
  _event,
  filePath: string,
  referenceNotes?: Array<{
    id: number;
    timestamp: number;
    length: number;
    midi: number;
  }>,
) => (
  analyzeRecordingFile({
    filePath,
    referenceNotes,
    appRoot: process.env.APP_ROOT!,
    resolveRecordingPath,
  })
));

ipcMain.handle('settings-get', async () => getSettings());

ipcMain.handle('settings-set', async (_event, nextSettings: AppSettings) => {
  const savedSettings = setSettings(nextSettings);
  return savedSettings;
});
