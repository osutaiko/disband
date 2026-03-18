import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import type { AlphaTabApi } from '@coderline/alphatab';
import { handlePlayPause } from '../../engine/playback';
import useSessionStore from '@/store/useSessionStore';

function useRecordingTake({
  api,
  isPlaying,
  currentMs,
  selectionId,
}: {
  api: AlphaTabApi | null;
  isPlaying: boolean;
  currentMs: number;
  selectionId: string | null;
}) {
  const {
    recordedPaths,
    setRecordedPaths,
    setSessionAnalysisBySelection,
    setAnalysisInProgressBySelection,
  } = useSessionStore();

  const recordStartMsRef = useRef<Record<string, number | null>>({});
  const wasPlayingRef = useRef(isPlaying);
  const previousSelectionIdRef = useRef<string | null>(null);

  const [recordingState, setRecordingState] = useState<Record<string, boolean>>({});
  const [recordedStartMs, setRecordedStartMs] = useState<Record<string, number | null>>({});
  const [recordedDurationsMs, setRecordedDurationsMs] = useState<Record<string, number | null>>({});
  const [recordingEpoch, setRecordingEpoch] = useState<Record<string, number>>({});

  const isRecording = selectionId ? recordingState[selectionId] ?? false : false;
  const recordedPath = selectionId ? recordedPaths[selectionId] ?? null : null;
  const currentRecordStartMs = selectionId ? recordStartMsRef.current[selectionId] ?? null : null;
  const persistedRecordStartMs = selectionId ? recordedStartMs[selectionId] ?? null : null;
  const persistedRecordDurationMs = selectionId ? recordedDurationsMs[selectionId] ?? null : null;
  const currentEpoch = selectionId ? (recordingEpoch[selectionId] ?? 0) : 0;

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

  const handleToggleRecording = useCallback(() => {
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
  }, [api, currentMs, isPlaying, isRecording, selectionId, setRecordedPaths, stopRecording]);

  const handleDeleteTake = useCallback(() => {
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
  }, [
    isRecording,
    selectionId,
    setAnalysisInProgressBySelection,
    setRecordedPaths,
    setSessionAnalysisBySelection,
    stopRecording,
  ]);

  const handleReanalyzeTake = useCallback(() => {
    if (!selectionId || !recordedPath || isRecording) return;
    setRecordingEpoch((prev) => ({
      ...prev,
      [selectionId]: (prev[selectionId] ?? 0) + 1,
    }));
  }, [isRecording, recordedPath, selectionId]);

  const handleWaveformDurationChange = useCallback((durationMs: number | null) => {
    if (!selectionId || isRecording) return;
    setRecordedDurationsMs((prev) => ({ ...prev, [selectionId]: durationMs }));
  }, [isRecording, selectionId]);

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

  useEffect(() => {
    const offToggle = window.electron.onRecordingToggleMenu(() => handleToggleRecording());
    const offDelete = window.electron.onRecordingDeleteTakeMenu(() => handleDeleteTake());
    const offReanalyze = window.electron.onRecordingReanalyzeMenu(() => handleReanalyzeTake());

    return () => {
      offToggle();
      offDelete();
      offReanalyze();
    };
  }, [handleDeleteTake, handleReanalyzeTake, handleToggleRecording]);

  return {
    isRecording,
    recordedPath,
    currentRecordStartMs,
    persistedRecordStartMs,
    persistedRecordDurationMs,
    recordingEpoch: currentEpoch,
    handleToggleRecording,
    handleDeleteTake,
    handleWaveformDurationChange,
  };
}

export default useRecordingTake;
