import { create } from 'zustand';

interface EngineState {
  api: any | null;
  setApi: (api: any | null) => void;

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
}

const useEngineStore = create<EngineState>((set) => ({  
  api: null,
  setApi: (api) => set({ api }),
  
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
}));

export default useEngineStore;
