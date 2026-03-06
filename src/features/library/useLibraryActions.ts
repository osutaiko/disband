import { useCallback } from 'react';
import useLibraryStore from '@/store/useLibraryStore';

export function useLibraryActions() {
  const { setSongs, setSelectedSong, setSelectedTrackId } = useLibraryStore();

  const fetchSongs = useCallback(async () => {
    const fileList = await window.electron.getSongs();
    setSongs(fileList);
  }, []);

  const openSongsFolder = useCallback(async () => {
    const pendingSong = await window.electron.openSongsFolder();
    if (!pendingSong) return;

    await fetchSongs();
    setSelectedSong(pendingSong);
    setSelectedTrackId(null);
  }, [fetchSongs, setSelectedSong, setSelectedTrackId]);

  return { fetchSongs, openSongsFolder };
}
