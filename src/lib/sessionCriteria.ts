import type { NoteStatus } from '../../shared/types';

export type CriterionName = 'attack' | 'pitch' | 'release' | 'velocity' | 'muting' | 'articulation';

export type CriterionBadgeStatus = 'ok' | 'inaccurate' | 'miss' | 'unjudged';

export function getCriterionStatus({
  criterion,
  rowStatus,
  pass,
}: {
  criterion: CriterionName;
  rowStatus: NoteStatus;
  pass: boolean | null;
}): CriterionBadgeStatus {
  if (criterion === 'attack') return rowStatus;
  if (pass === true) return 'ok';
  if (pass === false) return 'miss';
  return 'unjudged';
}

export function getBadgeStatusClass(status: CriterionBadgeStatus | NoteStatus) {
  return status === 'ok'
    ? 'border-note-ok bg-note-ok-bg'
    : status === 'inaccurate'
      ? 'border-note-inacc bg-note-inacc-bg'
      : status === 'miss'
        ? 'border-note-miss bg-note-miss-bg'
        : 'border-note-unj bg-note-unj-bg';
}

export function getNoteStatusClass(status: NoteStatus) {
  return getBadgeStatusClass(status);
}
