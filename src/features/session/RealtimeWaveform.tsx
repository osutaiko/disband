import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { getCssColor } from '@/lib/utils';
import type { AnalyzedNote } from '../../../shared/types';

function RealtimeWaveform({
  audioPath,
  className,
  onDurationMsChange,
  onAnalyzedNotesChange,
  onAnalysisRunningChange,
  currentMs,
  timelineStartMs = 0,
}: {
  audioPath: string | null;
  className?: string;
  onDurationMsChange?: (durationMs: number | null) => void;
  onAnalyzedNotesChange?: (notes: AnalyzedNote[]) => void;
  onAnalysisRunningChange?: (isRunning: boolean) => void;
  currentMs?: number;
  timelineStartMs?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [analyzedNotes, setAnalyzedNotes] = useState<AnalyzedNote[]>([]);

  useEffect(() => {
    onAnalyzedNotesChange?.(analyzedNotes);
  }, [analyzedNotes, onAnalyzedNotesChange]);

  useEffect(() => {
    if (!containerRef.current || waveSurferRef.current) return;

    const baseColor = getCssColor('--color-record-waveform', 'red');
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
      setAnalyzedNotes([]);
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
          setAnalyzedNotes([]);
          onDurationMsChange?.(null);
          console.error('[wavesurfer] failed to load recording', error);
        }
      });

    window.audio
      .analyzeRecording(audioPath)
      .then((notes) => {
        if (!cancelled) {
          setAnalyzedNotes(notes.map((note) => ({
            ...note,
            startMs: note.startMs + timelineStartMs,
            endMs: note.endMs + timelineStartMs,
          })));
          onAnalysisRunningChange?.(false);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAnalyzedNotes([]);
          console.error('[audio] failed to analyze recording', error);
          onAnalysisRunningChange?.(false);
        }
      });
    onAnalysisRunningChange?.(true);

    return () => {
      cancelled = true;
      onAnalysisRunningChange?.(false);
    };
  }, [audioPath, onAnalysisRunningChange, onDurationMsChange, timelineStartMs]);

  return (
    <div className={`relative ${className ?? ''}`}>
      <div ref={containerRef} className="w-full h-full" />
      {durationMs !== null && durationMs > 0 && analyzedNotes.length > 0 && (
        <>
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {analyzedNotes.map((note, index) => {
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
                  className="absolute top-0 bottom-0"
                  style={{
                    left,
                    width,
                    backgroundColor: isCurrent
                      ? 'var(--color-record-note-current-bg)'
                      : 'var(--color-record-note-bg)',
                    opacity: 0.35,
                  }}
                />
              );
            })}
          </div>

          <div className="pointer-events-none absolute inset-0 overflow-visible">
            {analyzedNotes.map((note, index) => {
              const localStartMs = note.startMs - timelineStartMs;
              const startRatio = Math.max(0, Math.min(1, localStartMs / durationMs));
              const left = `${startRatio * 100}%`;
              const isCurrent = currentMs !== undefined
                && currentMs >= note.startMs
                && currentMs < note.endMs;

              return (
                <div
                  key={`note-start-triangle-${note.startMs}-${index}`}
                  className="absolute top-0 -translate-y-full -translate-x-1/2
                             w-0 h-0
                             border-l-[5px] border-l-transparent
                             border-r-[5px] border-r-transparent
                             border-t-[7px]"
                  style={{
                    left,
                    borderTopColor: isCurrent
                      ? 'var(--color-record-note-current-start)'
                      : 'var(--color-record-note-start)',
                  }}
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
