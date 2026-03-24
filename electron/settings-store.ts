import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { app } from 'electron';
import type { AppSettings } from '../shared/settings';
import { getAudioAnalyzePath } from './utils';

const SETTINGS_FILE_NAME = 'settings.json';
let cachedSettings: AppSettings | null = null;
let cachedDefaultSettings: AppSettings | null = null;

function settingsPath(): string {
  return path.join(app.getPath('userData'), SETTINGS_FILE_NAME);
}

function cloneSettings(settings: AppSettings): AppSettings {
  return {
    audioDevice: { ...settings.audioDevice },
    appearance: { ...settings.appearance },
    tabDisplay: { ...settings.tabDisplay },
    playback: { ...settings.playback },
    noteDetection: { ...settings.noteDetection },
    judgment: { ...settings.judgment },
  };
}

function toRecord(input: unknown): Record<string, unknown> {
  return (input && typeof input === 'object') ? input as Record<string, unknown> : {};
}

function mergeSection<T extends Record<string, unknown>>(input: unknown, fallback: T): T {
  return {
    ...fallback,
    ...toRecord(input),
  } as T;
}

function normalizeAudioDeviceSource(input: unknown): AppSettings['audioDevice'] {
  const source = toRecord(input);
  return {
    input: typeof source.input === 'string' ? source.input : undefined,
    output: typeof source.output === 'string' ? source.output : undefined,
  };
}

function parseNativeDefaultSettings(input: unknown): AppSettings {
  const source = toRecord(input);

  return {
    audioDevice: normalizeAudioDeviceSource(source.audioDevice),
    appearance: toRecord(source.appearance) as AppSettings['appearance'],
    tabDisplay: toRecord(source.tabDisplay) as AppSettings['tabDisplay'],
    playback: toRecord(source.playback) as AppSettings['playback'],
    noteDetection: toRecord(source.noteDetection) as AppSettings['noteDetection'],
    judgment: toRecord(source.judgment) as AppSettings['judgment'],
  };
}

function normalizeSettings(input: unknown, defaults: AppSettings): AppSettings {
  const source = toRecord(input);
  const audioDeviceSource = normalizeAudioDeviceSource(source.audioDevice);
  return {
    audioDevice: mergeSection(audioDeviceSource, defaults.audioDevice),
    appearance: mergeSection(source.appearance, defaults.appearance),
    tabDisplay: mergeSection(source.tabDisplay, defaults.tabDisplay),
    playback: mergeSection(source.playback, defaults.playback),
    noteDetection: mergeSection(source.noteDetection, defaults.noteDetection),
    judgment: mergeSection(source.judgment, defaults.judgment),
  };
}

function getNativeDefaultSettings(): AppSettings {
  if (cachedDefaultSettings) {
    return cloneSettings(cachedDefaultSettings);
  }

  const appRoot = process.env.APP_ROOT;
  if (!appRoot) {
    throw new Error('[settings-store] APP_ROOT is not set');
  }

  const exe = getAudioAnalyzePath(appRoot);
  const result = spawnSync(exe, ['--print-default-settings'], {
    encoding: 'utf8',
  });

  if (result.error) {
    throw new Error(
      `[settings-store] failed to get native defaults: ${String(result.error.message)}`,
    );
  }

  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(
      '[settings-store] native defaults command failed: '
      + `${stderr || `exit ${result.status}`}. `
      + 'Rebuild disband-audio-analyze with --print-default-settings support.',
    );
  }

  const stdout = (result.stdout || '').trim();
  const parsed = parseNativeDefaultSettings(JSON.parse(stdout));
  cachedDefaultSettings = parsed;
  return cloneSettings(parsed);
}

export function getSettings(): AppSettings {
  if (cachedSettings) {
    return cloneSettings(cachedSettings);
  }

  const filePath = settingsPath();
  const defaults = getNativeDefaultSettings();
  if (!fs.existsSync(filePath)) {
    cachedSettings = cloneSettings(defaults);
    return cloneSettings(cachedSettings);
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    cachedSettings = normalizeSettings(JSON.parse(raw), defaults);
  } catch {
    cachedSettings = cloneSettings(defaults);
  }

  return cloneSettings(cachedSettings);
}

export function setSettings(nextSettings: AppSettings): AppSettings {
  const defaults = getNativeDefaultSettings();
  const normalized = normalizeSettings(nextSettings, defaults);
  cachedSettings = normalized;
  fs.writeFileSync(settingsPath(), JSON.stringify(normalized, null, 2), 'utf8');
  return cloneSettings(normalized);
}

export function resetSettings(): AppSettings {
  const defaults = getNativeDefaultSettings();
  cachedSettings = cloneSettings(defaults);
  fs.writeFileSync(settingsPath(), JSON.stringify(cachedSettings, null, 2), 'utf8');
  return cloneSettings(cachedSettings);
}
