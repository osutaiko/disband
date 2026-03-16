import type {
  JudgmentSettings,
  NoteDetectionSettings,
} from '../../../shared/settings';

export type NumericKeys<T> = {
  [K in keyof T]-?: T[K] extends number ? K : never;
}[keyof T];

export type NumericFieldConfig<T> = {
  key: NumericKeys<T>;
  id: string;
  label: string;
  description?: React.ReactNode;
  step?: number;
  round?: boolean;
};

export type NumericRangeFieldConfig<T> = {
  id: string;
  label: string;
  description?: React.ReactNode;
  minKey: NumericKeys<T>;
  minId: string;
  minStep?: number;
  maxKey: NumericKeys<T>;
  maxId: string;
  maxStep?: number;
  round?: boolean;
};

export type SettingsRowConfig<T> = {
  type: 'field';
  config: NumericFieldConfig<T>;
} | {
  type: 'range';
  config: NumericRangeFieldConfig<T>;
} | {
  type: 'separator';
  id: string;
};

export const noteDetectionEntries: SettingsRowConfig<NoteDetectionSettings>[] = [
  {
    type: 'field',
    config: {
      key: 'hopSizeMs',
      id: 'hop-size-ms',
      label: 'Hop Size (ms)',
      description: 'Step size of detection in milliseconds: notes will only be detected in increments of this value',
    },
  },
  {
    type: 'field',
    config: {
      key: 'pitchFrameSizeMs',
      id: 'pitch-frame-size-ms',
      label: 'Pitch Frame Size (ms)',
      description: 'Frame size in milliseconds used for pitch estimation',
    },
  },
  {
    type: 'range',
    config: {
      id: 'pitch-hz',
      label: 'Detection Pitch Range (Hz)',
      description: 'Lowest/Highest pitch to detect',
      minKey: 'pitchMinHz',
      minId: 'pitch-min-hz',
      maxKey: 'pitchMaxHz',
      maxId: 'pitch-max-hz',
    },
  },
  {
    type: 'range',
    config: {
      id: 'midi',
      label: 'Translation MIDI Range',
      description: 'Lowest/Highest MIDI note to convert pitches into',
      minKey: 'minMidi',
      minId: 'midi-min',
      maxKey: 'maxMidi',
      maxId: 'midi-max',
      round: true,
    },
  },
  {
    type: 'field',
    config: {
      key: 'onsetThreshold',
      id: 'onset-threshold',
      label: 'Onset Threshold',
      description: 'Threshold used for waveform envelope peak picking',
    },
  },
  {
    type: 'field',
    config: {
      key: 'onsetCompensationMs',
      id: 'onset-compensation-ms',
      label: 'Onset Compensation (ms)',
      description: 'Compensation in milliseconds to match audio segmentation latency',
    },
  },
  {
    type: 'field',
    config: {
      key: 'silenceDb',
      id: 'silence-db',
      label: 'Silence Threshold (dB)',
      description: 'Threshold in dB to treat as silence',
    },
  },
  {
    type: 'field',
    config: {
      key: 'minNoteMs',
      id: 'min-note-ms',
      label: 'Min Note Length (ms)',
      description: 'Shortest note length to detect in milliseconds',
    },
  },
  {
    type: 'field',
    config: {
      key: 'minPitchConfidence',
      id: 'min-pitch-confidence',
      label: 'Min Pitch Confidence',
      description: 'Minimum confidence of pitch existence required for an audio section to treat them as note candidates',
    },
  },
];

export const judgmentEntries: SettingsRowConfig<JudgmentSettings>[] = [
  {
    type: 'field',
    config: {
      key: 'matchWindowMs',
      id: 'match-window-ms',
      label: 'Match Window',
      description: 'Maximum offset of detected note in milliseconds to pair notes with reference score',
    },
  },
  {
    type: 'separator',
    id: 'judgment-separator-1',
  },
  {
    type: 'field',
    config: {
      key: 'attackOkWindowMs',
      id: 'attack-ok-window-ms',
      label: 'Attack OK Window (ms)',
      description: 'Attack timing window in milliseconds for OK judgment',
    },
  },
  {
    type: 'field',
    config: {
      key: 'pitchToleranceSemitones',
      id: 'pitch-tolerance-semitones',
      label: 'Pitch Tolerance',
      description: 'Allowed pitch error in semitones for OK judgment',
    },
  },
  {
    type: 'separator',
    id: 'judgment-separator-2',
  },
  {
    type: 'field',
    config: {
      key: 'attackInaccurateWindowMs',
      id: 'attack-inaccurate-window-ms',
      label: 'Attack Inaccurate Window (ms)',
      description: 'Attack timing window (ms) for Inaccurate judgment (as opposed to Miss)',
    },
  },
  {
    type: 'field',
    config: {
      key: 'releaseToleranceMs',
      id: 'release-tolerance-ms',
      label: 'Release Tolerance (ms)',
      description: 'Release timing tolerance in milliseconds',
    },
  },
  {
    type: 'range',
    config: {
      id: 'velocity-tolerance-mult',
      label: 'Velocity Tolerance',
      description: 'Multiplier tolerance for note velocity',
      minKey: 'velocityToleranceMultLower',
      minId: 'velocity-tolerance-mult-lower',
      maxKey: 'velocityToleranceMultUpper',
      maxId: 'velocity-tolerance-mult-upper',
    },
  },
  {
    type: 'field',
    config: {
      key: 'articulationToleranceMult',
      id: 'articulation-tolerance-mult',
      label: 'Articulation Tolerance',
      description: 'Multiplier tolerance for note articulation',
    },
  },
];
