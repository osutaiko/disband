import { BrowserWindow } from 'electron';
import path from 'node:path';

function loadRendererWindow(win: BrowserWindow, viteDevServerUrl: string | undefined, appRoot: string, query?: string) {
  if (viteDevServerUrl) {
    const url = new URL(viteDevServerUrl);
    if (query) {
      url.search = query;
    }
    win.loadURL(url.toString());
    return;
  }

  win.loadFile(path.join(appRoot, 'dist', 'index.html'), query ? { search: query } : undefined);
}

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
    webPreferences: {
      preload: path.join(dirName, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.maximize();
  win.show();

  loadRendererWindow(win, viteDevServerUrl, appRoot);

  return win;
}

export function createSettingsWindow({
  dirName,
  viteDevServerUrl,
  appRoot,
  parent,
}: {
  dirName: string;
  viteDevServerUrl?: string;
  appRoot: string;
  parent?: BrowserWindow;
}): BrowserWindow {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: false,
    parent,
    modal: Boolean(parent),
    show: false,
    autoHideMenuBar: true,
    title: process.platform === 'darwin' ? 'Preferences' : 'Settings',
    webPreferences: {
      preload: path.join(dirName, 'preload.mjs'),
    },
  });

  win.once('ready-to-show', () => win.show());
  loadRendererWindow(win, viteDevServerUrl, appRoot, 'window=settings');

  return win;
}
