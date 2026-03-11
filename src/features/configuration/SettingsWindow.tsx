import useConfigStore from '@/store/useConfigStore';

import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

function FormItem({
  htmlFor,
  label,
  description,
  children,
}: {
  htmlFor: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-row justify-between items-center gap-4 w-full">
      <div className="flex flex-col gap-1">
        <Label htmlFor={htmlFor}>{label}</Label>
        {description
          && <p className="text-muted-foreground leading-tight">{description}</p>}
      </div>
      <div className="flex-none w-[150px]">
        {children}
      </div>
    </div>
  );
}

function SettingsWindow() {
  const { pxPerMs, setPxPerMs } = useConfigStore();

  return (
    <Tabs defaultValue="audio-device" orientation="vertical" className="h-screen max-h-screen">
      <TabsList variant="line" className="mr-4 px-2 py-4">
        <TabsTrigger value="audio-device">Audio Device</TabsTrigger>
        <TabsTrigger value="theme">Theme</TabsTrigger>
        <TabsTrigger value="note-detection">Note Detection</TabsTrigger>
        <TabsTrigger value="judgment">Judgment</TabsTrigger>
      </TabsList>
      <ScrollArea className="h-full max-h-screen">
        <TabsContent value="audio-device" className="mr-4 px-4 py-5" />
        <TabsContent value="theme" className="flex flex-col gap-4 items-center mr-4 px-2 py-5">
          <FormItem
            htmlFor="scroll-speed"
            label="Scroll Speed"
            description="Scroll speed of timeline"
          >
            <div className="flex flex-col gap-2 items-end">
              <span className="block text-sm text-muted-foreground">
                {pxPerMs.toFixed(2)}
                {' '}
                px/ms
              </span>
              <Slider
                id="scroll-speed"
                value={[pxPerMs]}
                min={0.03}
                max={1.0}
                step={0.01}
                onValueChange={(vals) => setPxPerMs(vals[0] ?? pxPerMs)}
              />
            </div>
          </FormItem>
          <FormItem
            htmlFor="soundfont-preset"
            label="Soundfont"
            description="Soundfont used in score playback"
          >
            <Select>
              <SelectTrigger id="soundfont-preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sonivox">Sonivox</SelectItem>
                <SelectItem value="fluidr3">FluidR3</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        </TabsContent>
        <TabsContent value="note-detection" className="flex flex-col gap-4 items-center mr-4 px-2 py-5">
          <FormItem
            htmlFor="hop-size-ms"
            label="Hop Size (ms)"
            description="Step size of detection in milliseconds: notes will only be detected in increments of this value"
          >
            <Input id="hop-size-ms" type="number" />
          </FormItem>
          <FormItem
            htmlFor="pitch-frame-size-ms"
            label="Pitch Frame Size (ms)"
            description="Frame size in milliseconds used for pitch estimation"
          >
            <Input id="pitch-frame-size-ms" type="number" />
          </FormItem>
          <FormItem
            htmlFor="pitch-hz"
            label="Detection Pitch Range (Hz)"
            description="Lowest/Highest pitch to detect"
          >
            <div className="flex flex-row gap-2 items-center">
              <Input id="pitch-min-hz" type="number" />
              <span className="select-none">~</span>
              <Input id="pitch-max-hz" type="number" />
            </div>
          </FormItem>
          <FormItem
            htmlFor="midi"
            label="Translation MIDI Range"
            description="Lowest/Highest MIDI note to convert to"
          >
            <div className="flex flex-row gap-2 items-center">
              <Input id="midi-min" type="number" />
              <span className="select-none">~</span>
              <Input id="midi-max" type="number" />
            </div>
          </FormItem>
          <FormItem
            htmlFor="onset-threshold"
            label="Onset Threshold"
            description="Peak picking threshold passed to aubio"
          >
            <Input id="onset-threshold" type="number" />
          </FormItem>
          <FormItem
            htmlFor="onset-compensation-ms"
            label="Onset Compensation (ms)"
            description="Compensation in milliseconds to offset detector latency"
          >
            <Input id="onset-compensation-ms" type="number" />
          </FormItem>
          <FormItem
            htmlFor="silence-db"
            label="Silence Threshold (dB)"
            description="Audio below this level is treated as silence"
          >
            <Input id="silence-db" type="number" />
          </FormItem>
          <FormItem
            htmlFor="min-note-ms"
            label="Min Note Length (ms)"
            description="Shortest note length to detect in milliseconds"
          >
            <Input id="min-note-ms" type="number" />
          </FormItem>
          <FormItem
            htmlFor="min-pitch-confidence"
            label="Min Pitch Confidence"
            description="Minimum confidence of pitch existence required for an audio section to define it as an actual note"
          >
            <Input id="min-pitch-confidence" type="number" />
          </FormItem>
        </TabsContent>
        <TabsContent value="judgment" className="flex flex-col gap-4 items-center mr-4 px-2 py-5">
          <FormItem
            htmlFor="match-window-ms"
            label="Match Window"
            description="Maximum offset of detected note to pair notes from reference score with"
          >
            <Input id="match-window-ms" type="number" />
          </FormItem>
          <Separator />
          <FormItem
            htmlFor="attack-ok-window-ms"
            label="Attack OK Window (ms)"
            description="Attack timing window in milliseconds for OK judgment"
          >
            <Input id="attack-ok-window-ms" type="number" />
          </FormItem>
          <FormItem
            htmlFor="pitch-tolerance-semitones"
            label="Pitch Tolerance"
            description="Allowed pitch error in semitones for OK judgment"
          >
            <Input id="pitch-tolerance-semitones" type="number" />
          </FormItem>
          <Separator />
          <FormItem
            htmlFor="attack-inaccurate-window-ms"
            label="Attack Inaccurate Window (ms)"
            description="Attack timing window (ms) for Inaccurate judgment (as opposed to Miss)"
          >
            <Input id="attack-inaccurate-window-ms" type="number" />
          </FormItem>
          <FormItem
            htmlFor="release-tolerance-ms"
            label="Release Tolerance (ms)"
            description="Release timing tolerance in milliseconds"
          >
            <Input id="release-tolerance-ms" type="number" />
          </FormItem>
          <FormItem
            htmlFor="velocity-tolerance-mult"
            label="Velocity Tolerance"
            description="Multiplier tolerance for velocity"
          >
            <div className="flex flex-row gap-2 items-center">
              <Input id="velocity-tolerance-mult-lower" type="number" />
              <span className="select-none">~</span>
              <Input id="velocity-tolerance-mult-upper" type="number" />
            </div>
          </FormItem>
          <FormItem
            htmlFor="articulation-tolerance-mult"
            label="Articulation Tolerance"
            description="Multiplier tolerance for articulation matching"
          >
            <Input id="articulation-tolerance-mult" type="number" />
          </FormItem>
        </TabsContent>
      </ScrollArea>
    </Tabs>
  );
}

export default SettingsWindow;
