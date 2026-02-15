import {
  RotateCcw, View, Volume2, VolumeX, MicVocal, Guitar, Drum, Piano, Music,
} from 'lucide-react';
import { useState } from 'react';
import useLibraryStore from '@/store/useLibraryStore';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import Panel from '@/components/ui/Panel';

function TrackMenuPanel() {
  const {
    api,
    tracks,
    selectedSong,
    selectedTrackId,
    setSelectedTrackId,
    recordedPaths,
  } = useLibraryStore();
  const [mutedTracks, setMutedTracks] = useState<number[]>([]);
  const [soloTracks, setSoloTracks] = useState<number[]>([]);

  const handleReset = () => {
    if (!api || !tracks) return;

    // Reset track volumes
    tracks.forEach((track) => {
      // FIXME: get track volume from API
      api.changeTrackVolume([track], 1.0);
      api.changeTrackMute([track], false);
      api.changeTrackSolo([track], false);
    });

    setMutedTracks([]);
    setSoloTracks([]);
  };

  const handleVolumeChange = (track: any, values: number[]) => {
    if (!api) return;
    api.changeTrackVolume([track], values[0] / 100);
  };

  const handleMuteToggle = (track: any) => {
    if (!api) return;
    const isMuted = mutedTracks.includes(track.index);
    api.changeTrackMute([track], !isMuted);
    setMutedTracks((prev) => (
      isMuted ? prev.filter((id) => id !== track.index) : [...prev, track.index]
    ));
  };

  const handleSoloToggle = (track: any) => {
    if (!api) return;
    const isCurrentlySoloed = soloTracks.includes(track.index);

    if (isCurrentlySoloed) {
      api.changeTrackSolo([track], false);
      setSoloTracks([]);
    } else {
      // Unmute track
      if (mutedTracks.includes(track.index)) {
        api.changeTrackMute([track], false);
        setMutedTracks((prev) => prev.filter((id) => id !== track.index));
      }

      // Exclusive solo
      api.changeTrackSolo([track], true);
      setSoloTracks([track.index]);
    }
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

  return (
    <Panel
      className="flex flex-col overflow-hidden border-b"
      contentClassName="flex-1 overflow-hidden"
      isCollapsible
      title="Tracks"
      actions={[
        { title: 'Reset Track Settings', icon: <RotateCcw />, onClick: handleReset },
      ]}
    >
      {!tracks || tracks.length === 0 ? 
        <p className="p-2 text-muted-foreground">No tracks found.</p> : 
        <ScrollArea className="h-full">
          <div className="flex flex-col w-64 gap-1 min-h-full">
            {tracks?.map((track) => {
              const isSelected = selectedTrackId === track.index;
              const isMuted = mutedTracks.includes(track.index);
              const isSoloed = soloTracks.includes(track.index);
              const trackSelectionId = `${selectedSong ?? 'no-song'}::${track.index}`;
              const hasRecording = Boolean(recordedPaths[trackSelectionId]);
              // FIXME: me too
              const trackVol = 1;

              return (
                <div key={track.index} className="flex flex-col items-start gap-1 group w-68">
                  <Card className="w-full flex flex-col gap-1 px-2 py-2 rounded-sm shadow-none">
                    <div className="h-full flex flex-row items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span>{getInstrumentIcon(track)}</span>
                        <span title={track.name} className={`text-sm truncate ${isSelected ? 'font-bold' : ''}`}>{track.name}</span>
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
                    <div className="flex flex-row gap-4 items-center">
                      <div
                        title="Original Track Volume"
                        className="flex flex-row w-full gap-2 items-center"
                      >
                        {isMuted
                          ? <VolumeX size={14} className="text-muted-foreground shrink-0" />
                          : <Volume2 size={14} className="shrink-0" />}
                        <span className="text-sm">Original</span>
                      </div>
                      <div className="flex flex-row gap-1">
                        <Slider
                          className="w-[100px] mr-3"
                          defaultValue={[trackVol * 100]}
                          max={100}
                          step={1}
                          disabled={isMuted}
                          onValueChange={(vals) => handleVolumeChange(track, vals)}
                        />
                        <Button
                          title={isMuted ? 'Unmute Track' : 'Mute Track'}
                          size="icon"
                          variant={isMuted ? 'destructive' : 'secondary'}
                          className={`w-6 h-6 flex-0 aspect-square ${isMuted ? 'text-white' : 'text-black'}`}
                          onClick={() => handleMuteToggle(track)}
                        >
                          M
                        </Button>
                        <Button
                          title={isSoloed ? 'Unsolo Track' : 'Solo Track'}
                          size="icon"
                          variant={isSoloed ? 'destructive' : 'secondary'}
                          className={`w-6 h-6 flex-0 aspect-square ${isSoloed ? 'text-white' : 'text-black'}`}
                          onClick={() => handleSoloToggle(track)}
                        >
                          S
                        </Button>
                      </div>
                    </div>
                    {hasRecording && 
                      <div className="flex flex-row gap-4 items-center">
                        <div
                          title="Recorded Track Volume"
                          className="flex flex-row w-full gap-2 items-center"
                        >
                          {isMuted
                            ? <VolumeX size={14} className="text-muted-foreground shrink-0" />
                            : <Volume2 size={14} className="shrink-0" />}
                          <span className="text-sm">Recorded</span>
                        </div>
                        <div className="flex flex-row gap-1">
                          <Slider
                            className="w-[100px] mr-3"
                            defaultValue={[100]}
                            max={100}
                            step={1}
                          />
                          <Button
                            title={isMuted ? 'Unmute Track' : 'Mute Track'}
                            size="icon"
                            variant={isMuted ? 'destructive' : 'secondary'}
                            className={`w-6 h-6 flex-0 aspect-square`}
                          >
                          </Button>
                          <Button
                            title={isSoloed ? 'Unsolo Track' : 'Solo Track'}
                            size="icon"
                            variant={isSoloed ? 'destructive' : 'secondary'}
                            className={`w-6 h-6 flex-0 aspect-square`}
                          >
                          </Button>
                        </div>
                      </div>
                    }
                  </Card>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      } 
    </Panel>
  );
}

export default TrackMenuPanel;
