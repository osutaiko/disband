import { AlphaTabApi, Settings } from '@coderline/alphatab';
import type { PlaybackSettings } from '../../../shared/settings';
import { SOUNDFONT_PATH_BY_PRESET } from '../../../shared/constants';
import alphaTabDefaultSettings from './alphaTabDefaultSettings.json';

export function applyAlphaTabSettings(
  api: AlphaTabApi | null,
  updater: (settings: Settings) => void,
) {
  if (!api) return;

  updater(api.settings);
  api.updateSettings();
  api.render();
}

export function buildAlphaTabSettings(playback?: PlaybackSettings | null): Settings {
  const settings = structuredClone(alphaTabDefaultSettings) as unknown as Settings;
  const preset = playback?.soundfontPreset ?? 'generaluser-gs';
  settings.player.soundFont = SOUNDFONT_PATH_BY_PRESET[preset];
  return settings;
}

export function applyRebuiltAlphaTabSettings(
  api: AlphaTabApi | null,
  playback?: PlaybackSettings | null,
) {
  if (!api) return;

  const rebuilt = buildAlphaTabSettings(playback);
  applyAlphaTabSettings(api, (currentSettings) => {
    currentSettings.player.soundFont = rebuilt.player.soundFont;
  });
}
