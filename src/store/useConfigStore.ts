import { create } from 'zustand';
import type { AppSettings } from '../../shared/settings';

let isSettingsListenerBound = false;

type ConfigState = {
  settings: AppSettings | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSettings: (settings: AppSettings) => Promise<void>;
};

const useConfigStore = create<ConfigState>((set) => ({
  settings: null,
  hydrated: false,
  hydrate: async () => {
    if (!isSettingsListenerBound) {
      window.electron.onSettingsChanged((nextSettings) => {
        set({
          settings: nextSettings,
          hydrated: true,
        });
      });
      isSettingsListenerBound = true;
    }

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
}));

export default useConfigStore;
