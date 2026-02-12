/// <reference types="vite-plugin-electron/electron-env" />

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
  startAudioCapture: () => Promise<{ ok: boolean; sidecarFound?: boolean; port?: number; alreadyRunning?: boolean }>;
  stopAudioCapture: () => Promise<{ ok: boolean; alreadyStopped?: boolean }>;
  onAudioCaptureChunk: (handler: (data: ArrayBuffer) => void) => () => void;
  onAudioCaptureMessage: (handler: (message: string) => void) => () => void;
}

// Used in Renderer process, expose in `preload.ts`
declare global {
  interface IAudioAPI {
    start: () => Promise<{ ok: boolean }>;
    stop: () => Promise<{
      ok: boolean;
      alreadyStopped?: boolean;
      path?: string;
      saved?: boolean;
      fileSize?: number;
      pcmBytes?: number;
    }>;
    onChunk: (handler: (data: ArrayBuffer) => void) => () => void;
  }

  interface Window {
    ipcRenderer: import('electron').IpcRenderer;
    electron: IElectronAPI;
    audio: IAudioAPI;
  }
}
