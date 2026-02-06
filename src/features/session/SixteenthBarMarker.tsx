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
      className="absolute top-[12px] w-[0.5px] h-full bg-primary/20"
      style={{
        left: `${left}px`,
      }}
    />
  )
};

export default SixteenthBarMarker;
