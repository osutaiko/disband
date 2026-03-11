import { useEffect, useState } from 'react';
import { ChevronRight, FolderOpen, ListRestart } from 'lucide-react';
import useLibraryStore from '@/store/useLibraryStore';
import { useLibraryActions } from './useLibraryActions';

import { Button } from '@/components/ui/button';
import Panel from '@/components/ui/Panel';

function LibraryPanel() {
  const {
    songs, songsMetadata, selectedSong, setSelectedSong, setSelectedTrackId,
  } = useLibraryStore();
  const { fetchSongs, openSongsFolder } = useLibraryActions();
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  useEffect(() => {
    const offImport = window.electron.onImportSongMenu(() => void openSongsFolder());
    const offReload = window.electron.onReloadLibraryMenu(() => void fetchSongs());
    return () => {
      offImport();
      offReload();
    };
  }, [fetchSongs, openSongsFolder]);

  return (
    <Panel
      className="flex flex-col overflow-hidden border-b"
      contentClassName="flex-1 overflow-hidden"
      isCollapsible
      isScrollable
      title="Library"
      actions={[
        {
          title: 'Import Song File',
          icon: <FolderOpen />,
          onClick: openSongsFolder,
        },
        {
          title: 'Refresh Song List',
          icon: <ListRestart />,
          onClick: fetchSongs,
        },
      ]}
    >
      {/* TODO: Search/filter functionality */}

      {/* Song Catalog */}
      {songs?.length === 0
        ? (
          <p className="p-2 text-muted-foreground">
            No songs found. Click the "
            <FolderOpen className="inline-flex" size={12} />
            " button above to add a Guitar Pro file from disk.
          </p>
        )
        : (
          <div className="flex flex-col w-72 min-h-full gap-1">
            {songs?.map((song) => {
              const meta = songsMetadata[song];
              return (
                <div
                  key={song}
                  className="flex items-center gap-1 group"
                // Reset confirming state if user clicks outside the song item
                // Clever workaround exploiting onBlur
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setConfirming(null);
                    }
                  }}
                >
                  <Button
                    variant={selectedSong === song ? 'default' : 'ghost'}
                    className="px-2 py-1 h-min flex-1 justify-start overflow-hidden"
                    onClick={() => { if (selectedSong !== song) setConfirming(song); }}
                    title={song}
                  >
                    <span className="truncate">
                      {meta ? `${meta.artist} - ${meta.title}` : song}
                    </span>
                  </Button>

                  {/* Confirmation Button (appears when the song item is clicked) */}
                  {confirming === song && (
                  <Button
                    variant="secondary"
                    className="shrink-0 w-8 h-6 animate-in fade-in zoom-in duration-200"
                    onClick={() => {
                      setSelectedSong(song);
                      setSelectedTrackId(null);
                      setConfirming(null);
                    }}
                  >
                    <ChevronRight size={12} />
                  </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
    </Panel>
  );
}

export default LibraryPanel;
