const NoteMarker = ({
  timestamp,
  length,
  offsetBase,
  pxPerMs,
}: {
  timestamp: number;
  length: number;
  offsetBase: number;
  pxPerMs: number;
}) => {
  const left = Math.round(timestamp * pxPerMs + offsetBase);
  const width = Math.round(Math.max(length * pxPerMs, 4));

  return (
    <div
      className="absolute h-full border-l-4 border-primary bg-primary/50 rounded-r-md z-50"
      style={{
        left: `${left}px`,
        width: `${width}px`,
      }}
    />
  )
};

export default NoteMarker;
