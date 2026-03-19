import type { SoundfontPreset } from './settings';

export const SUPPORTED_EXTENSIONS = [
  '.gp', 
  '.gp3', 
  '.gp4', 
  '.gp5', 
  '.gpx', 
  '.gpback'
];

export const SOUNDFONT_PATH_BY_PRESET: Record<SoundfontPreset, string> = {
  sonivox: '/soundfonts/sonivox.sf2',
  'generaluser-gs': '/soundfonts/generaluser-gs.sf2',
};
