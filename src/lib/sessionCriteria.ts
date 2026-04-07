import type { NoteStatus } from '../../shared/types';
import type { NoteCriterionStatus } from './utils';

export function getBadgeStatusClass(status: NoteCriterionStatus | NoteStatus) {
  if (status === 'ok') return 'border-note-ok bg-note-ok-bg';
  if (status === 'inaccurate') return 'border-note-inacc bg-note-inacc-bg';
  if (status === 'miss') return 'border-note-miss bg-note-miss-bg';
  return 'border-note-unj bg-note-unj-bg';
}

export function getNoteStatusClass(status: NoteStatus) {
  return getBadgeStatusClass(status);
}
