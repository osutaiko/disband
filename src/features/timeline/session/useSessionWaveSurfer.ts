import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import type { SessionAnalysisResult } from '../../../../shared/types';
import { getCssColor } from '@/lib/utils';
import { useColorTheme } from '@/components/ui/color-theme-provider';

let waveSurferPlayback: WaveSurfer | null = null;
let recordedTimelineStartMs = 0;

export function registerRecordedWaveSurfer(next: WaveSurfer | null) {
  waveSurferPlayback = next;
}

export function registerRecordedTimelineStart(nextTimelineStartMs: number) {
  recordedTimelineStartMs = nextTimelineStartMs;
}

export function playRecordedWaveform() {
  waveSurferPlayback?.play();
}

export function pauseRecordedWaveform() {
  waveSurferPlayback?.pause();
}

export function seekRecordedWaveform(currentMs: number) {
  const duration = waveSurferPlayback?.getDuration() ?? 0;
  if (duration <= 0) return;
  const relativeMs = Math.max(0, currentMs - recordedTimelineStartMs);
  waveSurferPlayback?.seekTo(Math.min(1, Math.max(0, relativeMs / (duration * 1000))));
}

export function setRecordedWaveformPlaybackRate(playbackRate: number) {
  waveSurferPlayback?.setPlaybackRate(playbackRate);
}

function useSessionWaveSurfer({
  audioPath,
  onDurationMsChange,
  onAnalysisResultChange,
  onAnalysisRunningChange,
  referenceNotes,
  timelineStartMs,
}: {
  audioPath: string | null;
  onDurationMsChange?: (durationMs: number | null) => void;
  onAnalysisResultChange?: (result: SessionAnalysisResult | null) => void;
  onAnalysisRunningChange?: (isRunning: boolean) => void;
  referenceNotes: Array<{
    id: number;
    timestamp: number;
    length: number;
    midi: number;
  }>;
  timelineStartMs: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<SessionAnalysisResult | null>(null);

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
    registerRecordedWaveSurfer(waveSurferRef.current);
    registerRecordedTimelineStart(timelineStartMs);

    return () => {
      registerRecordedWaveSurfer(null);
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
          const nextDurationMs = Number.isFinite(durationSec) && durationSec > 0
            ? Math.round(durationSec * 1000)
            : null;
          setDurationMs(nextDurationMs);
          onDurationMsChange?.(nextDurationMs);
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

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const waveSurfer = waveSurferRef.current;
      if (!waveSurfer) return;
      const baseColor = getCssColor('--color-rec-waveform', 'black');
      waveSurfer.setOptions({ waveColor: baseColor, progressColor: baseColor });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [colorTheme]);

  return {
    containerRef,
    durationMs,
    analysisResult,
  };
}

export default useSessionWaveSurfer;
