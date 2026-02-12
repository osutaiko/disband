import { Calendar, User } from 'lucide-react';
import useLibraryStore from '@/store/useLibraryStore';
import Panel from '@/components/ui/Panel';

function MetaItem({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p>{label}</p>
      <p className="font-mono">{value || 'N/A'}</p>
    </div>
  );
}

function SongOverviewPanel() {
  const { songsMetadata, selectedSong } = useLibraryStore();

  return (
    <Panel className="h-min border-b">
      {selectedSong ? (
        <div className="flex flex-col gap-4 p-2">
          <div className="flex flex-col gap-1">
            <h3 className="truncate">
              {songsMetadata[selectedSong]?.title}
            </h3>
            <p className="text-muted-foreground flex items-center gap-1">
              <User size={12} />
              {' '}
              {songsMetadata[selectedSong]?.artist}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-y-3">
            <MetaItem label="Format" value={`.${selectedSong.split('.').pop()?.toUpperCase()}` || 'GP'} />
            <MetaItem label="Tempo" value={songsMetadata[selectedSong]?.tempo} />
          </div>

          <p className="text-muted-foreground flex items-center gap-1">
            <Calendar size={12} />
            {' '}
            Revision: 2024-05-12
          </p>
        </div>
      ) : (
        <h3 className="p-2 text-muted-foreground">No song selected</h3>
      )}
    </Panel>
  );
}

export default SongOverviewPanel;
