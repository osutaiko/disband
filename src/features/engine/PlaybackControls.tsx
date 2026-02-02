import { useLibraryStore } from "@/store/useLibraryStore";
import { Button } from "@/components/ui/button";

import { ChevronFirst, Play, Pause, ChevronLast } from "lucide-react";

const PlaybackControls = () => {
  const { api, isPlaying, setIsPlaying, currentTime, setCurrentTime, endTime } = useLibraryStore();

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60000);
    const seconds = Math.floor(time % 60000 / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  const handlePlayPause = () => {
    if (!api) return;
    if (isPlaying) {
      api.pause();
    } else {
      api.play();
    }
    setIsPlaying(!isPlaying);
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
    <section className="h-min border-b flex flex-col p-6 gap-4">
      <h2>Playback Controls</h2>

      {/* Playback Buttons */}
      <div className="flex flex-row gap-1 justify-center">
        <Button size="icon" onClick={handleGotoStart}>
          <ChevronFirst />
        </Button>
        <Button size="icon" onClick={handlePlayPause}>
          {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}
        </Button>
        <Button size="icon" onClick={handleGotoEnd}>
          <ChevronLast />
        </Button>
      </div>

      {/* Time/Bar Display */}
      <div className="grid grid-cols-2 gap-4 font-mono">
        <div className="flex flex-row justify-center gap-2">
          <p>{formatTime(currentTime)}</p>
          <p>/</p>
          <p>{formatTime(endTime)}</p>
        </div>
        {/* <div className="flex flex-row justify-center gap-2">
          <p>{formatTime(currentBar)}</p>
          <p>/</p>
          <p>{formatTime(endBar)}</p>
        </div> */}
      </div>
      
    </section>
  );
};

export default PlaybackControls;