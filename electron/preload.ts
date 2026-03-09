import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  openSongsFolder: () => ipcRenderer.invoke('open-songs-folder'),
  getSongs: () => ipcRenderer.invoke('get-songs'),
  getSongData: (filename: string) => ipcRenderer.invoke('get-song-data', filename),
  onImportSongMenu: (handler: () => void) => {
    const listener = () => handler();
    ipcRenderer.on('menu:import-song', listener);
    return () => ipcRenderer.removeListener('menu:import-song', listener);
  },
  onReloadLibraryMenu: (handler: () => void) => {
    const listener = () => handler();
    ipcRenderer.on('menu:reload-library', listener);
    return () => ipcRenderer.removeListener('menu:reload-library', listener);
  },
});

contextBridge.exposeInMainWorld('audio', {
  start: () => ipcRenderer.invoke('audio-start'),
  stop: () => ipcRenderer.invoke('audio-stop'),
  readRecording: (filePath: string) => ipcRenderer.invoke('audio-read', filePath),
  analyzeRecording: (
    filePath: string,
    referenceNotes?: Array<{
      id: number;
      timestamp: number;
      length: number;
      midi: number;
    }>,
  ) => ipcRenderer.invoke('audio-analyze', filePath, referenceNotes),
});
