import { create } from 'zustand';

interface LibraryState {
  selectedSong: string | null;
  setSelectedSong: (song: string | null) => void;
  clearSelection: () => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  selectedSong: null,
  setSelectedSong: (song) => set({ selectedSong: song }),
  clearSelection: () => set({ selectedSong: null }),
}));
