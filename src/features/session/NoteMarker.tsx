const NoteMarker = ({
  timestamp,
  length,
  offsetBase,
  pxPerMs,
  isCurrentlyPlaying,
}: {
  timestamp: number;
  length: number;
  offsetBase: number;
  pxPerMs: number;
  isCurrentlyPlaying: boolean;
}) => {
  const left = Math.round(timestamp * pxPerMs + offsetBase);
  const width = Math.round(Math.max(length * pxPerMs, 4));

  return (
    <div
      className={`
        absolute h-[calc(100%-16px)] border-l-4
        ${isCurrentlyPlaying ? "border-note-playing-start bg-note-playing-middle" : "border-note-start bg-note-middle"}
      `}
      style={{
        left: `${left}px`,
        width: `${width}px`,
        clipPath:
          width >= 12
            ? "polygon(0 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 0 100%)"
            : undefined,
      }}
    />
  )
};

export default NoteMarker;
