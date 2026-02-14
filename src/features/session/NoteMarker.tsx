function NoteMarker({
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
}) {
  const left = timestamp * pxPerMs + offsetBase;
  const width = Math.max(length * pxPerMs, 4);

  return (
    <div
      className={`
        absolute h-[calc(100%-16px)] border-l-4 rounded-r-full
        ${isCurrentlyPlaying ? 'border-note-current-start bg-note-current-middle' : 'border-note-start bg-note-middle'}
      `}
      style={{
        left: `${left}px`,
        width: `${width}px`,
      }}
    />
  );
}

export default NoteMarker;
