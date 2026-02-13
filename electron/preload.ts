import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  openSongsFolder: () => ipcRenderer.invoke('open-songs-folder'),
  getSongs: () => ipcRenderer.invoke('get-songs'),
  getSongData: (filename: string) => ipcRenderer.invoke('get-song-data', filename),
});

contextBridge.exposeInMainWorld('audio', {
  start: () => ipcRenderer.invoke('audio-start'),
  stop: () => ipcRenderer.invoke('audio-stop'),
  readRecording: (filePath: string) => ipcRenderer.invoke('audio-read', filePath),
});
