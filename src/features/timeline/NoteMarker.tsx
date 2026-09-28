import type { NoteJudgment, NoteJudgmentKind } from '../../../shared/types';
import { Badge } from '@/components/ui/badge';
import { getNoteJudgmentClass, getCriterionJudgmentClass } from '@/lib/noteJudgmentClasses';
import {
  formatMs,
  formatNumber,
  getCriterionJudgmentStatus,
  hzToCentsDiff,
  midiToHz,
  midiToNoteName,
  type CriterionName,
} from '@/lib/utils';
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

  function getDeltaBadgeClass(criterion: CriterionName) {
    return getCriterionJudgmentClass(
      getCriterionJudgmentStatus({
        criterion,
        noteJudgmentKind,
        pass: judgment?.criteria[criterion].pass ?? null,
      }),
    );
  }

  const referenceMidi = midi ?? null;
  const playedMidi = playedNote?.midi ?? null;
  const playedPitchDeltaCents = hzToCentsDiff(playedNote?.hz, midiToHz(playedMidi));
  const pitchDeltaCents = hzToCentsDiff(playedNote?.hz, midiToHz(referenceMidi));
  const playedPitchDeltaText = formatCentDelta(playedPitchDeltaCents);
  const pitchDeltaText = playedMidi === null
    || referenceMidi === null
    || Math.round(playedMidi) !== Math.round(referenceMidi)
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
      deltaClassName: getDeltaBadgeClass('attack'),
      reference: formatMs(timestamp),
    },
    {
      label: 'Release',
      played: formatMs(playedNote?.endMs ?? null),
      delta: formatDeltaMs(judgment?.criteria.release.error),
      deltaClassName: getDeltaBadgeClass('release'),
      reference: formatMs(timestamp + length),
    },
    {
      label: 'Duration',
      played: formatMs(playedNote ? playedNote.endMs - playedNote.startMs : null),
      delta: formatDeltaMs(
        playedNote ? (playedNote.endMs - playedNote.startMs) - length : null,
      ),
      deltaClassName: getDeltaBadgeClass('release'),
      reference: formatMs(length),
    },
    {
      label: 'Pitch',
      played: `${midiToNoteName(playedMidi)}${playedPitchDeltaCents == null ? '' : ` ${playedPitchDeltaText}`}`,
      delta: pitchDeltaText,
      deltaClassName: getDeltaBadgeClass('pitch'),
      reference: midiToNoteName(referenceMidi),
    },
    {
      label: 'Articulation',
      value: formatNumber(judgment?.criteria.articulation.error ?? null, false, '', 3),
    },
    {
      label: 'Velocity',
      played: formatNumber(playedNote?.velocity ?? null, false, 'dB', 1),
      delta: formatNumber(velocityDiffDb, true, 'dB', 1),
      deltaClassName: getDeltaBadgeClass('velocity'),
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
        <TooltipContent sideOffset={8} className="z-100 w-auto max-w-none rounded-lg px-3 py-2 shadow-lg">
          {tooltipRows.length > 0 ? (
            <Table className="w-max text-xs tabular-nums [&_td]:px-3 [&_td]:py-1.5 [&_th]:h-8 [&_th]:px-3 [&_tr]:border-background/10 [&_tr]:hover:bg-transparent">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-background/60">Metric</TableHead>
                  <TableHead className="text-right text-background/60">Played</TableHead>
                  <TableHead className="text-center text-background/60">Δ</TableHead>
                  <TableHead className="text-right text-background/60">Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tooltipRows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="text-background/80 font-medium">{row.label}</TableCell>
                    {'value' in row ? (
                      <>
                        <TableCell />
                        <TableCell>
                          <Badge variant="ghost" className="min-w-16 rounded-md bg-background/10 text-background">
                            {row.value}
                          </Badge>
                        </TableCell>
                        <TableCell />
                      </>
                    ) : (
                      <>
                        <TableCell className="text-right">{row.played}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`min-w-16 rounded-md text-foreground ${row.deltaClassName}`}
                          >
                            {row.delta}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-background/60">{row.reference}</TableCell>
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
