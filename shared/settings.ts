export type SoundfontPreset = 'sonivox' | 'generaluser-gs';

export type AudioDeviceSettings = {
  input?: string;
  output?: string;
};
export type AppearanceSettings = Record<string, never>;
export type TabDisplaySettings = Record<string, never>;

export type PlaybackSettings = {
  pxPerMs: number;
  soundfontPreset: SoundfontPreset;
};

export type NoteDetectionSettings = {
  hopSizeMs: number;
  pitchFrameSizeMs: number;
  pitchMinHz: number;
  pitchMaxHz: number;
  onsetThreshold: number;
  onsetCompensationMs: number;
  silenceDb: number;
  minNoteMs: number;
  minPitchConfidence: number;
  minMidi: number;
  maxMidi: number;
};

export type JudgmentSettings = {
  matchWindowMs: number;
  attackOkWindowMs: number;
  attackInaccurateWindowMs: number;
  releaseToleranceMs: number;
  pitchToleranceSemitones: number;
  velocityAnalysisWindowMs: number;
  velocityToleranceMultLower: number;
  velocityToleranceMultUpper: number;
  articulationToleranceMult: number;
};

export type AppSettings = {
  audioDevice: AudioDeviceSettings;
  appearance: AppearanceSettings;
  tabDisplay: TabDisplaySettings;
  playback: PlaybackSettings;
  noteDetection: NoteDetectionSettings;
  judgment: JudgmentSettings;
};
