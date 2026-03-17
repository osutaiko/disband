import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import type {
  SessionAnalysisResult,
} from '../../../shared/types';

import { getCssColor } from '@/lib/utils';
import { useColorTheme } from '@/components/ui/color-theme-provider';

function RealtimeWaveform({
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
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<SessionAnalysisResult | null>(null);
  const analyzedNotes = analysisResult?.playedNotes ?? [];
  const analyzedNotesToRender = analyzedNotes
    .map((note, index) => ({ note, index }))
    .filter(({ note }) => {
      if (windowStartMs === undefined || windowEndMs === undefined) return true;
      return note.endMs >= windowStartMs && note.startMs <= windowEndMs;
    });

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
          setDurationMs(null);
          setAnalysisResult(null);
          onDurationMsChange?.(null);
          onAnalysisRunningChange?.(false);
          console.error('[wavesurfer] failed to load recording', error);
        }
      });

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

  const { colorTheme } = useColorTheme();

  function applyWaveSurferColors(waveSurfer: WaveSurfer) { 
    const baseColor = getCssColor('--color-rec-waveform', 'black');
    waveSurfer.setOptions({ waveColor: baseColor, progressColor: baseColor, }); 
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const waveSurfer = waveSurferRef.current;
      if (!waveSurfer) return;
      applyWaveSurferColors(waveSurfer);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [colorTheme]);

  return (
    <div className={`relative ${className ?? ''}`}>
      <div ref={containerRef} className="absolute inset-0 z-20 pointer-events-none" />
      {durationMs !== null && durationMs > 0 && analyzedNotesToRender.length > 0 && (
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
              const isHovered = referenceIndex !== null && hoveredReferenceIndex === referenceIndex;

              return (
                <div
                  key={`note-visual-${note.startMs}-${note.endMs}-${index}`}
                  className={`absolute top-0 bottom-0 z-10 overflow-hidden rounded-r-md pointer-events-auto
                        ${judgment
                    ? (judgment.kind === 'ok' ? 'bg-rec-note-ok-bg'
                      : judgment.kind === 'inaccurate' ? 'bg-rec-note-inacc-bg'
                        : judgment.kind === 'miss' ? 'bg-rec-note-miss-bg'
                          : 'bg-rec-note-unj-bg'
                    ) : 'bg-rec-note-unj-bg'}
                        ${judgment && !judgment.criteria.pitch.pass ? 'border-b-6 border-note-miss' : ''}
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
                            judgment.criteria.attack.pass ? 'bg-note-ok'
                              : (judgment.kind === 'inaccurate' ? 'bg-note-inacc' : 'bg-note-ok')
                          } [clip-path:polygon(0_0,100%_0,0_100%)]`}
                        />
                        {judgment.kind !== 'miss'
                          && (
                            <div
                              className={`absolute bottom-0 right-0 w-[12px] h-[12px] ${
                                judgment.criteria.release.pass ? 'bg-note-ok' : 'bg-note-inacc'
                              } [clip-path:polygon(100%_0,0_100%,100%_100%)]`}
                            />
                          )}
                      </>
                    )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default RealtimeWaveform;
