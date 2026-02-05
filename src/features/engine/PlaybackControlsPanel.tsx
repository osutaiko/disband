import { useLibraryStore } from "@/store/useLibraryStore";
import { Button } from "@/components/ui/button";
import PanelHeader from "@/components/ui/PanelHeader";

import { ChevronFirst, Play, Pause, ChevronLast } from "lucide-react";

const PlaybackControlsPanel = () => {
  const { api, isPlaying, setIsPlaying, currentTime, setCurrentTime, endTime } = useLibraryStore();

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor(time % 60000 / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  const handlePlayPause = () => {
    if (!api) return;
    isPlaying ? api.pause() : api.play();
  };

  const handleGotoStart = () => {
    if (!api) return;
    api.pause();
    setCurrentTime(0);
  }

  const handleGotoEnd = () => {
    if (!api) return;
    api.pause();
    setCurrentTime(endTime);
  }
  
  return (
    <section className="h-min border-b flex flex-col p-4 gap-4">
      {/* Header */}
      <PanelHeader title="Playback Controls" />

      {/* Playback Buttons */}
      <div className="flex flex-row gap-1 justify-center p-2">
        <Button title="Go to Start" variant="outline" size="icon" onClick={handleGotoStart} className="rounded-full">
          <ChevronFirst />
        </Button>
        <Button title={isPlaying ? "Pause" : "Play"} size="lg" onClick={handlePlayPause} className="rounded-full">
          {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}
        </Button>
        <Button title="Go to End" variant="outline" size="icon" onClick={handleGotoEnd} className="rounded-full">
          <ChevronLast />
        </Button>
      </div>

      {/* Time/Bar Display */}
      <div className="grid grid-cols-2 gap-4 font-mono p-2">
        <div title="Time" className="flex flex-row justify-center gap-2 bg-muted rounded-md p-2">
          <p>{formatTime(currentTime)} / {formatTime(endTime)}</p>
        </div>
        <div title="Bar" className="flex flex-row justify-center gap-2 bg-muted rounded-md p-2">
          <p>Bar {0} / {100}</p>
        </div>
      </div>
    </section>
  );
};

export default PlaybackControlsPanel;
