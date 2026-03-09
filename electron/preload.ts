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
  onScoreZoomInMenu: (handler: () => void) => {
    const listener = () => handler();
    ipcRenderer.on('menu:score-zoom-in', listener);
    return () => ipcRenderer.removeListener('menu:score-zoom-in', listener);
  },
  onScoreZoomOutMenu: (handler: () => void) => {
    const listener = () => handler();
    ipcRenderer.on('menu:score-zoom-out', listener);
    return () => ipcRenderer.removeListener('menu:score-zoom-out', listener);
  },
  onScoreZoomResetMenu: (handler: () => void) => {
    const listener = () => handler();
    ipcRenderer.on('menu:score-zoom-reset', listener);
    return () => ipcRenderer.removeListener('menu:score-zoom-reset', listener);
  },
  onPlaybackPlayPauseMenu: (handler: () => void) => {
    const listener = () => handler();
    ipcRenderer.on('menu:playback-play-pause', listener);
    return () => ipcRenderer.removeListener('menu:playback-play-pause', listener);
  },
  onPlaybackGotoStartMenu: (handler: () => void) => {
    const listener = () => handler();
    ipcRenderer.on('menu:playback-goto-start', listener);
    return () => ipcRenderer.removeListener('menu:playback-goto-start', listener);
  },
  onPlaybackGotoEndMenu: (handler: () => void) => {
    const listener = () => handler();
    ipcRenderer.on('menu:playback-goto-end', listener);
    return () => ipcRenderer.removeListener('menu:playback-goto-end', listener);
  },
  onRecordingToggleMenu: (handler: () => void) => {
    const listener = () => handler();
    ipcRenderer.on('menu:recording-toggle', listener);
    return () => ipcRenderer.removeListener('menu:recording-toggle', listener);
  },
  onRecordingDeleteTakeMenu: (handler: () => void) => {
    const listener = () => handler();
    ipcRenderer.on('menu:recording-delete-take', listener);
    return () => ipcRenderer.removeListener('menu:recording-delete-take', listener);
  },
  onRecordingReanalyzeMenu: (handler: () => void) => {
    const listener = () => handler();
    ipcRenderer.on('menu:recording-reanalyze', listener);
    return () => ipcRenderer.removeListener('menu:recording-reanalyze', listener);
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
