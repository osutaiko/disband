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
      className={`absolute h-full ${
        variant === 'score-start' ? 'top-[4px] w-[2px] bg-red-500'
          : variant === 'score-end' ? 'top-[4px] w-[1px] bg-red-500'
            : variant === 'whole' ? 'top-[4px] w-[1px] bg-primary/50'
              : variant === 'quarter' ? 'top-[12px] w-[0.5px] h-full bg-primary/50'
                : variant === 'sixteenth' ? 'top-[12px] w-[0.5px] h-full bg-primary/20'
                  : ''
      }`}
      style={{
        left: `${left}px`,
      }}
    >
      {/* <p className="absolute top-[-4px] left-[6px] font-mono text-primary/50">{index}</p> */}
    </div>
  );
}

export default BarMarker;
