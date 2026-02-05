const BarMarker = ({
  index,
  timestamp,
  offsetBase,
  pxPerMs,
}: {
  index: number;
  timestamp: number;
  offsetBase: number;
  pxPerMs: number;
}) => {
  const left = timestamp * pxPerMs + offsetBase;

  return (
    <div
      className="absolute top-[4px] w-[2px] h-full bg-primary/30 z-40"
      style={{
        left: `${left}px`,
      }}
    >
      <p className="absolute top-[-4px] left-[6px] text-primary/30 font-mono">{index}</p>
    </div>
  )
};

export default BarMarker;
