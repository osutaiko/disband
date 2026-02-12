import { useState } from 'react';

import useLibraryStore from '@/store/useLibraryStore';

import Panel from '@/components/ui/Panel';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function OptionsPanel() {
  const { pxPerMs, setPxPerMs } = useLibraryStore();

  const [judgmentHarshness, setJudgmentHarshness] = useState(6);
  const [judgeByMode, setJudgeByMode] = useState('reference-notes');
  const [soundfontPreset, setSoundfontPreset] = useState('sonivox');

  return (
    <Panel title="Options" className="h-fit border-b" isCollapsible>
      <div className="flex flex-col gap-1 p-2">
        <div className="flex flex-row items-center justify-between gap-4 mb-4">
          <div className="w-full flex flex-col gap-2">
            <div className="flex flex-row items-center justify-between gap-4">
              <Label htmlFor="judgment-harshness">Judgment Harshness</Label>
              <span className="text-sm text-muted-foreground">{judgmentHarshness}</span>
            </div>
            <Slider
              id="judgment-harshness"
              value={[judgmentHarshness]}
              max={10}
              step={1}
              onValueChange={(vals) => setJudgmentHarshness(vals[0] ?? judgmentHarshness)}
            />
          </div>
        </div>

        <div className="flex flex-row items-center justify-between gap-4 mb-2">
          <div className="w-full flex flex-col gap-2">
            <div className="flex flex-row items-center justify-between gap-4">
              <Label htmlFor="scroll-speed">Scroll Speed</Label>
              <span className="text-sm text-muted-foreground">
                {pxPerMs.toFixed(2)}
                {' '}
                px/ms
              </span>
            </div>
            <Slider
              id="scroll-speed"
              value={[pxPerMs]}
              min={0.05}
              max={2.0}
              step={0.05}
              onValueChange={(vals) => setPxPerMs(vals[0] ?? pxPerMs)}
            />
          </div>
        </div>

        <div className="flex flex-row items-center justify-between gap-4">
          <Label htmlFor="judge-by-mode" className="shrink-0">Judge By</Label>
          <Select value={judgeByMode} onValueChange={setJudgeByMode}>
            <SelectTrigger id="judge-by-mode" className="w-[150px]">
              <SelectValue placeholder="..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reference-notes">Reference</SelectItem>
              <SelectItem value="played-notes">Played</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-row items-center justify-between gap-4">
          <Label htmlFor="soundfont-preset" className="shrink-0">Soundfont</Label>
          <Select value={soundfontPreset} onValueChange={setSoundfontPreset}>
            <SelectTrigger id="soundfont-preset" className="w-[150px]">
              <SelectValue placeholder="..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sonivox">Sonivox</SelectItem>
              <SelectItem value="fluidr3">FluidR3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Panel>
  );
}

export default OptionsPanel;
