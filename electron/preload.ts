import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  openSongsFolder: () => ipcRenderer.send('open-songs-folder'),
  getSongs: () => ipcRenderer.invoke('get-songs'),
  getSongData: (filename: string) => ipcRenderer.invoke('get-song-data', filename),
});

contextBridge.exposeInMainWorld("audio", {
  start: () => ipcRenderer.invoke("audio-start"),
  stop: () => ipcRenderer.invoke("audio-stop"),

  onChunk: (cb: (data: ArrayBuffer) => void) => {
    const listener = (_: any, data: Buffer) => {
      cb(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
    };

    ipcRenderer.on("audio-capture-chunk", listener);

    return () => {
      ipcRenderer.removeListener("audio-capture-chunk", listener);
    };
  },
});
