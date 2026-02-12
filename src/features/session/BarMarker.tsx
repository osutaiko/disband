type Variant =
  | 'score-start'
  | 'score-end'
  | 'whole'
  | 'quarter'
  | 'sixteenth';

const variantClasses: Record<Variant, string> = {
  'score-start': 'top-[4px] w-[2px] bg-red-500',
  'score-end': 'top-[4px] w-[1px] bg-red-500',
  whole: 'top-[4px] w-[1px] bg-primary/50',
  quarter: 'top-[12px] w-[0.5px] bg-primary/50',
  sixteenth: 'top-[12px] w-[0.5px] bg-primary/20',
};

function BarMarker({
  variant,
  timestamp,
  offsetBase,
  pxPerMs,
}: {
  variant: 'score-start' | 'score-end' | 'whole' | 'quarter' | 'sixteenth';
  timestamp: number;
  offsetBase: number;
  pxPerMs: number;
}) {
  const left = Math.round(timestamp * pxPerMs + offsetBase);

  return (
    <div
      className={`absolute h-full ${variantClasses[variant]}`}
      style={{
        left: `${left}px`,
      }}
    >
      {/* <p className="absolute top-[-4px] left-[6px] font-mono text-primary/50">{index}</p> */}
    </div>
  );
}

export default BarMarker;
