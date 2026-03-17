import {
  RefObject, useCallback, useEffect,
} from 'react';

import { Circle, Trash } from 'lucide-react';
import useAudioAnalysisMarkers from './useAudioAnalysisMarkers';
import useRecordingTake from './useRecordingTake';
import useSessionAnalysisView from './useSessionAnalysisView';

import useLibraryStore from '@/store/useLibraryStore';
import useEngineStore from '@/store/useEngineStore';
import useConfigStore from '@/store/useConfigStore';

import BarMarker from './BarMarker';
import NoteMarker from './NoteMarker';
import RealtimeWaveform from './RealtimeWaveform';

import { Button } from '@/components/ui/button';

const FIXTURE_FILENAME_REGEX = /^(.*?)__tr-(\d+)__start-(\d+)__(\d+)\.wav$/i;

function parseFixtureStartFromPath(filePath: string): { startMs: number } | null {
  const fileName = filePath.split('/').pop() ?? filePath.split('\\').pop();
  if (!fileName) return null;

  const match = fileName.match(FIXTURE_FILENAME_REGEX);
  if (!match) return null;

  return {
    startMs: Number(match[3]),
  };
}

function AudioAnalysisPanel({
  currentMsRef,
}: {
  currentMsRef: RefObject<number>;
}) {
  const { selectedSong, selectedTrackId } = useLibraryStore();
  const {
    api, isPlaying, currentMs, endMs, setCurrentMs, playbackSpeed
  } = useEngineStore();
  const pxPerMs = useConfigStore((state) => state.settings?.theme.pxPerMs);
  const pxPerMsForCalc = pxPerMs ?? 1;
  const {
    noteMarkers = [],
    barMarkers = [],
  } = useAudioAnalysisMarkers(api, selectedTrackId);

  const selectionId = selectedTrackId === null
    ? null
    : `${selectedSong ?? 'no-song'}::${selectedTrackId}`;

  const {
    isRecording,
    recordedPath,
    currentRecordStartMs,
    persistedRecordStartMs,
    persistedRecordDurationMs,
    recordingEpoch,
    handleToggleRecording,
    handleDeleteTake,
    handleWaveformDurationChange,
  } = useRecordingTake({
    api,
    isPlaying,
    currentMs: currentMs * playbackSpeed,
    selectionId,
  });

  const playheadOffset = 200;

  // Panel padding "p-6"
  const panelPadding = 24;

  // Padding before/after time=0
  const trackStartPadding = 1000;
  const totalTrackWidth = endMs * pxPerMsForCalc + (2 * trackStartPadding);
  const currentTranslation = Math.round(
    playheadOffset - (currentMs * playbackSpeed * pxPerMsForCalc + trackStartPadding + panelPadding),
  );
  const windowStart = currentMs * playbackSpeed - 500 / pxPerMsForCalc;
  const windowEnd = currentMs * playbackSpeed + 2000 / pxPerMsForCalc;

  const barMarkersToRender = barMarkers.filter(
    (marker) => marker.timestamp >= windowStart && marker.timestamp <= windowEnd,
  );
  const {
    hoveredReferenceIndex,
    setHoveredReferenceIndex,
    noteMarkerStatuses,
    referenceJudgmentByIndex,
    noteMarkersToRender,
    referenceNotesForAnalysis,
    handleAnalysisResultChange,
    handleAnalysisRunningChange,
  } = useSessionAnalysisView({
    selectionId,
    noteMarkers,
    windowStart,
    windowEnd,
  });

  const quarterBarTimestamps = barMarkers
    .filter((m) => m.variant === 'whole' || m.variant === 'quarter')
    .map((m) => m.timestamp)
    .sort((a, b) => a - b);

  const getSnappedQuarterEndMs = useCallback((rawStartMs: number, rawEndMs: number) => {
    const nextQuarterMs = quarterBarTimestamps.find(
      (timestamp) => timestamp > rawEndMs && timestamp > rawStartMs,
    );
    if (nextQuarterMs !== undefined) return nextQuarterMs;
    return rawEndMs;
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

  let activeWaveformRange: { startMs: number; endMs: number } | null = null;

  const fixtureStartMs = recordedPath
    ? parseFixtureStartFromPath(recordedPath)?.startMs ?? null
    : null;

  if (isRecording && currentRecordStartMs !== null) {
    const startMs = currentRecordStartMs;
    activeWaveformRange = {
      startMs,
      endMs: getSnappedQuarterEndMs(startMs, currentMs * playbackSpeed),
    };
  } else if (recordedPath && persistedRecordDurationMs !== null) {
    const startMs = fixtureStartMs ?? persistedRecordStartMs ?? 0;
    activeWaveformRange = {
      startMs,
      endMs: startMs + persistedRecordDurationMs,
    };
  }

  const shouldRenderWaveform = isRecording || Boolean(recordedPath);
  const fallbackStartMs = fixtureStartMs ?? persistedRecordStartMs ?? 0;
  const waveformStartX = activeWaveformRange
    ? activeWaveformRange.startMs * pxPerMsForCalc + trackStartPadding
    : shouldRenderWaveform
      ? fallbackStartMs * pxPerMsForCalc + trackStartPadding
      : trackStartPadding;
  const waveformWidthPx = activeWaveformRange
    ? Math.max(1, (activeWaveformRange.endMs - activeWaveformRange.startMs) * pxPerMsForCalc)
    : shouldRenderWaveform
      ? 1
      : 0;

  if (!api || selectedTrackId === null || pxPerMs === undefined) return null;

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
          {barMarkersToRender.map((marker, index) => (
            <BarMarker
              key={`${marker.variant}-${marker.timestamp}-${index}`}
              variant={marker.variant}
              timestamp={marker.timestamp}
              pxPerMs={pxPerMsForCalc}
              offsetBase={trackStartPadding}
            />
          ))}

          <div className="relative w-full h-[48px] bg-muted py-2 z-20">
            {/* Note Markers */}
            {noteMarkersToRender.map((marker) => (
              <NoteMarker
                key={`note-${marker.timestamp}-${marker.length}-${marker.referenceIndex}`}
                timestamp={marker.timestamp}
                length={marker.length}
                offsetBase={trackStartPadding}
                pxPerMs={pxPerMsForCalc}
                status={noteMarkerStatuses[marker.referenceIndex]}
                midi={marker.midi}
                judgment={referenceJudgmentByIndex.get(marker.referenceIndex) ?? null}
                isHovered={hoveredReferenceIndex === marker.referenceIndex}
                onHoverChange={(hovered) => {
                  setHoveredReferenceIndex(hovered ? marker.referenceIndex : null);
                }}
                isCurrentlyPlaying={
                  currentMs * playbackSpeed >= marker.timestamp
                  && currentMs * playbackSpeed < marker.timestamp + marker.length
                }
              />
            ))}
          </div>

          {/* Recorded Audio */}
          <div className="relative w-full h-[120px] bg-muted py-2 z-20">
            <div
              className="absolute inset-y-2 will-change-[left,width]"
              style={{
                left: `${waveformStartX}px`,
                width: `${waveformWidthPx}px`,
              }}
            >
              {shouldRenderWaveform && (
                <RealtimeWaveform
                  key={`${selectionId ?? 'none'}-${recordingEpoch}`}
                  audioPath={recordedPath}
                  referenceNotes={referenceNotesForAnalysis}
                  currentMs={currentMs * playbackSpeed}
                  timelineStartMs={activeWaveformRange?.startMs ?? fallbackStartMs}
                  windowStartMs={windowStart}
                  windowEndMs={windowEnd}
                  hoveredReferenceIndex={hoveredReferenceIndex}
                  onHoveredReferenceIndexChange={setHoveredReferenceIndex}
                  onDurationMsChange={handleWaveformDurationChange}
                  onAnalysisResultChange={handleAnalysisResultChange}
                  onAnalysisRunningChange={handleAnalysisRunningChange}
                  className="w-full h-full bg-rec-track-bg rounded-sm"
                />
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
          onClick={handleToggleRecording}
        >
          <Circle stroke={isRecording ? 'white' : 'red'} />
        </Button>
        <Button // TODO: confirmation dialog
          size="icon"
          className="rounded-full w-7 h-7 flex-0 aspect-square"
          onClick={handleDeleteTake}
        >
          <Trash className="text-white" />
        </Button>
      </div>

      {/* Playhead */}
      <div
        className="absolute w-[1px] bg-playhead z-100"
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
                    border-t-[8px] border-t-playhead"
        />
        <div
          className="absolute bottom-0 translate-y-full left-1/2 -translate-x-1/2
                    w-0 h-0
                    border-l-[6px] border-l-transparent
                    border-r-[6px] border-r-transparent
                    border-b-[8px] border-b-playhead"
        />
      </div>
    </section>
  );
}

export default AudioAnalysisPanel;
