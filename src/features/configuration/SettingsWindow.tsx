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
      <div>
        <Label htmlFor={htmlFor}>{label}</Label>
        {description &&
          <p className="text-muted-foreground">{description}</p>
        }
      </div>
      {children}
    </div>
  );
}

function SettingsWindow() {
  const { pxPerMs, setPxPerMs } = useConfigStore();

  return (
    <Tabs defaultValue="audio-device" orientation="vertical" className="h-[100vh] px-4 py-8">
      <TabsList variant="line">
        <TabsTrigger value="audio-device">Audio Device</TabsTrigger>
        <TabsTrigger value="theme">Theme</TabsTrigger>
        <TabsTrigger value="analysis">Analysis</TabsTrigger>
      </TabsList>

      <TabsContent value="audio-device" className="px-4 py-8">
        
      </TabsContent>
      <TabsContent value="theme" className="flex flex-col gap-4 items-center px-4 py-8">
        <FormItem
          htmlFor="scroll-speed"
          label="Scroll Speed"
          description="Scroll speed of timeline"
        >
          <div className="flex flex-col gap-2 items-end">
            <span className="block text-sm text-muted-foreground">{pxPerMs.toFixed(2)} px/ms</span>
            <Slider
              id="scroll-speed"
              className="w-[120px]"
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
            <SelectTrigger id="soundfont-preset" className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sonivox">Sonivox</SelectItem>
              <SelectItem value="fluidr3">FluidR3</SelectItem>
            </SelectContent>
          </Select>
        </FormItem>
      </TabsContent>
      <TabsContent value="analysis" className="px-4 py-8">
      </TabsContent>
    </Tabs>
  );
}

export default SettingsWindow;
