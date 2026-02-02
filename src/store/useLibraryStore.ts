import { create } from 'zustand';

interface SongMetadata {
  title: string;
  artist: string;
  album: string;
  tempo: number;
  tracks: { index: number; name: string }[];
}

interface LibraryState {
  api: any | null; 
  setApi: (api: any | null) => void;

  selectedSong: string | null;
  setSelectedSong: (song: string | null) => void;
  metadata: SongMetadata | null;
  setMetadata: (metadata: SongMetadata | null) => void;
  clearSelection: () => void;

  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;

  currentTime: number;
  setCurrentTime: (current: number) => void;
  endTime: number;
  setEndTime: (end: number) => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  api: null,
  setApi: (api) => set({ api }),

  selectedSong: null,
  setSelectedSong: (song) => set({ selectedSong: song }),
  metadata: null,
  setMetadata: (metadata) => set({ metadata }),
  clearSelection: () => set({ selectedSong: null }),

  isPlaying: false,
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  
  currentTime: 0,
  setCurrentTime: (current) => set({ currentTime: current }),
  endTime: 0,
  setEndTime: (end) => set({ endTime: end }),
}));
