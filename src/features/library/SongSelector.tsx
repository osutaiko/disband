import { useEffect, useState } from "react";
import { useLibraryStore } from "@/store/useLibraryStore";

import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ChevronRight, FolderOpen, RotateCw } from "lucide-react";

const SongSelector = () => {
  const [songs, setSongs] = useState<string[]>([]);
  const [confirming, setConfirming] = useState<string | null>(null);

  const selectedSong = useLibraryStore((state) => state.selectedSong);
  const setSelectedSong = useLibraryStore((state) => state.setSelectedSong);

  const fetchSongs = async () => {
    const fileList = await window.electron.getSongs();
    setSongs(fileList);
  };

  const handleOpenFolder = () => window.electron.openSongsFolder();
  const handleRefresh = () => fetchSongs();

  useEffect(() => {
    handleRefresh();
  }, []);

  return (
    <section className="flex flex-col h-full overflow-hidden p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="p-2">Song Selector</h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={handleOpenFolder} title="Open Songs Folder">
            <FolderOpen />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleRefresh} title="Refresh Song List from Disk">
            <RotateCw />
          </Button>
        </div>
      </div>

      {/* TODO: Search/filter functionality */}

      {/* Song Catalog */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col w-68 min-h-full">
          {songs.map((song) => (
            <div key={song} className="flex items-center gap-1 group"
              // Reset confirming state if user clicks outside the song item
              // Clever workaround exploiting onBlur
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setConfirming(null);
                }
              }}
            >
              <Button
                variant={selectedSong === song ? "default" : "ghost"}
                className="px-2 flex-1 justify-start overflow-hidden"
                onClick={() => {if (selectedSong !== song) setConfirming(song)}}
                title={song}
              >
                <span className="text-[11px] truncate">{song}</span>
              </Button>

              {/* Confirmation Button (appears when the song item is clicked) */}
              {confirming === song && (
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="shrink-0 animate-in fade-in zoom-in duration-200"
                  onClick={() => {
                    setSelectedSong(song);
                    setConfirming(null);
                  }}
                >
                  <ChevronRight size={16} />
                </Button>
              )}
            </div>
          ))}
        </div>
        <ScrollBar
  orientation="vertical"
/>
      </ScrollArea>
    </section>
  );
};

export default SongSelector;