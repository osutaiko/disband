export type SoundfontPreset = 'sonivox' | 'fluidr3';

export type AudioIOSettings = Record<string, never>;

export type ThemeSettings = {
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
  velocityToleranceMultLower: number;
  velocityToleranceMultUpper: number;
  articulationToleranceMult: number;
};

export type AppSettings = {
  audioIO: AudioIOSettings;
  theme: ThemeSettings;
  noteDetection: NoteDetectionSettings;
  judgment: JudgmentSettings;
};
