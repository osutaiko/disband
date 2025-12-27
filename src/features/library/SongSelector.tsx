import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderOpen, RotateCw, Music } from "lucide-react";

const SongSelector = () => {
  const [songs, setSongs] = useState<string[]>([]);

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
          <Button variant="ghost" size="icon" onClick={handleOpenFolder}>
            <FolderOpen />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleRefresh}>
            <RotateCw />
          </Button>
        </div>
      </div>

      {/* Song Catalog */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col w-70 min-h-full">
          {songs.length > 0 ? (
            songs.map((song) => (
              <Button
                key={song}
                variant="ghost"
                className="px-2 w-full"
              >
                <div className="flex items-center w-full">
                  <span className="text-[11px] truncate">
                    {song}
                  </span>
                </div>
              </Button>
            ))
          ) : (
            <div className="flex-1 flex flex-col items-center py-20">
              <p className="text-p-muted">No songs found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </section>
  );
};

export default SongSelector;