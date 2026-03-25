import {
  type NumericFieldConfig,
  type NumericKeys,
  type NumericRangeFieldConfig,
  type SettingsRowConfig,
} from './settingsEntries';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

function numberFromInput(value: string, fallback: number): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

export function FormItem({
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

export function SettingsRows<T>({
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
