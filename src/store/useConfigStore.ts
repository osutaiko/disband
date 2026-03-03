import { create } from 'zustand';

interface ConfigState {
  pxPerMs: number;
  setPxPerMs: (ppm: number) => void;
}

const useConfigStore = create<ConfigState>((set) => ({
  pxPerMs: 0.25,
  setPxPerMs: (ppm) => set({ pxPerMs: ppm }),
}));

export default useConfigStore;
