const SixteenthBarMarker = ({
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
      className="absolute top-[24px] w-[1px] h-full bg-primary/10 z-40"
      style={{
        left: `${left}px`,
      }}
    />
  )
};

export default SixteenthBarMarker;
