import { useCallback, useMemo, useState } from 'react';
import useSessionStore from '@/store/useSessionStore';
import type { NoteStatus, SessionAnalysisResult } from '../../../../shared/types';

type NoteMarker = {
  timestamp: number;
  length: number;
  midi: number;
};

function useSessionAnalysisView({
  selectionId,
  noteMarkers,
  windowStart,
  windowEnd,
}: {
  selectionId: string | null;
  noteMarkers: NoteMarker[];
  windowStart: number;
  windowEnd: number;
}) {
  const [hoveredReferenceIndex, setHoveredReferenceIndex] = useState<number | null>(null);
  const {
    sessionAnalysisBySelection,
    setSessionAnalysisBySelection,
    setAnalysisInProgressBySelection,
  } = useSessionStore();

  const sessionAnalysis = selectionId ? (sessionAnalysisBySelection[selectionId] ?? null) : null;

  const noteMarkerStatuses = useMemo(() => {
    const statuses: NoteStatus[] = new Array(noteMarkers.length).fill('unjudged');
    if (!sessionAnalysis) return statuses;

    sessionAnalysis.referenceJudgments.forEach((judgment) => {
      if (
        judgment.referenceIndex >= 0
        && judgment.referenceIndex < statuses.length
      ) {
        statuses[judgment.referenceIndex] = judgment.kind;
      }
    });
    return statuses;
  }, [noteMarkers.length, sessionAnalysis]);

  const referenceJudgmentByIndex = useMemo(() => {
    const byIndex = new Map<number, SessionAnalysisResult['referenceJudgments'][number]>();
    if (!sessionAnalysis) return byIndex;
    sessionAnalysis.referenceJudgments.forEach((judgment) => {
      byIndex.set(judgment.referenceIndex, judgment);
    });
    return byIndex;
  }, [sessionAnalysis]);

  const noteMarkersToRender = useMemo(() => noteMarkers
    .map((marker, index) => ({
      ...marker,
      referenceIndex: index,
    }))
    .filter((marker) => (
      marker.timestamp + marker.length >= windowStart
      && marker.timestamp <= windowEnd
    )), [noteMarkers, windowEnd, windowStart]);

  const referenceNotesForAnalysis = useMemo(() => noteMarkers.map((note, index) => ({
    id: index,
    timestamp: note.timestamp,
    length: note.length,
    midi: note.midi,
  })), [noteMarkers]);

  const handleAnalysisResultChange = useCallback((result: SessionAnalysisResult | null) => {
    if (!selectionId) return;
    setSessionAnalysisBySelection((prev) => ({ ...prev, [selectionId]: result }));
  }, [selectionId, setSessionAnalysisBySelection]);

  const handleAnalysisRunningChange = useCallback((isRunning: boolean) => {
    if (!selectionId) return;
    setAnalysisInProgressBySelection((prev) => ({ ...prev, [selectionId]: isRunning }));
  }, [selectionId, setAnalysisInProgressBySelection]);

  return {
    hoveredReferenceIndex,
    setHoveredReferenceIndex,
    noteMarkerStatuses,
    referenceJudgmentByIndex,
    noteMarkersToRender,
    referenceNotesForAnalysis,
    handleAnalysisResultChange,
    handleAnalysisRunningChange,
  };
}

export default useSessionAnalysisView;
