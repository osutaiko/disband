import { create } from 'zustand';
import type { AnalyzedNote } from '../../shared/types';

interface SongMetadata {
  id: string;
  title: string;
  artist: string;
  album: string;
  tempo: number;
}

interface Track {
  index: number;
  name: string;
}

interface LibraryState {
  api: any | null;
  setApi: (api: any | null) => void;

  selectedSong: string | null;
  setSelectedSong: (song: string | null) => void;
  clearSelection: () => void;
  songsMetadata: Record<string, SongMetadata>
  setSongsMetadata: (data: Record<string, SongMetadata>) => void
  upsertSongMetadata: (id: string, data: SongMetadata) => void

  tracks: Track[] | null;
  setTracks: (tracks: Track[] | null) => void;
  selectedTrackId: number | null;
  setSelectedTrackId: (id: number | null) => void;

  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;

  currentMs: number;
  setCurrentMs: (current: number) => void;
  endMs: number;
  setEndMs: (end: number) => void;

  currentBar: number;
  setCurrentBar: (current: number) => void;
  endBar: number;
  setEndBar: (end: number) => void;

  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;

  recordedPaths: Record<string, string | null>;
  setRecordedPaths: (
    updater: (prev: Record<string, string | null>) => Record<string, string | null>
  ) => void;

  analyzedNotesBySelection: Record<string, AnalyzedNote[]>;
  setAnalyzedNotesBySelection: (
    updater: (prev: Record<string, AnalyzedNote[]>) => Record<string, AnalyzedNote[]>
  ) => void;
  analysisInProgressBySelection: Record<string, boolean>;
  setAnalysisInProgressBySelection: (
    updater: (prev: Record<string, boolean>) => Record<string, boolean>
  ) => void;

  pxPerMs: number;
  setPxPerMs: (ppm: number) => void;
}

const useLibraryStore = create<LibraryState>((set) => ({
  api: null,
  setApi: (api) => set({ api }),

  selectedSong: null,
  setSelectedSong: (song) => set({ selectedSong: song }),
  clearSelection: () => set({ selectedSong: null }),
  songsMetadata: {},
  setSongsMetadata: (data) => set({ songsMetadata: data }),
  upsertSongMetadata: (id, data) => set((state) => ({
    songsMetadata: {
      ...state.songsMetadata,
      [id]: data,
    },
  })),

  tracks: null,
  setTracks: (tracks) => set({ tracks }),
  selectedTrackId: null,
  setSelectedTrackId: (id) => set({ selectedTrackId: id }),

  isPlaying: false,
  setIsPlaying: (isPlaying) => set({ isPlaying }),

  currentMs: 0,
  setCurrentMs: (current) => set({ currentMs: current }),
  endMs: 0,
  setEndMs: (end) => set({ endMs: end }),

  currentBar: 0,
  setCurrentBar: (current) => set({ currentBar: current }),
  endBar: 0,
  setEndBar: (end) => set({ endBar: end }),

  isRecording: false,
  setIsRecording: (isRecording) => set({ isRecording }),

  recordedPaths: {},
  setRecordedPaths: (updater) => set((state) => ({
    recordedPaths: updater(state.recordedPaths),
  })),

  analyzedNotesBySelection: {},
  setAnalyzedNotesBySelection: (updater) => set((state) => ({
    analyzedNotesBySelection: updater(state.analyzedNotesBySelection),
  })),
  analysisInProgressBySelection: {},
  setAnalysisInProgressBySelection: (updater) => set((state) => ({
    analysisInProgressBySelection: updater(state.analysisInProgressBySelection),
  })),

  pxPerMs: 0.25,
  setPxPerMs: (ppm) => set({ pxPerMs: ppm }),
}));

export default useLibraryStore;
