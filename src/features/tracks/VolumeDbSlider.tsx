import { Slider } from '@/components/ui/slider';

export const MIN_DB = -48;
export const MAX_DB = 12;
const ZERO_DB_PERCENT = ((0 - MIN_DB) / (MAX_DB - MIN_DB)) * 100;

function formatDbLabel(db: number): string {
  if (db <= MIN_DB) return '-∞ dB';
  return `${db.toFixed(1)} dB`;
}

export default function VolumeDbSlider({
  db,
  disabled,
  onDbChange,
}: {
  db: number;
  disabled?: boolean;
  onDbChange: (nextDb: number) => void;
}) {
  return (
    <div className="flex shrink-0 flex-row items-center gap-1">
      <div
        className="relative w-[90px]"
        onDoubleClick={() => {
          if (!disabled) onDbChange(0);
        }}
      >
        <span className="pointer-events-none select-none absolute top-[7px] left-0 font-mono text-[10px] text-muted-foreground">
          {formatDbLabel(db)}
        </span>
        <Slider
          className="relative z-10 w-full px-[4.5px]
            [&_[data-slot=slider-track]]:rounded-none
            [&_[data-slot=slider-range]]:rounded-none
            [&_[data-slot=slider-thumb]]:relative
            [&_[data-slot=slider-thumb]]:z-20
            [&_[data-slot=slider-thumb]]:w-[9px]
            [&_[data-slot=slider-thumb]]:h-[16px]
            [&_[data-slot=slider-thumb]]:[clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]
            [&_[data-slot=slider-thumb]]:rotate-0"
          value={[db]}
          min={MIN_DB}
          max={MAX_DB}
          step={0.5}
          disabled={disabled}
          onValueChange={(vals) => onDbChange(vals[0] ?? db)}
          onValueCommit={(vals) => onDbChange(vals[0] ?? db)}
        />
        <span
          className="pointer-events-none absolute top-1/2 z-0 h-[14px] w-px -translate-y-1/2 bg-border"
          style={{ left: `calc(4.5px + (100% - 9px) * ${ZERO_DB_PERCENT / 100})` }}
        />
      </div>
    </div>
  );
}
