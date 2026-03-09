/// <reference types="vite-plugin-electron/electron-env" />
import type { SessionAnalysisResult } from '../shared/types';

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

export interface IElectronAPI {
  openSongsFolder: () => Promise<string | null>;
  getSongs: () => Promise<string[]>;
  getSongData: (filename: string) => Promise<Uint8Array>;
  onImportSongMenu: (handler: () => void) => () => void;
  onReloadLibraryMenu: (handler: () => void) => () => void;
  onScoreZoomInMenu: (handler: () => void) => () => void;
  onScoreZoomOutMenu: (handler: () => void) => () => void;
  onScoreZoomResetMenu: (handler: () => void) => () => void;
  onPlaybackPlayPauseMenu: (handler: () => void) => () => void;
  onPlaybackGotoStartMenu: (handler: () => void) => () => void;
  onPlaybackGotoEndMenu: (handler: () => void) => () => void;
  startAudioCapture: () => Promise<{
    ok: boolean; sidecarFound?: boolean; port?: number; alreadyRunning?: boolean
  }>;
  stopAudioCapture: () => Promise<{ ok: boolean; alreadyStopped?: boolean }>;
  onAudioCaptureChunk: (handler: (data: ArrayBuffer) => void) => () => void;
  onAudioCaptureMessage: (handler: (message: string) => void) => () => void;
}

// Used in Renderer process, expose in `preload.ts`
declare global {
  interface IAudioAPI {
    analyzeRecording: (
      filePath: string,
      referenceNotes?: Array<{
        id: number;
        timestamp: number;
        length: number;
        midi: number;
      }>,
    ) => Promise<SessionAnalysisResult>;
    start: () => Promise<{ ok: boolean; path?: string; url?: string }>;
    stop: () => Promise<{
      ok: boolean;
      alreadyStopped?: boolean;
      path?: string;
      url?: string;
      saved?: boolean;
      fileSize?: number;
    }>;
    readRecording: (filePath: string) => Promise<ArrayBuffer>;
  }

  interface Window {
    ipcRenderer: import('electron').IpcRenderer;
    electron: IElectronAPI;
    audio: IAudioAPI;
  }
}
