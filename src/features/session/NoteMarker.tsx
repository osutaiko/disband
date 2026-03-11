import type { ReferenceJudgment } from '../../../shared/types';
import { midiToNoteName } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function NoteMarker({
  timestamp,
  length,
  offsetBase,
  pxPerMs,
  isCurrentlyPlaying,
  isHovered = false,
  onHoverChange,
  status = 'unjudged',
  midi,
  judgment,
}: {
  timestamp: number;
  length: number;
  offsetBase: number;
  pxPerMs: number;
  isCurrentlyPlaying: boolean;
  isHovered?: boolean;
  onHoverChange?: (hovered: boolean) => void;
  status?: 'ok' | 'inaccurate' | 'miss' | 'unjudged';
  midi?: number;
  judgment?: ReferenceJudgment | null;
}) {
  const left = timestamp * pxPerMs + offsetBase;
  const width = Math.max(length * pxPerMs, 4);
  const statusClass = status === 'ok'
    ? 'border-note-ok bg-note-ok-bg'
    : status === 'inaccurate'
      ? 'border-note-inacc bg-note-inacc-bg'
        : status === 'miss'
          ? 'border-note-miss bg-note-miss-bg'
          : 'border-note-unj bg-note-unj-bg';

  function formatErrorValue(value: number | null | undefined) {
    if (value == null || !Number.isFinite(value)) return '-';
    const rounded = Math.round(value);
    return `${rounded >= 0 ? '+' : ''}${rounded}ms`;
  }

  const hasJudgment = Boolean(judgment && judgment.kind && judgment.kind !== 'unjudged');
  const tooltipText = hasJudgment ? (
    <>
      <p className="text-background">{midi !== undefined ? midiToNoteName(midi) : '-'}</p>
      <p className="text-background">Attack: {formatErrorValue(judgment?.criteria.attack.error)}</p>
      <p className="text-background">
        Release: {formatErrorValue(judgment?.criteria.release.error)} (duration {Math.round(length)} ms)
      </p>
    </>
  ) : (
    <p className="text-background/50">No match</p>
  );

  return (
    <TooltipProvider>
      <Tooltip open={isHovered}>
        <TooltipTrigger asChild>
          <div
            className={`
              absolute h-[calc(100%-16px)] border-l-4 rounded-r-full
              ${statusClass}
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
        <TooltipContent className="z-100">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default NoteMarker;
