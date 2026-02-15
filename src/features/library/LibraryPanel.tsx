import { useEffect, useState, useCallback } from 'react';
import { ChevronRight, FolderOpen, ListRestart } from 'lucide-react';
import useLibraryStore from '@/store/useLibraryStore';

import { Button } from '@/components/ui/button';
import Panel from '@/components/ui/Panel';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

function LibraryPanel() {
  const {
    songsMetadata, selectedSong, setSelectedSong, setSelectedTrackId,
  } = useLibraryStore();
  const [songs, setSongs] = useState<string[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);

  const fetchSongs = useCallback(async () => {
    const fileList = await window.electron.getSongs();
    setSongs(fileList);
  }, []);

  const handleOpenFolder = useCallback(async () => {
    const pendingSong = await window.electron.openSongsFolder();
    if (!pendingSong) return;

    await fetchSongs();
    setSelectedSong(pendingSong);
    setSelectedTrackId(null);
    setConfirming(null);
  }, [fetchSongs, setSelectedSong, setSelectedTrackId]);

  const handleRefresh = useCallback(() => fetchSongs(), [fetchSongs]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  return (
    <Panel
      className="flex flex-col overflow-hidden border-b"
      contentClassName="flex-1 overflow-hidden"
      isCollapsible
      title="Library"
      actions={[
        {
          title: 'Import Song File',
          icon: <FolderOpen />,
          onClick: handleOpenFolder,
        },
        {
          title: 'Refresh Song List',
          icon: <ListRestart />,
          onClick: handleRefresh,
        },
      ]}
    >
      {/* TODO: Search/filter functionality */}

      {/* Song Catalog */}
      {songs.length === 0 ? 
        <p className="p-2 text-muted-foreground">No songs found. Click the "
          <FolderOpen className="inline-flex" size={12} />" button above to add a Guitar Pro file from disk.
        </p> : 
        <ScrollArea className="h-full">
          <div className="flex flex-col w-68 min-h-full">
            {songs.map((song) => {
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
                    className="px-2 flex-1 justify-start overflow-hidden truncate"
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
                      size="icon"
                      variant="secondary"
                      className="shrink-0 animate-in fade-in zoom-in duration-200"
                      onClick={() => {
                        setSelectedSong(song);
                        setSelectedTrackId(null);
                        setConfirming(null);
                      }}
                    >
                      <ChevronRight size={16} />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>
      }
      
    </Panel>
  );
}

export default LibraryPanel;
