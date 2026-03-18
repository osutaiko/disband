import { useEffect, useState } from 'react';
import {
  ChevronFirst,
  Play,
  Pause,
  ChevronLast,
  Metronome,
  CircleGauge,
  Rabbit,
  Turtle,
  Repeat,
  ClockArrowDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { handlePlayPause, handleGotoStart, handleGotoEnd, handleSpeedChange } from './playback';
import useEngineStore from '@/store/useEngineStore';

import Panel from '@/components/ui/Panel';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Input } from '@/components/ui/input';

function PlaybackControlPanel() {
  const {
    api, isPlaying, currentMs, endMs, currentBar, endBar, metronomeEnabled, setMetronomeEnabled, playbackSpeed,
  } = useEngineStore();
  const [draftSpeedPercent, setDraftSpeedPercent] = useState<string>(String(Math.round(playbackSpeed * 100)));

  const parseMs = (ms: number) => ({
    minutes: Math.floor(ms / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
    milliseconds: Math.floor(ms % 1000),
  });

  const current = parseMs(currentMs);
  const end = parseMs(endMs);

  useEffect(() => {
    if (!api) return;
    api.metronomeVolume = metronomeEnabled ? 1 : 0;
  }, [api, metronomeEnabled]);

  useEffect(() => {
    if (!api) return;
    api.playbackSpeed = playbackSpeed;
  }, [api, playbackSpeed]);

  useEffect(() => {
    setDraftSpeedPercent(String(Math.round(playbackSpeed * 100)));
  }, [playbackSpeed]);

  const commitSpeedPercent = () => {
    const parsed = Number(draftSpeedPercent);
    const fallback = Math.round(playbackSpeed * 100);
    const nextPercent = Number.isFinite(parsed)
      ? Math.min(400, Math.max(20, parsed))
      : fallback;
    handleSpeedChange(api, nextPercent);
    setDraftSpeedPercent(String(Math.round(nextPercent)));
  };

  return (
    <Panel className="border-b">
      {/* Playback Buttons */}
      <div className="flex flex-row gap-1 justify-center items-center mb-4">
        <Button title="Go to Start" variant="outline" size="icon" onClick={() => handleGotoStart(api)} className="rounded-full">
          <ChevronFirst />
        </Button>
        <Button title="Previous Bar" variant="outline" size="icon" onClick={() => handleGotoEnd(api, endMs)} className="rounded-full">
          <ChevronLeft />
        </Button>
        <Button title={isPlaying ? 'Pause' : 'Play'} size="lg" onClick={() => handlePlayPause(api)} className="rounded-full">
          {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}
        </Button>
        <Button title="Next Bar" variant="outline" size="icon" onClick={() => handleGotoEnd(api, endMs)} className="rounded-full">
          <ChevronRight />
        </Button>
        <Button title="Go to End" variant="outline" size="icon" onClick={() => handleGotoEnd(api, endMs)} className="rounded-full">
          <ChevronLast />
        </Button>
      </div>

      {/* Time/Bar Display */}
      <div className="flex flex-row gap-1 font-mono mb-2">
        <div title="Time" className="flex flex-row w-2/3 justify-center items-center gap-1 bg-muted rounded-md p-2">
          <p>
            {current.minutes}
            :
            {current.seconds.toString().padStart(2, '0')}
            <span className="text-muted-foreground text-xs">
              .
              {current.milliseconds.toString().padStart(3, '0')}
            </span>
          </p>
          <p>/</p>
          <p>
            {end.minutes}
            :
            {end.seconds.toString().padStart(2, '0')}
            <span className="text-muted-foreground text-xs">
              .
              {end.milliseconds.toString().padStart(3, '0')}
            </span>
          </p>
        </div>
        <div title="Bar" className="flex flex-row w-1/3 justify-center items-center gap-1 bg-muted rounded-md p-2">
          <p>{currentBar}</p>
          <p>/</p>
          <p>{endBar}</p>
        </div>
      </div>

      { /* Practice Tools */ }
      <div className="flex flex-row gap-2 w-full justify-between items-center">
        <div className="flex flex-row gap-1 justify-center items-center">
          <Toggle
            title="Metronome"
            variant="outline"
            onClick={() => setMetronomeEnabled(!metronomeEnabled)}
          >
            <Metronome />
          </Toggle>
          <Toggle
            title="Count-in"
            variant="outline"
          >
            <ClockArrowDown />
          </Toggle>
          <Toggle
            title="Loop"
            variant="outline"
          >
            <Repeat />
          </Toggle>
        </div>
        <div
          title="Speed"
          className={`flex flex-row gap-2 items-center h-[32px] rounded-lg border px-2 ${playbackSpeed !== 1 ? 'bg-accent' : ''}`}
        >
          {playbackSpeed > 1 ? <Rabbit size={16} /> : playbackSpeed < 1 ? <Turtle size={16} /> : <CircleGauge size={16} />}
          <Input
            type="number"
            value={draftSpeedPercent}
            min={20}
            max={400}
            step={1}
            onChange={(e) => setDraftSpeedPercent(e.target.value)}
            onBlur={commitSpeedPercent}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
                return;
              }
              if (e.key === 'Escape') {
                setDraftSpeedPercent(String(Math.round(playbackSpeed * 100)));
                e.currentTarget.blur();
              }
            }}
            className="w-[65px] h-[24px] rounded-none"
          />
          <span className="text-sm">%</span>
        </div>
      </div>
    </Panel>
  );
}

export default PlaybackControlPanel;
