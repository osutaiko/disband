import useConfigStore from '@/store/useConfigStore';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    <div className="flex flex-row justify-between items-center gap-6 w-full">
      <div className="flex flex-col gap-1">
        <Label htmlFor={htmlFor}>{label}</Label>
        {description &&
          <p className="text-muted-foreground leading-tight">{description}</p>
        }
      </div>
      <div className="flex-none w-[100px]">
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
        <TabsContent value="audio-device" className="mr-4 px-4 py-5">
          
        </TabsContent>
        <TabsContent value="theme" className="flex flex-col gap-4 items-center mr-4 px-2 py-5">
          <FormItem
            htmlFor="scroll-speed"
            label="Scroll Speed"
            description="Scroll speed of timeline"
          >
            <div className="flex flex-col gap-2 items-end">
              <span className="block text-sm text-muted-foreground">{pxPerMs.toFixed(2)} px/ms</span>
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
            label="Hop Size"
            description="Step size of detection: notes will only be detected in increments of this value"
          >
            <Input id="hop-size-ms" type="number" />
          </FormItem>
          <FormItem
            htmlFor="pitch-frame-size-ms"
            label="Pitch Frame Size"
            description="Frame size used for pitch estimation"
          >
            <Input id="pitch-frame-size-ms" type="number" />
          </FormItem>
          <FormItem
            htmlFor="pitch-min-hz"
            label="Pitch Min (Hz)"
            description="Lowest pitch to detect"
          >
            <Input id="pitch-min-hz" type="number" />
          </FormItem>
          <FormItem
            htmlFor="pitch-max-hz"
            label="Pitch Max (Hz)"
            description="Highest pitch to detect"
          >
            <Input id="pitch-max-hz" type="number" />
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
            label="Onset Compensation"
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
            label="Min Note Length"
            description="Shortest detected note length in milliseconds"
          >
            <Input id="min-note-ms" type="number" />
          </FormItem>
          <FormItem
            htmlFor="min-midi"
            label="Min MIDI"
            description="Minimum MIDI note to detect"
          >
            <Input id="min-midi" type="number" />
          </FormItem>
          <FormItem
            htmlFor="max-midi"
            label="Max MIDI"
            description="Maximum MIDI note to detect"
          >
            <Input id="max-midi" type="number" />
          </FormItem>
          <FormItem
            htmlFor="min-pitch-confidence"
            label="Min Pitch Confidence"
            description="Minimum aubio confidence required to trust pitch detection"
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
            label="Attack OK Window"
            description="Attack timing window (ms) for OK judgment"
          >
            <Input id="attack-ok-window-ms" type="number" />
          </FormItem>
          <FormItem
            htmlFor="pitch-tolerance-semitones"
            label="Pitch Tolerance"
            description="Allowed pitch error in semitones"
          >
            <Input id="pitch-tolerance-semitones" type="number" />
          </FormItem>
          <FormItem
            htmlFor="attack-inaccurate-window-ms"
            label="Attack Inaccurate Window"
            description="Attack timing window (ms) for Inaccurate judgment"
          >
            <Input id="attack-inaccurate-window-ms" type="number" />
          </FormItem>
          <FormItem
            htmlFor="release-tolerance-ms"
            label="Release Tolerance"
            description="Release timing tolerance in milliseconds"
          >
            <Input id="release-tolerance-ms" type="number" />
          </FormItem>
          <FormItem
            htmlFor="velocity-tolerance-mult-lower"
            label="Velocity Tolerance Lower"
            description="Lower multiplier bound for velocity matching"
          >
            <Input id="velocity-tolerance-mult-lower" type="number" />
          </FormItem>
          <FormItem
            htmlFor="velocity-tolerance-mult-upper"
            label="Velocity Tolerance Upper"
            description="Upper multiplier bound for velocity matching"
          >
            <Input id="velocity-tolerance-mult-upper" type="number" />
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
