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
      className="absolute h-[calc(100%-16px)] border-l-4 border-note-start bg-note-middle z-50"
      style={{
        left: `${left}px`,
        width: `${width}px`,
        clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 0 100%)",
      }}
    />
  )
};

export default NoteMarker;
