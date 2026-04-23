export type AnalyzedNote = {
  startMs: number;
  endMs: number;
  midi: number;
  hz: number;
  confidence: number;
  velocity: number;
};

export type NoteJudgmentKind = 'ok' | 'inaccurate' | 'miss' | 'unjudged';

export type CriterionJudgment = {
  error: number | null;
  pass: boolean | null;
};

export type NoteJudgment = {
  referenceIndex: number;
  playedIndex: number | null;
  inRecordedTimeframe: boolean;
  kind: NoteJudgmentKind;
  criteria: {
    attack: CriterionJudgment;
    release: CriterionJudgment;
    pitch: CriterionJudgment;
    velocity: CriterionJudgment;
    articulation: CriterionJudgment;
  };
};

export type SessionAnalysisResult = {
  playedNotes: AnalyzedNote[];
  noteJudgments: NoteJudgment[];
  referenceToPlayed: (number | null)[];
  playedToReference: (number | null)[];
};
