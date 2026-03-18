import { RefObject } from 'react';

function SessionCanvas({
  containerRef,
}: {
  containerRef: RefObject<HTMLDivElement>;
}) {
  return <div ref={containerRef} className="absolute inset-0 z-20 pointer-events-none" />;
}

export default SessionCanvas;
