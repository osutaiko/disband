import { useCallback, useEffect } from 'react';
import { importer, Settings } from '@coderline/alphatab';
import useLibraryStore from '@/store/useLibraryStore';

const useSongMetadata = () => {
  const { setSongsMetadata } = useLibraryStore();

  const loadAllMetadata = useCallback(async () => {
    const songFiles: string[] = await window.electron.getSongs();
    const entries = await Promise.all(songFiles.map(async (id) => {
      try {
        const data = await window.electron.getSongData(id);
        const score = importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(data), new Settings());

        return [id, {
          id,
          title: score?.title || 'Unknown Title',
          artist: score?.artist || 'Unknown Artist',
          album: score?.album || '',
          tempo: score?.tempo || 0,
        }] as const;
      } catch {
        return [id, {
          id,
          title: '',
          artist: '',
          album: '',
          tempo: 0,
        }] as const;
      }
    }));

    const result = Object.fromEntries(entries);

    setSongsMetadata(result);
  }, [setSongsMetadata]);

  useEffect(() => {
    requestIdleCallback(() => {
      loadAllMetadata();
    });
  }, [loadAllMetadata]);
};

export default useSongMetadata;
