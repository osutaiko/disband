import {
  RefObject, useCallback, useEffect, useRef, useState,
} from 'react';

import { Circle, Trash } from 'lucide-react';
import useLibraryStore from '@/store/useLibraryStore';
import useAudioAnalysisMarkers from './useAudioAnalysisMarkers';
import useRealtimeAudio from './useRealtimeAudio';

import { handlePlayPause } from '../engine/playback';

import BarMarker from './BarMarker';
import NoteMarker from './NoteMarker';
import RealtimeWaveform from './RealtimeWaveform';

import { Button } from '@/components/ui/button';

function AudioAnalysisPanel({
  currentMsRef,
}: {
  currentMsRef: RefObject<number>;
}) {
  const {
    api, selectedTrackId, currentMs, setCurrentMs, endMs, isPlaying, pxPerMs,
  } = useLibraryStore();
  const {
    noteMarkers = [],
    barMarkers = [],
  } = useAudioAnalysisMarkers(api, selectedTrackId);

  const {
    bufferRef: audioBufferRef, reset, start, stop,
  } = useRealtimeAudio();
  const recordStartMsRef = useRef<number | null>(null);
  const wasPlayingRef = useRef(isPlaying);

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedRange, setRecordedRange] = useState<
  { startMs: number; endMs: number } | null
  >(null);

  const playheadOffset = 200;

  // Panel padding "p-6"
  const panelPadding = 24;

  // Padding before/after time=0
  const trackStartPadding = 1000;
  const totalTrackWidth = endMs * pxPerMs + (2 * trackStartPadding);
  const currentTranslation = playheadOffset
      - (currentMs * pxPerMs + trackStartPadding + panelPadding);

  const windowStart = currentMs - 500 / pxPerMs;
  const windowEnd = currentMs + 2000 / pxPerMs;

  const visibleNoteMarkers = noteMarkers.filter(
    (m) => m.timestamp + m.length >= windowStart
      && m.timestamp <= windowEnd,
  );
  const visibleBarMarkers = barMarkers.slice(1).filter(
    (m) => m.timestamp >= windowStart && m.timestamp <= windowEnd,
  );

  const quarterBarTimestamps = barMarkers
    .filter((m) => m.variant === 'whole' || m.variant === 'quarter')
    .map((m) => m.timestamp)
    .sort((a, b) => a - b);

  const getSnappedQuarterEndMs = useCallback((startMs: number, endMs: number) => {
    const nextQuarterMs = quarterBarTimestamps.find(
      (timestamp) => timestamp > endMs && timestamp > startMs,
    );
    if (nextQuarterMs !== undefined) return nextQuarterMs;
    return endMs;
  }, [quarterBarTimestamps]);

  useEffect(() => {
    let rafId: number;

    const tick = () => {
      if (currentMsRef.current !== null) {
        setCurrentMs(currentMsRef.current);
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [currentMsRef, setCurrentMs]);

  const stopRecording = useCallback(() => {
    const startMs = recordStartMsRef.current;
    if (startMs !== null) {
      setRecordedRange({ startMs, endMs: currentMsRef.current ?? currentMs });
    }

    stop();
    recordStartMsRef.current = null;
    setIsRecording(false);

    if (api?.playerState === 1) {
      api.pause();
    }
  }, [api, currentMs, getSnappedQuarterEndMs, stop]);

  let activeWaveformRange = recordedRange;

  if (isRecording && recordStartMsRef.current !== null) {
    const startMs = recordStartMsRef.current;
    activeWaveformRange = {
      startMs,
      endMs: getSnappedQuarterEndMs(startMs, currentMs),
    };
  }

  const waveformStartX = activeWaveformRange
    ? activeWaveformRange.startMs * pxPerMs + trackStartPadding
    : trackStartPadding;
  const waveformWidthPx = activeWaveformRange
    ? Math.max(1, (activeWaveformRange.endMs - activeWaveformRange.startMs) * pxPerMs)
    : 0;

  useEffect(() => {
    const playbackJustStopped = wasPlayingRef.current && !isPlaying;
    if (isRecording && playbackJustStopped) {
      stopRecording();
    }
    wasPlayingRef.current = isPlaying;
  }, [isPlaying, isRecording, stopRecording]);

  if (!api || selectedTrackId === null) return null;

  return (
    <section
      className="h-min border-t bg-background relative overflow-hidden"
      style={{ padding: `${panelPadding}px` }}
    >
      <div className="relative mask-x-from-90% h-[160px] w-full overflow-hidden">
        <div
          className="absolute top-0 h-full pt-[24px] pb-[12px] flex flex-col gap-2 will-change-transform"
          style={{
            width: `${totalTrackWidth}px`,
            transform: `translateX(${currentTranslation}px)`,
          }}
        >
          {visibleBarMarkers.map((marker, index) => (
            <BarMarker
              key={index}
              variant={marker.variant}
              timestamp={marker.timestamp}
              pxPerMs={pxPerMs}
              offsetBase={trackStartPadding}
            />
          ))}

          <div className="relative w-full h-[40px] bg-secondary py-2 z-20">
            {/* Note Markers */}
            {visibleNoteMarkers.map((marker, index) => (
              <NoteMarker
                key={index}
                timestamp={marker.timestamp}
                length={marker.length}
                offsetBase={trackStartPadding}
                pxPerMs={pxPerMs}
                isCurrentlyPlaying={
                  currentMs >= marker.timestamp
                  && currentMs < marker.timestamp + marker.length
                }
              />
            ))}
          </div>

          {/* Recorded Audio */}
          <div className="relative w-full h-[120px] bg-secondary py-2 z-20">
            <div
              className="absolute top-0 h-full will-change-transform"
              style={{
                transform: `translateX(${waveformStartX}px)`,
                width: `${waveformWidthPx}px`,
              }}
            >
              {waveformWidthPx > 0 && (
                <RealtimeWaveform audioBufferRef={audioBufferRef} className="w-full h-full" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 z-50 flex flex-col items-center gap-2 bg-background border px-2 py-2 rounded-full shadow-md">
        <Button
          variant={isRecording ? 'destructive' : 'secondary'}
          size="icon"
          className="rounded-full w-7 h-7 flex-0 aspect-square"
          onClick={() => {
            if (!isRecording) {
              recordStartMsRef.current = currentMs;
              setRecordedRange({ startMs: currentMs, endMs: currentMs });
              setIsRecording(true);

              if (!isPlaying) {
                handlePlayPause(api);
              }

              start();
              return;
            }

            stopRecording();
          }}
        >
          <Circle stroke={isRecording ? 'white' : 'red'} />
        </Button>
        <Button // TODO: confirmation dialog
          size="icon"
          className="rounded-full w-7 h-7 flex-0 aspect-square"
          onClick={() => {
            if (isRecording) {
              stopRecording();
            }

            setRecordedRange(null);
            recordStartMsRef.current = null;
            reset();
          }}
        >
          <Trash className="text-white" />
        </Button>
      </div>

      {/* Playhead */}
      <div
        className="absolute w-[1px] bg-red-500 z-100"
        style={{
          left: `${playheadOffset}px`,
          top: `${panelPadding}px`,
          bottom: `${panelPadding}px`,
        }}
      >
        <div
          className="absolute top-0 -translate-y-full left-1/2 -translate-x-1/2
                    w-0 h-0
                    border-l-[6px] border-l-transparent
                    border-r-[6px] border-r-transparent
                    border-t-[8px] border-t-red-500"
        />
        <div
          className="absolute bottom-0 translate-y-full left-1/2 -translate-x-1/2
                    w-0 h-0
                    border-l-[6px] border-l-transparent
                    border-r-[6px] border-r-transparent
                    border-b-[8px] border-b-red-500"
        />
      </div>
    </section>
  );
}

export default AudioAnalysisPanel;
