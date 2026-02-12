import { useCallback, useEffect } from 'react';
import { AlphaTabApi, Settings } from '@coderline/alphatab';
import useLibraryStore from '@/store/useLibraryStore';

const useSongMetadata = () => {
  const { setSongsMetadata } = useLibraryStore();

  const loadAllMetadata = useCallback(async () => {
    const songFiles: string[] = await window.electron.getSongs();
    const result: Record<string, any> = {};

    songFiles.map(async (id) => {
      try {
        const data = await window.electron.getSongData(id);

        const container = document.createElement('div');
        container.style.display = 'none';
        document.body.appendChild(container);

        const api = new AlphaTabApi(container, new Settings());
        await api.load(new Uint8Array(data));

        const { score } = api;

        result[id] = {
          id,
          title: score?.title || 'Unknown Title',
          artist: score?.artist || 'Unknown Artist',
          album: score?.album || '',
          tempo: score?.tempo || 0,
        };

        api.destroy();
        document.body.removeChild(container);
      } catch {
        result[id] = {
          id,
          title: '',
          artist: '',
          album: '',
          tempo: 0,
        };
      }
    });

    setSongsMetadata(result);
  }, [setSongsMetadata]);

  useEffect(() => {
    requestIdleCallback(() => {
      loadAllMetadata();
    });
  }, [loadAllMetadata]);
};

export default useSongMetadata;
