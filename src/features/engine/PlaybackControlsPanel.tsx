import { useLibraryStore } from "@/store/useLibraryStore";
import { Button } from "@/components/ui/button";
import PanelHeader from "@/components/ui/PanelHeader";

import { ChevronFirst, Play, Pause, ChevronLast } from "lucide-react";

const PlaybackControlsPanel = () => {
  const { api, isPlaying, currentMs, endMs } = useLibraryStore();

  const parseMs = (ms: number) => {
    return {
      minutes: Math.floor(ms / 60000),
      seconds: Math.floor(ms % 60000 / 1000),
      milliseconds: Math.floor(ms % 1000),
    };
  };

  const current = parseMs(currentMs);
  const end = parseMs(endMs);

  const handlePlayPause = () => {
    if (!api) return;
    isPlaying ? api.pause() : api.play();
  };

  const handleGotoStart = () => {
    if (!api) return;
    api.pause();
    api.timePosition = 0;
  }

  const handleGotoEnd = () => {
    if (!api) return;
    api.pause();
    api.timePosition = endMs;
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
      <div className="flex flex-row gap-1 font-mono p-2">
        <div title="Time" className="flex flex-row w-2/3 justify-center items-center gap-1 bg-muted rounded-md p-2">
          <p>
            {current.minutes}:{current.seconds.toString().padStart(2, "0")}
            <span className="text-[9px] text-muted-foreground">.{current.milliseconds.toString().padStart(3, "0")}</span>
          </p>
          <p>/</p>
          <p>
            {end.minutes}:{end.seconds.toString().padStart(2, "0")}
            <span className="text-[9px] text-muted-foreground">.{end.milliseconds.toString().padStart(3, "0")}</span>
          </p>
        </div>
        <div title="Bar" className="flex flex-row w-1/3 justify-center items-center gap-1 bg-muted rounded-md p-2">
          <p>{42}</p>
          <p>/</p>
          <p>{100}</p>
        </div>
      </div>
    </section>
  );
};

export default PlaybackControlsPanel;
