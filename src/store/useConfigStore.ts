import { create } from 'zustand';
import type { AppSettings } from '../../shared/settings';

type ConfigState = {
  settings: AppSettings | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSettings: (settings: AppSettings) => Promise<void>;
  updateSettings: (updater: (previous: AppSettings) => AppSettings) => Promise<void>;
};

function pickSettings(state: AppSettings): AppSettings {
  return {
    audioIO: state.audioIO,
    theme: state.theme,
    noteDetection: state.noteDetection,
    judgment: state.judgment,
  };
}

function requireSettings(settings: AppSettings | null): AppSettings {
  if (!settings) {
    throw new Error('Settings are not hydrated yet.');
  }
  return settings;
}

const useConfigStore = create<ConfigState>((set, get) => ({
  settings: null,
  hydrated: false,
  hydrate: async () => {
    const settings = await window.electron.getSettings();
    set({
      settings,
      hydrated: true,
    });
  },
  setSettings: async (settings) => {
    const saved = await window.electron.setSettings(settings);
    set({
      settings: saved,
      hydrated: true,
    });
  },
  updateSettings: async (updater) => {
    const previous = pickSettings(requireSettings(get().settings));
    const next = updater(previous);
    const saved = await window.electron.setSettings(next);
    set({
      settings: saved,
      hydrated: true,
    });
  },
}));

export default useConfigStore;
