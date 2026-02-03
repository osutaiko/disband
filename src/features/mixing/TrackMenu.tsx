import { useLibraryStore } from "@/store/useLibraryStore";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const TrackMenu = () => {
  const { tracks, selectedTrackId, setSelectedTrackId } = useLibraryStore();

  return (
    <section className="h-1/2 border-b flex flex-col p-6 gap-4">
      <h2>Tracks</h2>
      <ScrollArea className="flex-1">
        <div className="flex flex-col w-64 gap-1 min-h-full">
          {tracks?.map((track) => {
            return (
              <div key={track.index} className="flex items-center gap-1 group">
                <Button
                  variant={selectedTrackId === track.index ? "default" : "outline"}
                  className="px-2 flex-1 justify-start overflow-hidden"
                  onClick={() => {setSelectedTrackId(track.index)}}
                  title={track.name}
                  asChild
                >
                  <span className="text-[11px] truncate">{track.name}</span>
                </Button>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      
      
    </section>
  );
};

export default TrackMenu;
