const QuarterBarMarker = ({
  timestamp,
  offsetBase,
  pxPerMs,
}: {
  timestamp: number;
  offsetBase: number;
  pxPerMs: number;
}) => {
  const left = Math.round(timestamp * pxPerMs + offsetBase);

  return (
    <div
      className="absolute top-[12px] w-[1px] h-full bg-primary/50"
      style={{
        left: `${left}px`,
      }}
    />
  )
};

export default QuarterBarMarker;
