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
      className="absolute h-full border-l-4 border-note-start bg-note-middle rounded-r-md z-50"
      style={{
        left: `${left}px`,
        width: `${width}px`,
      }}
    />
  )
};

export default NoteMarker;
