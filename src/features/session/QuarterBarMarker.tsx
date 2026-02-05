const QuarterBarMarker = ({
  timestamp,
  offsetBase,
  pxPerMs,
}: {
  timestamp: number;
  offsetBase: number;
  pxPerMs: number;
}) => {
  const left = timestamp * pxPerMs + offsetBase;

  return (
    <div
      className="absolute top-[12px] w-[1px] h-full bg-primary/10 z-40"
      style={{
        left: `${left}px`,
      }}
    />
  )
};

export default QuarterBarMarker;
