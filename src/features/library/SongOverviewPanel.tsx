import { useLibraryStore } from "@/store/useLibraryStore";
import PanelHeader from "@/components/ui/PanelHeader";

import { Calendar, User } from "lucide-react";

const MetaItem = ({ label, value }: { label: string; value: any }) => (
  <div className="flex flex-col gap-0.5">
    <p className="text-[9px]">{label}</p>
    <p className="font-mono">{value || "N/A"}</p>
  </div>
);

const SongOverviewPanel = () => {
  const { songsMetadata, selectedSong } = useLibraryStore();

  return (
    <section className="h-min border-b flex flex-col p-4 gap-4">
      {/* Header */}
      <PanelHeader
        title="Song Overview"
      />

      {selectedSong ? (
        <div className="flex flex-col gap-4 p-2">
          <div className="flex flex-col gap-1">
            <p className="text-[15px] truncate">
              {songsMetadata[selectedSong]?.title}
            </p>
            <p className="text-grayed flex items-center gap-1">
              <User size={12} /> {songsMetadata[selectedSong]?.artist}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-y-3">
            <MetaItem label="Format" value={"." + selectedSong.split('.').pop()?.toUpperCase() || "GP"} />
            <MetaItem label="Tempo" value={songsMetadata[selectedSong]?.tempo} />
          </div>

          <p className="text-grayed flex items-center gap-1">
            <Calendar size={12} /> Revision: 2024-05-12
          </p>
        </div>
      ) : (
        <p className="p-2 text-grayed">No song selected</p>
      )}
    </section>
  );
};

export default SongOverviewPanel;
