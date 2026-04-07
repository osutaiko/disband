export type AnalyzedNote = {
  startMs: number;
  endMs: number;
  midi: number;
  hz: number;
  confidence: number;
};

export type NoteStatus = 'ok' | 'inaccurate' | 'miss' | 'unjudged';

export type CriterionResult = {
  error: number | null;
  pass: boolean | null;
};

export type ReferenceJudgment = {
  referenceIndex: number;
  playedIndex: number | null;
  inRecordedTimeframe: boolean;
  kind: NoteStatus;
  criteria: {
    attack: CriterionResult;
    release: CriterionResult;
    pitch: CriterionResult;
    velocity: CriterionResult;
    muting: CriterionResult;
    articulation: CriterionResult;
  };
};

export type SessionAnalysisResult = {
  playedNotes: AnalyzedNote[];
  referenceJudgments: ReferenceJudgment[];
  referenceToPlayed: (number | null)[];
  playedToReference: (number | null)[];
};
