import { contextBridge, ipcRenderer } from 'electron';
import type { AppSettings } from '../shared/settings';

type MenuChannel =
  | 'menu:import-song'
  | 'menu:reload-library'
  | 'menu:score-zoom-in'
  | 'menu:score-zoom-out'
  | 'menu:score-zoom-reset'
  | 'menu:playback-play-pause'
  | 'menu:playback-goto-start'
  | 'menu:playback-goto-end'
  | 'menu:recording-toggle'
  | 'menu:recording-delete-take'
  | 'menu:recording-reanalyze';

function onMenu(channel: MenuChannel, handler: () => void) {
  const listener = () => handler();
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('electron', {
  openSongsFolder: () => ipcRenderer.invoke('open-songs-folder'),
  getSongs: () => ipcRenderer.invoke('get-songs'),
  getSongData: (filename: string) => ipcRenderer.invoke('get-song-data', filename),
  onImportSongMenu: (handler: () => void) => onMenu('menu:import-song', handler),
  onReloadLibraryMenu: (handler: () => void) => onMenu('menu:reload-library', handler),
  onScoreZoomInMenu: (handler: () => void) => onMenu('menu:score-zoom-in', handler),
  onScoreZoomOutMenu: (handler: () => void) => onMenu('menu:score-zoom-out', handler),
  onScoreZoomResetMenu: (handler: () => void) => onMenu('menu:score-zoom-reset', handler),
  onPlaybackPlayPauseMenu: (handler: () => void) => onMenu('menu:playback-play-pause', handler),
  onPlaybackGotoStartMenu: (handler: () => void) => onMenu('menu:playback-goto-start', handler),
  onPlaybackGotoEndMenu: (handler: () => void) => onMenu('menu:playback-goto-end', handler),
  onRecordingToggleMenu: (handler: () => void) => onMenu('menu:recording-toggle', handler),
  onRecordingDeleteTakeMenu: (handler: () => void) => onMenu('menu:recording-delete-take', handler),
  onRecordingReanalyzeMenu: (handler: () => void) => onMenu('menu:recording-reanalyze', handler),
  getSettings: () => ipcRenderer.invoke('settings-get'),
  setSettings: (settings: AppSettings) => ipcRenderer.invoke('settings-set', settings),
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
