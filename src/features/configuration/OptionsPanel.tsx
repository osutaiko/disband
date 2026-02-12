import { useState } from "react";

import PanelHeader from "@/components/ui/PanelHeader";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OptionsPanel = () => {
  const [judgmentHarshness, setJudgmentHarshness] = useState(60);
  const [scrollSpeed, setScrollSpeed] = useState(0.25);
  const [judgeByMode, setJudgeByMode] = useState("reference-notes");
  const [soundfontPreset, setSoundfontPreset] = useState("sonivox");

  return (
    <section className="h-fit flex flex-col p-4 gap-4">
      {/* Header */}
      <PanelHeader title="Options" />
      
      <div className="flex flex-col gap-4 p-2">
        <div className="flex flex-row items-center justify-between gap-4">
          <div className="w-full flex flex-col gap-3">
            <div className="flex flex-row items-center justify-between gap-4">
              <Label htmlFor="judgment-harshness">Judgment Harshness</Label>
              <span className="text-xs text-grayed">{judgmentHarshness}</span>
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

        <div className="flex flex-row items-center justify-between gap-4">
          <div className="w-full flex flex-col gap-3">
            <div className="flex flex-row items-center justify-between gap-4">
              <Label htmlFor="scroll-speed">Scroll Speed</Label>
              <span className="text-xs text-grayed">{scrollSpeed.toFixed(2)} px/ms</span>
            </div>
            <Slider
              id="scroll-speed"
              value={[scrollSpeed]}
              min={0.05}
              max={1.0}
              step={0.01}
              onValueChange={(vals) => setScrollSpeed(vals[0] ?? scrollSpeed)}
            />
          </div>
        </div>

        <div className="flex flex-row items-center justify-between gap-4">
          <Label htmlFor="judge-by-mode" className="shrink-0">Judge By</Label>
          <Select value={judgeByMode} onValueChange={setJudgeByMode}>
            <SelectTrigger id="judge-by-mode" className="w-[200px]">
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
            <SelectTrigger id="soundfont-preset" className="w-[200px]">
              <SelectValue placeholder="..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sonivox">Sonivox</SelectItem>
              <SelectItem value="fluidr3">FluidR3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

    </section>
  );
};

export default OptionsPanel;
