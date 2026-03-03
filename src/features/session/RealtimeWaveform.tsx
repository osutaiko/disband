import { useEffect, useMemo, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { getCssColor } from '@/lib/utils';
import type {
  NoteStatus,
  SessionAnalysisResult,
} from '../../../shared/types';

function RealtimeWaveform({
  audioPath,
  className,
  onDurationMsChange,
  onAnalysisResultChange,
  onAnalysisRunningChange,
  referenceNotes = [],
  analyzedNoteStatuses = [],
  currentMs,
  timelineStartMs = 0,
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
  analyzedNoteStatuses?: NoteStatus[];
  currentMs?: number;
  timelineStartMs?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<SessionAnalysisResult | null>(null);
  const analyzedNotes = analysisResult?.playedNotes ?? [];

  const noteVisuals = useMemo(() => analyzedNotes.map((note, index) => {
    const status = analyzedNoteStatuses[index] ?? 'unjudged';
    const bgClass = status === 'ok'
      ? 'bg-rec-note-ok-bg'
      : status === 'inaccurate'
        ? 'bg-rec-note-inacc-bg'
        : status === 'miss'
          ? 'bg-rec-note-miss-bg'
          : 'bg-rec-note-unj-bg';
    const triangleColor = status === 'ok'
      ? 'var(--color-rec-note-ok-bg)'
      : status === 'inaccurate'
        ? 'var(--color-rec-note-inacc-bg)'
        : status === 'miss'
          ? 'var(--color-rec-note-miss-bg)'
          : 'var(--color-rec-note-unj-bg)';

    return {
      note,
      index,
      status,
      bgClass,
      triangleColor,
    };
  }), [analyzedNoteStatuses, analyzedNotes]);

  useEffect(() => {
    onAnalysisResultChange?.(analysisResult);
  }, [analysisResult, onAnalysisResultChange]);

  useEffect(() => {
    if (!containerRef.current || waveSurferRef.current) return;

    const baseColor = getCssColor('--color-rec-waveform', 'black');
    waveSurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      height: containerRef.current.clientHeight,
      waveColor: baseColor,
      progressColor: baseColor,
      cursorWidth: 0,
      interact: false,
      dragToSeek: false,
      normalize: true,
    });

    return () => {
      waveSurferRef.current?.destroy();
      waveSurferRef.current = null;
    };
  }, []);

  useEffect(() => {
    const waveSurfer = waveSurferRef.current;
    if (!waveSurfer) return;

    if (!audioPath) {
      waveSurfer.empty();
      setDurationMs(null);
      setAnalysisResult(null);
      onDurationMsChange?.(null);
      onAnalysisRunningChange?.(false);
      return;
    }

    let cancelled = false;

    window.audio
      .readRecording(audioPath)
      .then((data) => {
        if (cancelled) return;
        const blob = new Blob([data], { type: 'audio/wav' });
        return waveSurfer.loadBlob(blob).then(() => {
          if (cancelled) return;
          const durationSec = waveSurfer.getDuration();
          const durationMs = Number.isFinite(durationSec) && durationSec > 0
            ? Math.round(durationSec * 1000)
            : null;
          setDurationMs(durationMs);
          onDurationMsChange?.(durationMs);
        });
      })
      .catch((error) => {
        if (!cancelled) {
          setDurationMs(null);
          setAnalysisResult(null);
          onDurationMsChange?.(null);
          console.error('[wavesurfer] failed to load recording', error);
        }
      });

    window.audio
      .analyzeRecording(
        audioPath,
        referenceNotes.map((note) => ({
          ...note,
          timestamp: note.timestamp - timelineStartMs,
        })),
      )
      .then((result) => {
        if (!cancelled) {
          setAnalysisResult({
            ...result,
            playedNotes: result.playedNotes.map((note) => ({
              ...note,
              startMs: note.startMs + timelineStartMs,
              endMs: note.endMs + timelineStartMs,
            })),
          });
          onAnalysisRunningChange?.(false);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAnalysisResult(null);
          console.error('[audio] failed to analyze recording', error);
          onAnalysisRunningChange?.(false);
        }
      });
    onAnalysisRunningChange?.(true);

    return () => {
      cancelled = true;
      onAnalysisRunningChange?.(false);
    };
  }, [
    audioPath,
    onAnalysisRunningChange,
    onDurationMsChange,
    referenceNotes,
    timelineStartMs,
  ]);

  return (
    <div className={`relative ${className ?? ''}`}>
      <div ref={containerRef} className="absolute inset-0 z-20" />
      {durationMs !== null && durationMs > 0 && analyzedNotes.length > 0 && (
        <>
          <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
            {noteVisuals.map(({ note, index, bgClass }) => {
              const localStartMs = note.startMs - timelineStartMs;
              const localEndMs = note.endMs - timelineStartMs;
              const startRatio = Math.max(0, Math.min(1, localStartMs / durationMs));
              const endRatio = Math.max(startRatio, Math.min(1, localEndMs / durationMs));
              const left = `${startRatio * 100}%`;
              const width = `${Math.max((endRatio - startRatio) * 100, 0.25)}%`;
                 
              const isCurrent = currentMs !== undefined
                && currentMs >= note.startMs
                && currentMs < note.endMs;

              return (
                <div
                  key={`note-bg-${note.startMs}-${note.endMs}-${index}`}
                  className={`absolute top-0 bottom-0 ${bgClass} ${isCurrent ? 'brightness-125' : ''}`}
                  style={{
                    left,
                    width,
                  }}
                />
              );
            })}
          </div>

          <div className="pointer-events-none absolute inset-0 overflow-visible z-30">
            {noteVisuals.map(({ note, index, triangleColor }) => {
              const localStartMs = note.startMs - timelineStartMs;
              const startRatio = Math.max(0, Math.min(1, localStartMs / durationMs));
              const left = `${startRatio * 100}%`;

              return (
                <div
                  key={`note-start-triangle-${note.startMs}-${index}`}
                  className="absolute top-0 -translate-y-full -translate-x-1/2
                             w-0 h-0
                             border-l-[5px] border-l-transparent
                             border-r-[5px] border-r-transparent
                             border-t-[7px]"
                  style={{ left, borderTopColor: triangleColor }}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default RealtimeWaveform;
