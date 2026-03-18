type Variant =
  | 'score-start'
  | 'score-end'
  | 'whole'
  | 'quarter'
  | 'sixteenth';

const variantClasses: Record<Variant, string> = {
  'score-start': 'top-[4px] w-[2px] bg-bar-startend',
  'score-end': 'top-[4px] w-[2px] bg-bar-startend',
  whole: 'top-[4px] w-[2px] bg-bar-1',
  quarter: 'top-[12px] w-[1px] bg-bar-4',
  sixteenth: 'top-[12px] w-[1px] bg-bar-16',
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
  const left = timestamp * pxPerMs + offsetBase;

  return (
    <div
      className={`absolute h-full ${variantClasses[variant]}`}
      style={{
        left: `${left}px`,
      }}
    >
      {/* <p className="absolute top-[-4px] left-[6px] font-mono text-muted-foreground">{index}</p> */}
    </div>
  );
}

export default BarMarker;
