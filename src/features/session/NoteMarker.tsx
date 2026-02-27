function NoteMarker({
  timestamp,
  length,
  offsetBase,
  pxPerMs,
  isCurrentlyPlaying,
  status = 'unjudged',
}: {
  timestamp: number;
  length: number;
  offsetBase: number;
  pxPerMs: number;
  isCurrentlyPlaying: boolean;
  status?: 'ok' | 'inaccurate' | 'miss' | 'unjudged';
}) {
  const left = timestamp * pxPerMs + offsetBase;
  const width = Math.max(length * pxPerMs, 4);
  const statusClass = status === 'ok'
    ? 'border-note-ok bg-note-ok-bg'
    : status === 'inaccurate'
      ? 'border-note-inacc bg-note-inacc-bg'
      : status === 'miss'
        ? 'border-note-miss bg-note-miss-bg'
        : 'border-note-start bg-note-middle';

  return (
    <div
      className={`
        absolute h-[calc(100%-16px)] border-l-4 rounded-r-full
        ${statusClass}
        ${isCurrentlyPlaying ? 'brightness-115' : ''}
      `}
      style={{
        left: `${left}px`,
        width: `${width}px`,
      }}
    />
  );
}

export default NoteMarker;
