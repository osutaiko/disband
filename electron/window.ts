import { BrowserWindow } from 'electron';
import path from 'node:path';

export function createWindow({
  dirName,
  viteDevServerUrl,
  appRoot,
}: {
  dirName: string;
  viteDevServerUrl?: string;
  appRoot: string;
}): BrowserWindow {
  const win = new BrowserWindow({
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

  if (viteDevServerUrl) {
    win.loadURL(viteDevServerUrl);
  } else {
    win.loadFile(path.join(appRoot, 'dist', 'index.html'));
  }

  return win;
}
