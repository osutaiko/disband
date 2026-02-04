import { create } from 'zustand';

interface SongMetadata {
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
  metadata: SongMetadata | null;
  setMetadata: (metadata: SongMetadata | null) => void;

  tracks: Track[] | null;
  setTracks: (tracks: Track[] | null) => void;
  selectedTrackId: number | null;
  setSelectedTrackId: (id: number | null) => void;

  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;

  currentTime: number;
  setCurrentTime: (current: number) => void;
  endTime: number;
  setEndTime: (end: number) => void;

  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  api: null,
  setApi: (api) => set({ api }),

  selectedSong: null,
  setSelectedSong: (song) => set({ selectedSong: song }),
  clearSelection: () => set({ selectedSong: null }),
  metadata: null,
  setMetadata: (metadata) => set({ metadata }),
  
  tracks: null,
  setTracks: (tracks) => set({ tracks }),
  selectedTrackId: null,
  setSelectedTrackId: (id) => set({ selectedTrackId: id }),

  isPlaying: false,
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  
  currentTime: 0,
  setCurrentTime: (current) => set({ currentTime: current }),
  endTime: 0,
  setEndTime: (end) => set({ endTime: end }),

  isRecording: false,
  setIsRecording: (isRecording) => set({ isRecording }),
}));
