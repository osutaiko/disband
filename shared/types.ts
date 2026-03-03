export type AnalyzedNote = {
  startMs: number;
  endMs: number;
  midi: number;
  hz: number;
  confidence: number;
};

export type NoteStatus = 'ok' | 'inaccurate' | 'miss' | 'unjudged';

export type ReferenceJudgment = {
  referenceIndex: number;
  playedIndex: number | null;
  kind: NoteStatus;
  attackErrorMs: number;
};

export type SessionAnalysisResult = {
  playedNotes: AnalyzedNote[];
  referenceJudgments: ReferenceJudgment[];
  referenceToPlayed: (number | null)[];
  playedToReference: (number | null)[];
};
