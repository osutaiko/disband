import { useEffect, useState } from 'react';
import useConfigStore from '@/store/useConfigStore';
import type {
  AppSettings,
  JudgmentSettings,
  NoteDetectionSettings,
  SoundfontPreset,
} from '../../../shared/settings';
import {
  noteDetectionEntries,
  judgmentEntries,
  type NumericFieldConfig,
  type NumericKeys,
  type NumericRangeFieldConfig,
  type SettingsRowConfig,
} from './settingsEntries';

import Panel from '@/components/ui/Panel';
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
import { Button } from '@/components/ui/button';

import { useColorTheme } from '@/components/ui/color-theme-provider';

type NumericSection = 'noteDetection' | 'judgment';
type SectionStateMap = {
  noteDetection: NoteDetectionSettings;
  judgment: JudgmentSettings;
};

const settingsTabContentClassName = 'flex w-full flex-col gap-4 items-stretch';
const colorThemeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

function numberFromInput(value: string, fallback: number): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

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
    <div className="flex w-full flex-row items-center gap-4">
      <div className="min-w-0 flex flex-col gap-1">
        <Label htmlFor={htmlFor}>{label}</Label>
        {description
          && <p className="text-muted-foreground text-xs leading-tight">{description}</p>}
      </div>
      <div className={`ml-auto flex-none shrink-0`}>
        {children}
      </div>
    </div>
  );
}

function NumericSettingField<T>({
  config,
  values,
  onChange,
}: {
  config: NumericFieldConfig<T>;
  values: T;
  onChange: (key: NumericKeys<T>, value: number) => void;
}) {
  const value = values[config.key] as number;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = numberFromInput(event.target.value, value);
    onChange(config.key, config.round ? Math.round(next) : next);
  };

  return (
    <FormItem
      htmlFor={config.id}
      label={config.label}
      description={config.description}
    >
      <Input
        id={config.id}
        type="number"
        step={config.step}
        value={value}
        onChange={handleChange}
        className="w-[120px]"
      />
    </FormItem>
  );
}

function NumericRangeSettingField<T>({
  config,
  values,
  onChange,
}: {
  config: NumericRangeFieldConfig<T>;
  values: T;
  onChange: (key: NumericKeys<T>, value: number) => void;
}) {
  const minValue = values[config.minKey] as number;
  const maxValue = values[config.maxKey] as number;

  const handleMinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = numberFromInput(event.target.value, minValue);
    onChange(config.minKey, config.round ? Math.round(next) : next);
  };

  const handleMaxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = numberFromInput(event.target.value, maxValue);
    onChange(config.maxKey, config.round ? Math.round(next) : next);
  };

  return (
    <FormItem
      htmlFor={config.id}
      label={config.label}
      description={config.description}
    >
      <div className="flex flex-row gap-2 items-center">
        <Input
          id={config.minId}
          type="number"
          step={config.minStep}
          value={minValue}
          onChange={handleMinChange}
          className="w-[80px]"
        />
        <span className="select-none">~</span>
        <Input
          id={config.maxId}
          type="number"
          step={config.maxStep}
          value={maxValue}
          onChange={handleMaxChange}
          className="w-[80px]"
        />
      </div>
    </FormItem>
  );
}

function SettingsRows<T>({
  entries,
  values,
  onChange,
}: {
  entries: SettingsRowConfig<T>[];
  values: T;
  onChange: (key: NumericKeys<T>, value: number) => void;
}) {
  return entries.map((row) => {
    if (row.type === 'separator') {
      return <Separator key={row.id} />;
    }
    if (row.type === 'field') {
      return (
        <NumericSettingField
          key={row.config.id}
          config={row.config}
          values={values}
          onChange={onChange}
        />
      );
    }
    return (
      <NumericRangeSettingField
        key={row.config.id}
        config={row.config}
        values={values}
        onChange={onChange}
      />
    );
  });
}

function SettingsWindow() {
  const settings = useConfigStore((state) => state.settings);
  const setSettings = useConfigStore((state) => state.setSettings);
  const [draftSettings, setDraftSettings] = useState<AppSettings | null>(null);
  const [audioDevices, setAudioDevices] = useState<{ inputs: string[]; outputs: string[]; }>({
    inputs: [],
    outputs: [],
  });

  useEffect(() => {
    window.electron.getAudioDevices()
      .then((devices) => {
        setAudioDevices(devices);
      })
      .catch(() => {
        setAudioDevices({ inputs: [], outputs: [] });
      });
  }, []);

  useEffect(() => {
    if (!settings) return;
    setDraftSettings(settings);
  }, [settings]);

  const { colorTheme, setColorTheme } = useColorTheme();

  if (!settings || !draftSettings) {
    return null;
  }

  const {
    playback,
    noteDetection,
    judgment,
  } = draftSettings ?? settings;
  const pxPerMs = playback?.pxPerMs;
  const soundfontPreset = (playback?.soundfontPreset ?? 'generaluser-gs') as SoundfontPreset;

  function updateDraft(updater: (current: AppSettings) => AppSettings) {
    setDraftSettings((current) => (current ? updater(current) : current));
  }

  function updateAudioDevices(next: {
    input?: string;
    output?: string;
  }) {
    updateDraft((current) => ({
      ...current,
      audioDevice: {
        ...current.audioDevice,
        ...next,
      },
    }));
  }

  function updateSection<K extends NumericSection>(
    section: K,
    key: NumericKeys<SectionStateMap[K]>,
    value: number,
  ) {
    updateDraft((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value,
      } as SectionStateMap[K],
    }));
  }

  function renderNumericSettingsTab<K extends NumericSection>(
    tabValue: string,
    type: K,
    entries: SettingsRowConfig<SectionStateMap[K]>[],
    values: SectionStateMap[K],
  ) {
    return (
      <TabsContent key={type} value={tabValue} className={settingsTabContentClassName}>
        <SettingsRows
          entries={entries}
          values={values}
          onChange={(key, value) => updateSection(type, key, value)}
        />
      </TabsContent>
    );
  }

  function handleReset() {
    window.electron.resetSettings().catch(() => {});
  }

  function handleCommit() {
    const currentDraft = draftSettings;
    if (!currentDraft) return;
    setSettings(currentDraft).catch(() => {});
  }

  return (
    <Panel
      title="Settings"
      className="h-screen max-h-screen overflow-hidden"
      contentClassName="flex-1 min-h-0 overflow-hidden"
      buttonGroup={[
        (
          <Button key="reset-settings" variant="destructive" onClick={handleReset}>
            Reset to Default
          </Button>
        ),
        (
          <Button
            key="confirm-settings"
            onClick={handleCommit}
            disabled={JSON.stringify(draftSettings) === JSON.stringify(settings)}
          >
            Confirm
          </Button>
        ),
      ]}
    >
    <Tabs defaultValue="audio-device" orientation="vertical" className="gap-6 h-full min-h-0 w-full">
      <TabsList variant="line">
        <TabsTrigger value="audio-device">Audio Device</TabsTrigger>
        <TabsTrigger value="appearance">Appearance</TabsTrigger>
        {/* <TabsTrigger value="tab-display">Tab Display</TabsTrigger> */}
        <TabsTrigger value="playback">Playback</TabsTrigger>
        <TabsTrigger value="note-detection">Note Detection</TabsTrigger>
        <TabsTrigger value="judgment">Judgment</TabsTrigger>
      </TabsList>
      <Separator orientation="vertical" />
      <ScrollArea className="min-h-0 min-w-0 flex-1 pr-3">
        <TabsContent value="audio-device" className={settingsTabContentClassName}>
          <FormItem
            htmlFor="audio-input-device"
            label="Input Device"
          >
            <Select
              value={draftSettings.audioDevice.input || undefined}
              onValueChange={(value) => updateAudioDevices({ input: value })}
              disabled={audioDevices.inputs.length === 0}
            >
              <SelectTrigger className="w-[400px]">
                <SelectValue placeholder="No device found" />
              </SelectTrigger>
              <SelectContent>
                {audioDevices.inputs.map((deviceName) => (
                  <SelectItem key={deviceName} value={deviceName}>
                    {deviceName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
          <FormItem
            htmlFor="audio-output-device"
            label="Output Device"
          >
            <Select
              value={draftSettings.audioDevice.output || undefined}
              onValueChange={(value) => updateAudioDevices({ output: value })}
              disabled={audioDevices.outputs.length === 0}
            >
              <SelectTrigger className="w-[400px]">
                <SelectValue placeholder="No device found" />
              </SelectTrigger>
              <SelectContent>
                {audioDevices.outputs.map((deviceName) => (
                  <SelectItem key={deviceName} value={deviceName}>
                    {deviceName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        </TabsContent>
        <TabsContent value="appearance" className={settingsTabContentClassName}>
          <FormItem
            htmlFor="color-theme-dark"
            label="Color Theme"
            description="Color scheme of app UI"
          >
            <div className="inline-flex items-center rounded-md border p-1">
              {colorThemeOptions.map((option) => (
                <Button
                  key={option.value}
                  id={`color-theme-${option.value}`}
                  type="button"
                  size="sm"
                  variant={colorTheme === option.value ? 'secondary' : 'ghost'}
                  onClick={() => setColorTheme(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </FormItem>
        </TabsContent>
        <TabsContent value="tab-display" className={settingsTabContentClassName} />
        <TabsContent value="playback" className={settingsTabContentClassName}>
          <FormItem
            htmlFor="soundfont-preset"
            label="Soundfont"
            description="Soundfont used in score playback"
          >
            <Select
              value={soundfontPreset}
              onValueChange={(value: SoundfontPreset) => {
                  updateDraft((current) => ({
                    ...current,
                    playback: {
                      ...current.playback,
                      soundfontPreset: value,
                    },
                  }));
              }}
            >
              <SelectTrigger id="soundfont-preset" className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sonivox">Sonivox</SelectItem>
                <SelectItem value="generaluser-gs">GeneralUser GS</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
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
                onValueChange={(values) => {
                  updateDraft((current) => ({
                    ...current,
                    playback: {
                      ...current.playback,
                      pxPerMs: values[0] ?? pxPerMs,
                    },
                  }));
                }}
                className="w-[200px]"
              />
            </div>
          </FormItem>
        </TabsContent>
        {renderNumericSettingsTab(
          'note-detection',
          'noteDetection',
          noteDetectionEntries,
          noteDetection,
        )}
        {renderNumericSettingsTab('judgment', 'judgment', judgmentEntries, judgment)}
      </ScrollArea>
    </Tabs>
    </Panel>
  );
}

export default SettingsWindow;
