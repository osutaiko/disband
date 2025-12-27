import { create } from 'zustand';

interface AppState {
  isPlaying: boolean;
  score: number;
  combo: number;
  play: () => void;
  stop: () => void;
  addScore: (points: number) => void;
  resetCombo: () => void;
  incrementCombo: () => void;
  resetGame: () => void; // Added for resetting score and combo
}

export const useStore = create<AppState>((set) => ({
  isPlaying: false,
  score: 0,
  combo: 0,
  play: () => set({ isPlaying: true }),
  stop: () => set({ isPlaying: false }),
  addScore: (points) => set((state) => ({ score: state.score + points })),
  resetCombo: () => set({ combo: 0 }),
  incrementCombo: () => set((state) => ({ combo: state.combo + 1 })),
  resetGame: () => set({ score: 0, combo: 0, isPlaying: false }),
}));