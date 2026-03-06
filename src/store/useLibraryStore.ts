import { create } from 'zustand';

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
  songs: string[] | null;
  setSongs: (songs: string[] | null) => void;

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
}

const useLibraryStore = create<LibraryState>((set) => ({
  songs: null,
  setSongs: (songs) => set({ songs }),

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
}));

export default useLibraryStore;
