import { useEffect, useState } from 'react';

import {
  RotateCcw, View, MicVocal, Guitar, Drum, Piano, Music,
} from 'lucide-react';
import useLibraryStore from '@/store/useLibraryStore';
import useEngineStore from '@/store/useEngineStore';
import useSessionStore from '@/store/useSessionStore';

import Panel from '@/components/ui/Panel';
import { Button } from '@/components/ui/button';
import VolumeDbSlider, { MIN_DB } from './VolumeDbSlider';

type TrackLayer = 'original' | 'recorded';

function dbToGain(db: number): number {
  if (!Number.isFinite(db) || db <= MIN_DB) return 0;
  return 10 ** (db / 20);
}

function TrackMenuPanel() {
  const {
    tracks, selectedSong, selectedTrackId, setSelectedTrackId,
  } = useLibraryStore();
  const { api } = useEngineStore();
  const { recordedPaths } = useSessionStore();
  const [mutedTracks, setMutedTracks] = useState<string[]>([]);
  const [soloTracks, setSoloTracks] = useState<string[]>([]);
  const [originalVolumes, setOriginalVolumes] = useState<Record<string, number>>({});
  const [recordedVolumes, setRecordedVolumes] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!selectedSong) return;
    setMutedTracks([]);
    setSoloTracks([]);
    setOriginalVolumes({});
    setRecordedVolumes({});

    if (!api || !tracks) return;
    api.changeTrackVolume(tracks as any, 1.0);
    api.changeTrackMute(tracks as any, false);
    api.changeTrackSolo(tracks as any, false);
  }, [selectedSong, api, tracks]);

  const handleReset = () => {
    if (!api || !tracks) return;

    // Reset track volumes
    // FIXME: get track volume from API
    api.changeTrackVolume(tracks as any, 1.0);
    api.changeTrackMute(tracks as any, false);
    api.changeTrackSolo(tracks as any, false);

    setMutedTracks([]);
    setSoloTracks([]);
    setOriginalVolumes({});
    setRecordedVolumes({});
  };

  const handleVolumeChange = (track: any, db: number) => {
    if (!api) return;
    const selectionId = getTrackSelectionId(track);
    setOriginalVolumes((prev) => ({
      ...prev,
      [selectionId]: db,
    }));
    api.changeTrackVolume([track], dbToGain(db));
  };

  const getTrackSelectionId = (track: any) => `${selectedSong ?? 'no-song'}::${track.index}`;
  const getLayerSelectionId = (track: any, layer: TrackLayer) => `${getTrackSelectionId(track)}::${layer}`;

  const handleMuteToggle = (track: any, layer: TrackLayer = 'original') => {
    const layerSelectionId = getLayerSelectionId(track, layer);
    const isMuted = mutedTracks.includes(layerSelectionId);

    if (layer === 'original') {
      if (!api) return;
      api.changeTrackMute([track], !isMuted);
    }

    setMutedTracks((prev) => (
      isMuted ? prev.filter((id) => id !== layerSelectionId) : [...prev, layerSelectionId]
    ));
  };

  const handleSoloToggle = (track: any, layer: TrackLayer = 'original') => {
    const layerSelectionId = getLayerSelectionId(track, layer);
    const isCurrentlySoloed = soloTracks.includes(layerSelectionId);
    const isCurrentlyMuted = mutedTracks.includes(layerSelectionId);

    if (isCurrentlySoloed) {
      if (layer === 'original') {
        if (!api) return;
        api.changeTrackSolo([track], false);
      }

      setSoloTracks([]);
      return;
    }

    if (isCurrentlyMuted) {
      if (layer === 'original') {
        if (!api) return;
        api.changeTrackMute([track], false);
      }
      setMutedTracks((prev) => prev.filter((id) => id !== layerSelectionId));
    }

    if (layer === 'original') {
      if (!api) return;
      if (tracks) {
        api.changeTrackSolo(tracks as any, false);
      }
      api.changeTrackSolo([track], true);
    }

    setSoloTracks([layerSelectionId]);
  };

  const handleRecordedVolumeChange = (track: any, db: number) => {
    const selectionId = getTrackSelectionId(track);
    setRecordedVolumes((prev) => ({
      ...prev,
      [selectionId]: db,
    }));
  };

  const handleRecordedMuteToggle = (track: any) => {
    handleMuteToggle(track, 'recorded');
  };

  const handleRecordedSoloToggle = (track: any) => {
    handleSoloToggle(track, 'recorded');
  };

  const getInstrumentIcon = (track: any) => {
    const name = track.name?.toLowerCase() ?? '';

    if (name.includes('vocal')) return <MicVocal size={14} />;
    if (name.includes('bass')) return <Guitar size={14} />;
    if (name.includes('guitar')) return <Guitar size={14} />;
    if (name.includes('drum')) return <Drum size={14} />;
    if (name.includes('piano') || name.includes('keys')) { return <Piano size={14} />; }

    return <Music size={14} />;
  };

  const renderTrackRow = (track: any) => {
    const isSelected = selectedTrackId === track.index;
    const trackSelectionId = getTrackSelectionId(track);
    const originalLayerSelectionId = getLayerSelectionId(track, 'original');
    const recordedLayerSelectionId = getLayerSelectionId(track, 'recorded');
    const isMuted = mutedTracks.includes(originalLayerSelectionId);
    const isSoloed = soloTracks.includes(originalLayerSelectionId);
    const hasRecording = Boolean(recordedPaths[trackSelectionId]);
    const isRecordedMuted = mutedTracks.includes(recordedLayerSelectionId);
    const isRecordedSoloed = soloTracks.includes(recordedLayerSelectionId);
    const originalTrackVolumeDb = originalVolumes[trackSelectionId] ?? 0;
    const recordedTrackVolumeDb = recordedVolumes[trackSelectionId] ?? 0;

    return (
      <div key={trackSelectionId} className="relative grid w-full gap-1 p-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0">{getInstrumentIcon(track)}</span>
            <span title={track.name} className={`block min-w-0 truncate text-sm ${isSelected ? 'font-bold' : ''}`}>{track.name}</span>
          </div>
          <Button
            title={isSelected ? 'Currently Displayed' : 'Show Track Score'}
            size="icon"
            variant={`${isSelected ? 'default' : 'secondary'}`}
            className="w-6 h-6 flex-0 aspect-square"
            onClick={() => setSelectedTrackId(track.index)}
          >
            <View />
          </Button>
        </div>
        <div className="grid gap-1">
          <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
            <span title="Original Track Volume" className="text-sm text-end text-muted-foreground">Original</span>
              <div className="flex flex-row gap-1 items-center">
              <VolumeDbSlider
                db={originalTrackVolumeDb}
                disabled={isMuted}
                onDbChange={(db) => handleVolumeChange(track, db)}
              />
              <Button
                title={isMuted ? 'Unmute Track' : 'Mute Track'}
                size="icon"
                variant={isMuted ? 'destructive' : 'secondary'}
                className={`w-6 h-6 flex-0 aspect-square`}
                onClick={() => handleMuteToggle(track, 'original')}
              >
                M
              </Button>
              <Button
                title={isSoloed ? 'Unsolo Track' : 'Solo Track'}
                size="icon"
                variant={isSoloed ? 'destructive' : 'secondary'}
                className={`w-6 h-6 flex-0 aspect-square`}
                onClick={() => handleSoloToggle(track, 'original')}
              >
                S
              </Button>
            </div>
          </div>
          {hasRecording
          && (
          <>
            <div className="absolute top-0 bottom-0 left-0 w-0.5 h-full bg-note-ok" />
            <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
              <span title="Recorded Track Volume" className="text-sm text-end text-note-ok">Recorded</span>
              <div className="flex flex-row gap-1 items-center">
                <VolumeDbSlider
                  db={recordedTrackVolumeDb}
                  disabled={isRecordedMuted}
                  onDbChange={(db) => handleRecordedVolumeChange(track, db)}
                />
                <Button
                  title={isRecordedMuted ? 'Unmute Recorded' : 'Mute Recorded'}
                  size="icon"
                  variant={isRecordedMuted ? 'destructive' : 'secondary'}
                  className={`w-6 h-6 flex-0 aspect-square`}
                  onClick={() => handleRecordedMuteToggle(track)}
                >
                  M
                </Button>
                <Button
                  title={isRecordedSoloed ? 'Unsolo Recorded' : 'Solo Recorded'}
                  size="icon"
                  variant={isRecordedSoloed ? 'destructive' : 'secondary'}
                  className={`w-6 h-6 flex-0 aspect-square`}
                  onClick={() => handleRecordedSoloToggle(track)}
                >
                  S
                </Button>
              </div>
            </div>
          </>
          )}
        </div>
      </div>
    );
  };

  const selectedTrack = tracks?.find((track) => track.index === selectedTrackId) ?? null;
  const allTracks = tracks ?? [];

  return (
    <Panel
      className="flex flex-col overflow-hidden"
      contentClassName="flex-1 overflow-hidden"
      isCollapsible
      isScrollable
      title="Tracks"
      actions={[
        { title: 'Reset Track Settings', icon: <RotateCcw />, onClick: handleReset },
      ]}
    >
      {!tracks || tracks.length === 0
        ? <p className="p-2 text-muted-foreground">No tracks found.</p>
        : (
          <div className="grid w-72 min-h-full gap-4">
            {selectedTrack && (
            <div key={`selected-${selectedTrack.index}`} className="relative flex flex-row w-full gap-2 p-3 bg-muted border rounded-md">
              <span className="shrink-0">{getInstrumentIcon(selectedTrack)}</span>
              <span className="block min-w-0 text-sm font-bold first-line:leading-none">{selectedTrack.name}</span>
            </div>
            )}
            {allTracks.length > 0 && (
            <div className="border divide-y rounded-md overflow-hidden">
              {allTracks.map((track) => renderTrackRow(track))}
            </div>
            )}
          </div>
        )}
    </Panel>
  );
}

export default TrackMenuPanel;
