import { create } from 'zustand';

interface SongMetadata {
  title: string;
  artist: string;
  album: string;
  tempo: number;
  tracks: { index: number; name: string }[];
}

interface LibraryState {
  selectedSong: string | null;
  setSelectedSong: (song: string | null) => void;
  metadata: SongMetadata | null;
  setMetadata: (metadata: SongMetadata | null) => void;
  clearSelection: () => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  selectedSong: null,
  setSelectedSong: (song) => set({ selectedSong: song }),
  metadata: null,
  setMetadata: (metadata) => set({ metadata }),
  clearSelection: () => set({ selectedSong: null }),
}));
