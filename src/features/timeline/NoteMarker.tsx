import type { NoteJudgment, NoteJudgmentKind } from '../../../shared/types';
import { getNoteJudgmentClass } from '@/lib/noteJudgmentClasses';
import { formatMs, formatNumber, hzToCentsDiff, midiToHz, midiToNoteName } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function NoteMarker({
  timestamp,
  length,
  offsetBase,
  pxPerMs,
  isCurrentlyPlaying,
  isHovered = false,
  onHoverChange,
  noteJudgmentKind = 'unjudged',
  midi,
  judgment,
  playedNote,
}: {
  timestamp: number;
  length: number;
  offsetBase: number;
  pxPerMs: number;
  isCurrentlyPlaying: boolean;
  isHovered?: boolean;
  onHoverChange?: (hovered: boolean) => void;
  noteJudgmentKind?: NoteJudgmentKind;
  midi?: number;
  judgment?: NoteJudgment | null;
  playedNote?: {
    startMs: number;
    endMs: number;
    midi: number;
    hz: number;
    velocity: number;
  } | null;
}) {
  const left = timestamp * pxPerMs + offsetBase;
  const width = Math.max(length * pxPerMs, 4);
  const noteJudgmentClass = getNoteJudgmentClass(noteJudgmentKind);

  function formatDeltaMs(value: number | null | undefined) {
    if (value == null || !Number.isFinite(value)) return '-';
    const rounded = Math.round(value);
    return `${rounded >= 0 ? '+' : ''}${rounded} ms`;
  }

  function formatCentDelta(value: number | null | undefined) {
    if (value == null || !Number.isFinite(value)) return '∅';
    const rounded = Math.round(value);
    return `${rounded >= 0 ? '+' : ''}${rounded}¢`;
  }

  const referenceMidi = midi ?? null;
  const playedMidi = playedNote?.midi ?? null;
  const playedMidiNearest = playedMidi === null ? null : Math.round(playedMidi);
  const referenceMidiNearest = referenceMidi === null ? null : Math.round(referenceMidi);
  const playedPitchDeltaCents = hzToCentsDiff(playedNote?.hz, midiToHz(playedMidi));
  const pitchDeltaCents = hzToCentsDiff(playedNote?.hz, midiToHz(referenceMidi));
  const pitchDeltaText = playedMidiNearest === null || referenceMidiNearest === null || playedMidiNearest !== referenceMidiNearest
    ? '∅'
    : formatCentDelta(pitchDeltaCents);
  const velocityDiffDb = judgment?.criteria.velocity.error ?? null;
  const referenceVelocity = playedNote && velocityDiffDb !== null
    ? playedNote.velocity / (10 ** (velocityDiffDb / 20))
    : null;

  const tooltipRows = judgment?.kind !== 'unjudged' ? [
    {
      label: 'Attack',
      played: formatMs(playedNote?.startMs ?? null),
      delta: formatDeltaMs(judgment?.criteria.attack.error),
      reference: formatMs(timestamp),
    },
    {
      label: 'Release',
      played: formatMs(playedNote?.endMs ?? null),
      delta: formatDeltaMs(judgment?.criteria.release.error),
      reference: formatMs(timestamp + length),
    },
    {
      label: 'Duration',
      played: formatMs(playedNote ? playedNote.endMs - playedNote.startMs : null),
      delta: formatDeltaMs(
        playedNote ? (playedNote.endMs - playedNote.startMs) - length : null,
      ),
      reference: formatMs(length),
    },
    {
      label: 'Pitch',
      played: `${midiToNoteName(playedMidi)}${formatCentDelta(playedPitchDeltaCents) === '∅' ? '' : formatCentDelta(playedPitchDeltaCents)}`,
      delta: pitchDeltaText,
      reference: midiToNoteName(referenceMidi),
    },
    {
      label: 'Articulation',
      value: formatNumber(judgment?.criteria.articulation.error, false, '', 3),
    },
    {
      label: 'Velocity',
      played: formatNumber(playedNote?.velocity ?? null, false, 'dB', 1),
      delta: formatDeltaMs(velocityDiffDb),
      reference: formatNumber(referenceVelocity ?? null, false, 'dB', 1),
    },
  ] : [];

  return (
    <TooltipProvider>
      <Tooltip open={isHovered}>
        <TooltipTrigger asChild>
          <div
            className={`
              absolute h-[calc(100%-16px)] border-l-4 rounded-r-full
              ${noteJudgmentClass}
              ${isHovered ? 'ring-2 ring-offset-1 ring-ring' : ''}
              ${isCurrentlyPlaying ? 'brightness-125' : ''}
            `}
            style={{
              left: `${left}px`,
              width: `${width}px`,
            }}
            onMouseEnter={() => onHoverChange?.(true)}
            onMouseLeave={() => onHoverChange?.(false)}
          />
        </TooltipTrigger>
        <TooltipContent className="z-100 w-auto max-w-none">
          {tooltipRows.length > 0 ? (
            <Table className="w-max">
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Played</TableHead>
                  <TableHead>Δ</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tooltipRows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="text-background/60 font-medium">{row.label}</TableCell>
                    {'value' in row ? (
                      <TableCell className="text-background" colSpan={3}>
                        {row.value}
                      </TableCell>
                    ) : (
                      <>
                        <TableCell>{row.played}</TableCell>
                        <TableCell>{row.delta}</TableCell>
                        <TableCell>{row.reference}</TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-background/50 text-xs">No match</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default NoteMarker;
