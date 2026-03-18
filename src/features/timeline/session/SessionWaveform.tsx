import type { SessionAnalysisResult } from '../../../../shared/types';
import SessionCanvas from './SessionCanvas';
import SessionMarkers from './SessionMarkers';
import useSessionWaveSurfer from './useSessionWaveSurfer';

function SessionWaveform({
  audioPath,
  className,
  onDurationMsChange,
  onAnalysisResultChange,
  onAnalysisRunningChange,
  referenceNotes = [],
  currentMs,
  timelineStartMs = 0,
  windowStartMs,
  windowEndMs,
  hoveredReferenceIndex,
  onHoveredReferenceIndexChange,
}: {
  audioPath: string | null;
  className?: string;
  onDurationMsChange?: (durationMs: number | null) => void;
  onAnalysisResultChange?: (result: SessionAnalysisResult | null) => void;
  onAnalysisRunningChange?: (isRunning: boolean) => void;
  referenceNotes?: Array<{
    id: number;
    timestamp: number;
    length: number;
    midi: number;
  }>;
  currentMs?: number;
  timelineStartMs?: number;
  windowStartMs?: number;
  windowEndMs?: number;
  hoveredReferenceIndex?: number | null;
  onHoveredReferenceIndexChange?: (index: number | null) => void;
}) {
  const {
    containerRef,
    durationMs,
    analysisResult,
  } = useSessionWaveSurfer({
    audioPath,
    onDurationMsChange,
    onAnalysisResultChange,
    onAnalysisRunningChange,
    referenceNotes,
    timelineStartMs,
  });

  const analyzedNotes = analysisResult?.playedNotes ?? [];
  const analyzedNotesToRender = analyzedNotes
    .map((note, index) => ({ note, index }))
    .filter(({ note }) => {
      if (windowStartMs === undefined || windowEndMs === undefined) return true;
      return note.endMs >= windowStartMs && note.startMs <= windowEndMs;
    });

  return (
    <div className={`relative ${className ?? ''}`}>
      <SessionCanvas containerRef={containerRef} />
      {durationMs !== null && (
        <SessionMarkers
          durationMs={durationMs}
          analyzedNotesToRender={analyzedNotesToRender}
          analysisResult={analysisResult}
          currentMs={currentMs}
          timelineStartMs={timelineStartMs}
          hoveredReferenceIndex={hoveredReferenceIndex}
          onHoveredReferenceIndexChange={onHoveredReferenceIndexChange}
        />
      )}
    </div>
  );
}

export default SessionWaveform;
