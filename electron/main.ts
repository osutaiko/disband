import {
  app, BrowserWindow, dialog, ipcMain, Menu, shell,
} from 'electron';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveAndValidateRecordingPath,
} from './utils';
import { createWindow } from './window';
import {
  analyzeRecordingFile,
  startAudioSidecar,
  stopAudioSidecar,
} from './audio-sidecar';

import { SUPPORTED_EXTENSIONS } from '../shared/constants';

const fileName = fileURLToPath(import.meta.url);
const dirName = path.dirname(fileName);

process.env.APP_ROOT = path.join(dirName, '..');
const { VITE_DEV_SERVER_URL } = process.env;
const ENABLE_TEST_AUDIO_FIXTURES = process.env.VITE_ENABLE_TEST_AUDIO_FIXTURES === '1';

let win: BrowserWindow | null = null;
let audioSidecar: ReturnType<typeof import('node:child_process').spawn> | null = null;
let audioRecordingPath: string | null = null;
let audioRecordingUrl: string | null = null;

function buildApplicationMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Import Song',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            win?.webContents.send('menu:import-song');
          },
        },
        {
          label: 'Reload Library',
          click: () => {
            win?.webContents.send('menu:reload-library');
          },
        },
        { type: 'separator' },
        { 
          label: 'Quit',
          role: 'quit',
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { 
          label: 'Toggle Full Screen',
          accelerator: 'F11',
          role: 'togglefullscreen', 
        },
      ]
    },
    {
      label: 'Score',
      submenu: [
        { 
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            win?.webContents.send('menu:score-zoom-in');
          },
        },
        { 
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            win?.webContents.send('menu:score-zoom-out');
          },
        },
        { 
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            win?.webContents.send('menu:score-zoom-reset');
          },
        },
        ...(VITE_DEV_SERVER_URL ? [{ type: 'separator' as const }, { role: 'toggleDevTools' as const }] : []),
      ],
    },
    {
      label: 'Playback',
      submenu: [
        {
          label: 'Play/Pause', 
          accelerator: 'Space',
          click: () => {
            win?.webContents.send('menu:playback-play-pause');
          },
        },
        { 
          label: 'Go to Song Start', 
          click: () => {
            win?.webContents.send('menu:playback-goto-start');
          },
        },
        { 
          label: 'Go to Song End', 
          click: () => {
            win?.webContents.send('menu:playback-goto-end');
          },
        },
      ],
    },
    {
      label: 'Recording',
      submenu: [
        {
          label: 'Start/Stop Recording',
          accelerator: 'R',
          click: () => {
            win?.webContents.send('menu:recording-toggle');
          },
        },
        { 
          label: 'Delete Current Take',
          click: () => {
            win?.webContents.send('menu:recording-delete-take');
          }, 
        },
        { 
          label: 'Re-analyze Current Take',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            win?.webContents.send('menu:recording-reanalyze');
          },
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          accelerator: 'F1',
          click: () => {
            void shell.openExternal('https://github.com/osutaiko/disband');
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  win = createWindow({
    dirName,
    viteDevServerUrl: VITE_DEV_SERVER_URL,
    appRoot: process.env.APP_ROOT!,
  });
  buildApplicationMenu();
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
  void stopAudioSidecar({ state: audioState });
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
    resolveRecordingPath: resolveRecordingPath,
  })
));
