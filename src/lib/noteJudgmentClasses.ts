import type { NoteJudgmentKind } from '../../shared/types';
import type { CriterionJudgmentStatus } from './utils';

function getJudgmentClass(kind: CriterionJudgmentStatus | NoteJudgmentKind) {
  if (kind === 'ok') return 'border-note-ok bg-note-ok-bg';
  if (kind === 'inaccurate') return 'border-note-inacc bg-note-inacc-bg';
  if (kind === 'miss') return 'border-note-miss bg-note-miss-bg';
  return 'border-note-unj bg-note-unj-bg';
}

export function getNoteJudgmentClass(kind: NoteJudgmentKind) {
  return getJudgmentClass(kind);
}

export function getCriterionJudgmentClass(status: CriterionJudgmentStatus) {
  return getJudgmentClass(status);
}
