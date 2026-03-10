import { BrowserWindow, Menu, shell } from 'electron';

export function buildApplicationMenu({
  win,
  onOpenSettings,
}: {
  win: BrowserWindow | null;
  onOpenSettings: () => void;
}) {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Import Song',
          accelerator: 'CmdOrCtrl+O',
          click: () => win?.webContents.send('menu:import-song'),
        },
        {
          label: 'Reload Library',
          click: () => win?.webContents.send('menu:reload-library'),
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
      ],
    },
    {
      label: 'Score',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => win?.webContents.send('menu:score-zoom-in'),
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => win?.webContents.send('menu:score-zoom-out'),
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => win?.webContents.send('menu:score-zoom-reset'),
        },
        ...(process.env.VITE_DEV_SERVER_URL
          ? [{ type: 'separator' as const }, { role: 'toggleDevTools' as const }]
          : []),
      ],
    },
    {
      label: 'Playback',
      submenu: [
        {
          label: 'Play/Pause',
          accelerator: 'Space',
          click: () => win?.webContents.send('menu:playback-play-pause'),
        },
        {
          label: 'Go to Song Start',
          click: () => win?.webContents.send('menu:playback-goto-start'),
        },
        {
          label: 'Go to Song End',
          click: () => win?.webContents.send('menu:playback-goto-end'),
        },
      ],
    },
    {
      label: 'Recording',
      submenu: [
        {
          label: 'Start/Stop Recording',
          accelerator: 'R',
          click: () => win?.webContents.send('menu:recording-toggle'),
        },
        {
          label: 'Delete Current Take',
          click: () => win?.webContents.send('menu:recording-delete-take'),
        },
        {
          label: 'Re-analyze Current Take',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => win?.webContents.send('menu:recording-reanalyze'),
        },
      ],
    },
    {
      label: 'Settings...',
      accelerator: 'CmdOrCtrl+,',
      click: onOpenSettings,
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          accelerator: 'F1',
          click: () => shell.openExternal('https://github.com/osutaiko/disband'),
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}
