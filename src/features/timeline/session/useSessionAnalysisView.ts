import { useCallback, useMemo, useState } from 'react';
import useSessionStore from '@/store/useSessionStore';
import type { NoteJudgmentKind, SessionAnalysisResult } from '../../../../shared/types';

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

  const noteJudgmentKinds = useMemo(() => {
    const kinds: NoteJudgmentKind[] = new Array(noteMarkers.length).fill('unjudged');
    if (!sessionAnalysis) return kinds;

    sessionAnalysis.noteJudgments.forEach((judgment) => {
      if (
        judgment.referenceIndex >= 0
        && judgment.referenceIndex < kinds.length
      ) {
        kinds[judgment.referenceIndex] = judgment.kind;
      }
    });
    return kinds;
  }, [noteMarkers.length, sessionAnalysis]);

  const noteJudgmentByIndex = useMemo(() => {
    const byIndex = new Map<number, SessionAnalysisResult['noteJudgments'][number]>();
    if (!sessionAnalysis) return byIndex;
    sessionAnalysis.noteJudgments.forEach((judgment) => {
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
    noteJudgmentKinds,
    noteJudgmentByIndex,
    noteMarkersToRender,
    referenceNotesForAnalysis,
    handleAnalysisResultChange,
    handleAnalysisRunningChange,
  };
}

export default useSessionAnalysisView;
