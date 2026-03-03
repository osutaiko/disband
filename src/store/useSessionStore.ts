import { create } from 'zustand';
import type { SessionAnalysisResult } from '../../shared/types';

interface SessionState {
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;

  recordedPaths: Record<string, string | null>;
  setRecordedPaths: (
    updater: (prev: Record<string, string | null>) => Record<string, string | null>
  ) => void;

  sessionAnalysisBySelection: Record<string, SessionAnalysisResult | null>;
  setSessionAnalysisBySelection: (
    updater: (
      prev: Record<string, SessionAnalysisResult | null>
    ) => Record<string, SessionAnalysisResult | null>
  ) => void;
  analysisInProgressBySelection: Record<string, boolean>;
  setAnalysisInProgressBySelection: (
    updater: (prev: Record<string, boolean>) => Record<string, boolean>
  ) => void;
}

const useSessionStore = create<SessionState>((set) => ({
  isRecording: false,
  setIsRecording: (isRecording) => set({ isRecording }),

  recordedPaths: {},
  setRecordedPaths: (updater) => set((state) => ({
    recordedPaths: updater(state.recordedPaths),
  })),

  sessionAnalysisBySelection: {},
  setSessionAnalysisBySelection: (updater) => set((state) => ({
    sessionAnalysisBySelection: updater(state.sessionAnalysisBySelection),
  })),
  analysisInProgressBySelection: {},
  setAnalysisInProgressBySelection: (updater) => set((state) => ({
    analysisInProgressBySelection: updater(state.analysisInProgressBySelection),
  })),
}));

export default useSessionStore;
