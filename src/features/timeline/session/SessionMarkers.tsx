import type { SessionAnalysisResult } from '../../../../shared/types';
import { getCriterionStatus } from '@/lib/utils';

function SessionMarkers({
  durationMs,
  analyzedNotesToRender,
  analysisResult,
  currentMs,
  timelineStartMs,
  hoveredReferenceIndex,
  onHoveredReferenceIndexChange,
}: {
  durationMs: number;
  analyzedNotesToRender: Array<{
    note: SessionAnalysisResult['playedNotes'][number];
    index: number;
  }>;
  analysisResult: SessionAnalysisResult | null;
  currentMs?: number;
  timelineStartMs: number;
  hoveredReferenceIndex?: number | null;
  onHoveredReferenceIndexChange?: (index: number | null) => void;
}) {
  if (durationMs <= 0 || analyzedNotesToRender.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {analyzedNotesToRender.map(({ note, index }) => {
        const localStartMs = note.startMs - timelineStartMs;
        const localEndMs = note.endMs - timelineStartMs;
        const startRatio = Math.max(0, Math.min(1, localStartMs / durationMs));
        const endRatio = Math.max(startRatio, Math.min(1, localEndMs / durationMs));
        const left = `${startRatio * 100}%`;
        const width = `${Math.max((endRatio - startRatio) * 100, 0.25)}%`;

        const isCurrent = currentMs !== undefined
          && currentMs >= note.startMs
          && currentMs < note.endMs;
        const referenceIndex = analysisResult?.playedToReference?.[index] ?? null;
        const judgment = referenceIndex === null
          ? null
          : analysisResult?.referenceJudgments.find((j) => j.referenceIndex === referenceIndex);
        const kind = judgment?.kind ?? 'unjudged';
        const attackStatus = judgment
          ? getCriterionStatus({ criterion: 'attack', kind, pass: judgment.criteria.attack.pass })
          : 'unjudged';
        const pitchStatus = judgment
          ? getCriterionStatus({ criterion: 'pitch', kind, pass: judgment.criteria.pitch.pass })
          : 'unjudged';
        const releaseStatus = judgment
          ? getCriterionStatus({ criterion: 'release', kind, pass: judgment.criteria.release.pass })
          : 'unjudged';
        const isHovered = referenceIndex !== null && hoveredReferenceIndex === referenceIndex;

        return (
          <div
            key={`note-visual-${note.startMs}-${note.endMs}-${index}`}
            className={`absolute top-0 bottom-0 z-10 overflow-hidden rounded-r-xl pointer-events-auto
                  ${kind === 'ok' ? 'bg-rec-note-ok-bg'
              : kind === 'inaccurate' ? 'bg-rec-note-inacc-bg'
                : kind === 'miss' ? 'bg-rec-note-miss-bg'
                  : 'bg-rec-note-unj-bg'}
                  ${pitchStatus === 'miss' ? 'border-b-6 border-note-miss' : ''}
                  ${isHovered ? 'ring-2 ring-offset-1 ring-ring' : ''}
                  ${isCurrent ? 'brightness-125' : ''}
                `}
            style={{ left, width }}
            onMouseEnter={() => {
              if (referenceIndex !== null) {
                onHoveredReferenceIndexChange?.(referenceIndex);
              }
            }}
            onMouseLeave={() => {
              onHoveredReferenceIndexChange?.(null);
            }}
          >
            {judgment
              && (
                <>
                  <div
                    className={`absolute top-0 left-0 w-[12px] h-[12px] ${
                      attackStatus === 'inaccurate' ? 'bg-note-inacc' : 'bg-note-ok'
                    } [clip-path:polygon(0_0,100%_0,0_100%)]`}
                  />
                  {kind !== 'miss'
                    && (
                      <div
                        className={`absolute bottom-0 right-0 w-[12px] h-[12px] ${
                          releaseStatus === 'ok' ? 'bg-note-ok' : 'bg-note-inacc'
                        } [clip-path:polygon(100%_0,0_100%,100%_100%)]`}
                      />
                    )
                  }
                </>
              )
            }
          </div>
        );
      })}
    </div>
  );
}

export default SessionMarkers;
