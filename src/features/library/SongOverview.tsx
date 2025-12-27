import { useLibraryStore } from "@/store/useLibraryStore";
import { Button } from "@/components/ui/button";
import { Info, Music, Calendar, User } from "lucide-react";

const MetaItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <p className="text-[9px]">{label}</p>
    <p className="font-mono">{value}</p>
  </div>
);

const SongOverview = () => {
  const selectedSong = useLibraryStore((state) => state.selectedSong);

  return (
    <section className="h-min border-b flex flex-col p-4 gap-4 bg-card/30">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="p-2">Song Overview</h2>
        <Button variant="ghost" size="icon">
          <Info />
        </Button>
      </div>

      {selectedSong ? (
        <div className="flex flex-col gap-4 p-2">
          <div className="flex flex-col gap-1">
            <p className="text-[15px] truncate">
              {selectedSong}
            </p>
            <p className="text-p-muted flex items-center gap-1">
              <User size={12} /> Artist Name
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-3 gap-y-3">
            <MetaItem label="Format" value={"." + selectedSong.split('.').pop()?.toUpperCase() || "GP"} />
            <MetaItem label="Key" value="C Major" />
            <MetaItem label="Tempo" value="120 BPM" />
            <MetaItem label="Bars" value="666" />
            <MetaItem label="Length" value="3:10" />
            <MetaItem label="Difficulty" value="?" />
          </div>

          <p className="text-p-muted flex items-center gap-1">
            <Calendar size={12} /> Revision: 2024-05-12
          </p>
        </div>
      ) : (
        <p className="text-p-muted">No song selected</p>
      )}
    </section>
  );
};

export default SongOverview;