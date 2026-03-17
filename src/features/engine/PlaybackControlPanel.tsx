import { useEffect } from 'react';
import {
  ChevronFirst,
  Play,
  Pause,
  ChevronLast,
  Metronome,
  CircleGauge,
  Repeat,
  ClockArrowDown,
} from 'lucide-react';
import { handlePlayPause, handleGotoStart, handleGotoEnd } from './playback';
import useEngineStore from '@/store/useEngineStore';

import Panel from '@/components/ui/Panel';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';

function PlaybackControlPanel() {
  const {
    api, isPlaying, currentMs, endMs, currentBar, endBar, metronomeEnabled, setMetronomeEnabled,
  } = useEngineStore();

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

  return (
    <Panel className="border-b">
      {/* Playback Buttons */}
      <div className="flex flex-row gap-1 justify-center p-2">
        <Button title="Go to Start" variant="outline" size="icon" onClick={() => handleGotoStart(api)} className="rounded-full">
          <ChevronFirst />
        </Button>
        <Button title={isPlaying ? 'Pause' : 'Play'} size="lg" onClick={() => handlePlayPause(api)} className="rounded-full">
          {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}
        </Button>
        <Button title="Go to End" variant="outline" size="icon" onClick={() => handleGotoEnd(api, endMs)} className="rounded-full">
          <ChevronLast />
        </Button>
      </div>

      {/* Time/Bar Display */}
      <div className="flex flex-row gap-1 font-mono p-2">
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
      <div className="flex flex-row gap-1 w-full justify-center">
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
        <Toggle
          title="Speed"
          variant="outline"
        >
          <CircleGauge />
        </Toggle>
      </div>
    </Panel>
  );
}

export default PlaybackControlPanel;
