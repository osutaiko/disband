import { useLibraryStore } from "@/store/useLibraryStore";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import PanelHeader from "@/components/ui/PanelHeader";

import { RotateCw, View, Volume2, VolumeX } from "lucide-react";
import { useState } from "react";

const TrackMenu = () => {
  const { api, tracks, selectedTrackId, setSelectedTrackId } = useLibraryStore();
  const [mutedTracks, setMutedTracks] = useState<number[]>([]);
  const [soloTracks, setSoloTracks] = useState<number[]>([]);

  const handleReset = () => {
    if (!api || !tracks) return;

    // Reset track volumes
    tracks.forEach((track) => {
      api.changeTrackVolume([track], track.playbackInfo?.volume ?? 1.0);
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
    setMutedTracks(prev => 
      isMuted ? prev.filter(id => id !== track.index) : [...prev, track.index]
    );
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
        setMutedTracks(prev => prev.filter(id => id !== track.index));
      }

      // Exclusive solo
      api.changeTrackSolo([track], true);
      setSoloTracks([track.index]);
    }
  };

  return (
    <section className="h-1/2 border-b flex flex-col p-4 gap-4">
      {/* Header */}
      <PanelHeader title="Tracks"
        buttons={[
          { title: "Reset Track Settings", icon: <RotateCw />, onClick: handleReset }
        ]}
      />

      <ScrollArea className="flex-1">
        <div className="flex flex-col w-64 gap-1 min-h-full">
          {tracks?.map((track) => {
            const isSelected = selectedTrackId === track.index;
            const isMuted = mutedTracks.includes(track.index);
            const isSoloed = soloTracks.includes(track.index);
            const trackVol = track.playbackInfo?.volume ?? 1;

            return (
              <div key={track.index} className="flex items-center gap-1 group w-68">
                <Card
                  className="w-full rounded-sm shadow-none"
                >
                  <CardHeader className="px-3 pt-2 pb-1 flex flex-row items-center justify-between gap-2">
                    <CardTitle title={track.name} className={`text-[11px] truncate ${isSelected ? "font-bold" : ""}`}>{track.name}</CardTitle>
                    <Button
                      title={isSelected ? "Currently Displayed" : "Show Track Score"}
                      size="icon" 
                      variant={`${isSelected ? "default" : "secondary"}`}
                      className={`w-6 h-6 flex-0 aspect-square`}
                      onClick={() => setSelectedTrackId(track.index)}
                    >
                      <View />
                    </Button>
                  </CardHeader>
                  <CardContent className="px-3 pt-0 pb-2 flex flex-row gap-4 items-center">
                    <div 
                      title="Track Volume"
                      className="flex flex-row w-full gap-2 items-center"
                    >
                      {isMuted ? 
                        <VolumeX size={16} className="text-muted-foreground" /> :
                        <Volume2 size={16} />
                      }
                      <Slider 
                        defaultValue={[trackVol * 100]} 
                        max={100} 
                        step={1} 
                        disabled={isMuted}
                        onValueChange={(vals) => handleVolumeChange(track, vals)}
                      />
                    </div>
                    <div className="flex flex-row gap-1">
                      <Button
                        title={isMuted ? "Unmute Track" : "Mute Track"}
                        size="icon"
                        variant={isMuted ? "destructive" : "secondary"}
                        className={`w-6 h-6 flex-0 aspect-square ${isMuted ? "text-white" : "text-black"} text-xs`}
                        onClick={() => handleMuteToggle(track)}
                      >
                        M
                      </Button>
                      <Button
                        title={isSoloed ? "Unsolo Track" : "Solo Track"}
                        size="icon"
                        variant={isSoloed ? "destructive" : "secondary"}
                        className={`w-6 h-6 flex-0 aspect-square ${isSoloed ? "text-white" : "text-black"} text-xs`}
                        onClick={() => handleSoloToggle(track)}
                      >
                        S
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </section>
  );
};

export default TrackMenu;
