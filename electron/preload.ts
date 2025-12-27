import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  openSongsFolder: () => ipcRenderer.send('open-songs-folder'),
  getSongs: () => ipcRenderer.invoke('get-songs'),
  getSongData: (filename: string) => ipcRenderer.invoke('get-song-data', filename),
})