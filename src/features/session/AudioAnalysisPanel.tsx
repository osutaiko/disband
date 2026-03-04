import {
  RefObject, useCallback, useEffect, useMemo, useRef, useState,
} from 'react';

import { Circle, Trash } from 'lucide-react';
import useAudioAnalysisMarkers from './useAudioAnalysisMarkers';

import { handlePlayPause } from '../engine/playback';

import useLibraryStore from '@/store/useLibraryStore';
import useEngineStore from '@/store/useEngineStore';
import useConfigStore from '@/store/useConfigStore';
import useSessionStore from '@/store/useSessionStore';

import BarMarker from './BarMarker';
import NoteMarker from './NoteMarker';
import RealtimeWaveform from './RealtimeWaveform';
import type { NoteStatus, SessionAnalysisResult } from '../../../shared/types';

import { Button } from '@/components/ui/button';

const FIXTURE_FILENAME_REGEX = /^(.*?)__tr-(\d+)__start-(\d+)__(\d+)\.wav$/i;

function deriveNoteStatusFromJudgment(judgment: SessionAnalysisResult['referenceJudgments'][number]): NoteStatus {
  if (judgment.playedIndex === null) {
    return judgment.inRecordedTimeframe ? 'miss' : 'unjudged';
  }

  const evaluatedCriteria = [
    judgment.criteria.attack.pass,
    judgment.criteria.release.pass,
    judgment.criteria.pitch.pass,
    judgment.criteria.velocity.pass,
    judgment.criteria.muting.pass,
    judgment.criteria.articulation.pass,
  ].filter((value): value is boolean => value !== null);

  if (evaluatedCriteria.length === 0) return 'unjudged';
  return evaluatedCriteria.every((value) => value) ? 'ok' : 'inaccurate';
}

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
  const { api, isPlaying, currentMs, endMs, setCurrentMs } = useEngineStore();
  const { recordedPaths, setRecordedPaths, sessionAnalysisBySelection, setSessionAnalysisBySelection, setAnalysisInProgressBySelection } = useSessionStore();
  const { pxPerMs } = useConfigStore();
  const {
    noteMarkers = [],
    barMarkers = [],
  } = useAudioAnalysisMarkers(api, selectedTrackId);

  const recordStartMsRef = useRef<Record<string, number | null>>({});
  const wasPlayingRef = useRef(isPlaying);
  const previousSelectionIdRef = useRef<string | null>(null);

  const [recordingState, setRecordingState] = useState<Record<string, boolean>>({});
  const [recordedStartMs, setRecordedStartMs] = useState<Record<string, number | null>>({});
  const [recordedDurationsMs, setRecordedDurationsMs] = useState<Record<string, number | null>>({});
  const [recordingEpoch, setRecordingEpoch] = useState<Record<string, number>>({});

  const selectionId = selectedTrackId === null
    ? null
    : `${selectedSong ?? 'no-song'}::${selectedTrackId}`;
  const isRecording = selectionId ? recordingState[selectionId] ?? false : false;
  const recordedPath = selectionId ? recordedPaths[selectionId] ?? null : null;

  const playheadOffset = 200;

  // Panel padding "p-6"
  const panelPadding = 24;

  // Padding before/after time=0
  const trackStartPadding = 1000;
  const totalTrackWidth = endMs * pxPerMs + (2 * trackStartPadding);
  const currentTranslation = Math.round(
    playheadOffset - (currentMs * pxPerMs + trackStartPadding + panelPadding),
  );

  const windowStart = currentMs - 500 / pxPerMs;
  const windowEnd = currentMs + 2000 / pxPerMs;

  const visibleBarMarkers = barMarkers.slice(1).filter(
    (m) => m.timestamp >= windowStart && m.timestamp <= windowEnd,
  );

  const sessionAnalysis = selectionId ? (sessionAnalysisBySelection[selectionId] ?? null) : null;

  const noteMarkerStatuses = useMemo(() => {
    const statuses: NoteStatus[] = new Array(noteMarkers.length).fill('unjudged');
    if (!sessionAnalysis) return statuses;

    sessionAnalysis.referenceJudgments.forEach((judgment) => {
      if (
        judgment.referenceIndex >= 0
        && judgment.referenceIndex < statuses.length
      ) {
        statuses[judgment.referenceIndex] = deriveNoteStatusFromJudgment(judgment);
      }
    });
    return statuses;
  }, [noteMarkers.length, sessionAnalysis]);

  const playedNoteStatuses = useMemo(() => {
    if (!sessionAnalysis) return [];
    const referenceStatusByIndex = new Map<number, NoteStatus>();
    sessionAnalysis.referenceJudgments.forEach((judgment) => {
      referenceStatusByIndex.set(
        judgment.referenceIndex,
        deriveNoteStatusFromJudgment(judgment),
      );
    });

    return sessionAnalysis.playedToReference.map((referenceIndex) => (
      referenceIndex === null
        ? 'unjudged'
        : (referenceStatusByIndex.get(referenceIndex) ?? 'unjudged')
    ));
  }, [sessionAnalysis]);

  const visibleNoteMarkersWithIndex = noteMarkers
    .map((marker, index) => ({ marker, index }))
    .filter(({ marker }) => (
      marker.timestamp + marker.length >= windowStart
      && marker.timestamp <= windowEnd
    ));

  const referenceNotesForAnalysis = useMemo(() => noteMarkers.map((note, index) => ({
    id: index,
    timestamp: note.timestamp,
    length: note.length,
    midi: note.midi,
  })), [noteMarkers]);

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

  const stopRecordingForSelection = useCallback(async (id: string) => {
    recordStartMsRef.current[id] = null;
    setRecordingState((prev) => ({ ...prev, [id]: false }));
    try {
      const result = await window.audio.stop();
      if (result?.path) {
        setRecordedPaths((prev) => ({ ...prev, [id]: result.path ?? null }));
      }
    } catch (error) {
      console.error('[audio] failed to stop recording', error);
    }

    if (api?.playerState === 1) {
      api.pause();
    }
  }, [api, setRecordedPaths]);

  const stopRecording = useCallback(() => {
    if (!selectionId) return;
    void stopRecordingForSelection(selectionId);
  }, [selectionId, stopRecordingForSelection]);

  const handleWaveformDurationChange = useCallback((durationMs: number | null) => {
    if (!selectionId || isRecording) return;
    setRecordedDurationsMs((prev) => ({ ...prev, [selectionId]: durationMs }));
  }, [isRecording, selectionId]);

  const handleAnalysisResultChange = useCallback((result: SessionAnalysisResult | null) => {
    if (!selectionId) return;
    setSessionAnalysisBySelection((prev) => ({ ...prev, [selectionId]: result }));
  }, [selectionId, setSessionAnalysisBySelection]);

  const handleAnalysisRunningChange = useCallback((isRunning: boolean) => {
    if (!selectionId) return;
    setAnalysisInProgressBySelection((prev) => ({ ...prev, [selectionId]: isRunning }));
  }, [selectionId, setAnalysisInProgressBySelection]);

  let activeWaveformRange: { startMs: number; endMs: number } | null = null;

  const currentRecordStartMs = selectionId
    ? recordStartMsRef.current[selectionId] ?? null
    : null;
  const persistedRecordStartMs = selectionId
    ? recordedStartMs[selectionId] ?? null
    : null;
  const persistedRecordDurationMs = selectionId
    ? recordedDurationsMs[selectionId] ?? null
    : null;
  const fixtureStartMs = recordedPath
    ? parseFixtureStartFromPath(recordedPath)?.startMs ?? null
    : null;

  if (isRecording && currentRecordStartMs !== null) {
    const startMs = currentRecordStartMs;
    activeWaveformRange = {
      startMs,
      endMs: getSnappedQuarterEndMs(startMs, currentMs),
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
    ? activeWaveformRange.startMs * pxPerMs + trackStartPadding
    : shouldRenderWaveform
      ? fallbackStartMs * pxPerMs + trackStartPadding
      : trackStartPadding;
  const waveformWidthPx = activeWaveformRange
    ? Math.max(1, (activeWaveformRange.endMs - activeWaveformRange.startMs) * pxPerMs)
    : shouldRenderWaveform
      ? 1
      : 0;

  useEffect(() => {
    const playbackJustStopped = wasPlayingRef.current && !isPlaying;
    if (isRecording && playbackJustStopped) {
      stopRecording();
    }
    wasPlayingRef.current = isPlaying;
  }, [isPlaying, isRecording, stopRecording]);

  useEffect(() => {
    if (!selectionId) return;

    const previousSelectionId = previousSelectionIdRef.current;
    if (previousSelectionId && previousSelectionId !== selectionId) {
      if (recordingState[previousSelectionId]) {
        void stopRecordingForSelection(previousSelectionId);
      }
    }

    previousSelectionIdRef.current = selectionId;
  }, [recordingState, selectionId, stopRecordingForSelection]);

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
              key={`${marker.variant}-${marker.timestamp}-${index}`}
              variant={marker.variant}
              timestamp={marker.timestamp}
              pxPerMs={pxPerMs}
              offsetBase={trackStartPadding}
            />
          ))}

          <div className="relative w-full h-[48px] bg-secondary py-2 z-20">
            {/* Note Markers */}
            {visibleNoteMarkersWithIndex.map(({ marker, index }) => (
              <NoteMarker
                key={`note-${marker.timestamp}-${marker.length}-${index}`}
                timestamp={marker.timestamp}
                length={marker.length}
                offsetBase={trackStartPadding}
                pxPerMs={pxPerMs}
                status={noteMarkerStatuses[index]}
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
              className="absolute inset-y-2 will-change-[left,width]"
              style={{
                left: `${waveformStartX}px`,
                width: `${waveformWidthPx}px`,
              }}
            >
              {shouldRenderWaveform && (
                <RealtimeWaveform
                  key={`${selectionId ?? 'none'}-${recordingEpoch[selectionId ?? ''] ?? 0}`}
                  audioPath={recordedPath}
                  referenceNotes={referenceNotesForAnalysis}
                  analyzedNoteStatuses={playedNoteStatuses}
                  currentMs={currentMs}
                  timelineStartMs={activeWaveformRange?.startMs ?? fallbackStartMs}
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
          onClick={() => {
            if (!isRecording) {
              if (!selectionId) return;

              recordStartMsRef.current[selectionId] = currentMs;
              setRecordedStartMs((prev) => ({ ...prev, [selectionId]: currentMs }));
              setRecordedDurationsMs((prev) => ({ ...prev, [selectionId]: 0 }));
              setRecordingState((prev) => ({ ...prev, [selectionId]: true }));
              setRecordedPaths((prev) => ({ ...prev, [selectionId]: null }));
              setRecordingEpoch((prev) => ({
                ...prev,
                [selectionId]: (prev[selectionId] ?? 0) + 1,
              }));

              if (!isPlaying) {
                handlePlayPause(api);
              }

              window.audio.start().catch((error) => {
                console.error('[audio] failed to start recording', error);
              });
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

            if (!selectionId) return;
            recordStartMsRef.current[selectionId] = null;
            setRecordedStartMs((prev) => ({ ...prev, [selectionId]: null }));
            setRecordedDurationsMs((prev) => ({ ...prev, [selectionId]: null }));
            setRecordedPaths((prev) => ({ ...prev, [selectionId]: null }));
            setSessionAnalysisBySelection((prev) => ({ ...prev, [selectionId]: null }));
            setAnalysisInProgressBySelection((prev) => ({ ...prev, [selectionId]: false }));
          }}
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
