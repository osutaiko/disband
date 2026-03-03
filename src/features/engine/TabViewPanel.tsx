import {
  useEffect, RefObject, useRef, useState, useCallback,
} from 'react';

import useLibraryStore from '@/store/useLibraryStore';
import useEngineStore from '@/store/useEngineStore';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut } from 'lucide-react';

function TabViewPanel({
  containerRef,
  isTabLoading,
}: {
  containerRef: RefObject<HTMLDivElement> | null,
  isTabLoading: boolean,
}) {
  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 2.0;

  const { selectedSong, selectedTrackId } = useLibraryStore();
  const { api } = useEngineStore();
  const [zoom, setZoom] = useState<number>(1.0);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  const applyZoom = useCallback((newZoom: number) => {
    if (!api) return;

    const clampedZoom = Math.min(Math.max(newZoom, ZOOM_MIN), ZOOM_MAX);
    setZoom(clampedZoom);

    api.settings.display.scale = clampedZoom;
    api.updateSettings();
    api.render();
  }, [api]);

  useEffect(() => {
    setZoom(1.0);
  }, [selectedSong, selectedTrackId]);

  // Auto scrolling during playback
  useEffect(() => {
    if (!api || !scrollAreaRef.current) return;

    const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (!viewport) return;

    api.settings.player.scrollElement = viewport;
    api.updateSettings();
  }, [api, selectedSong, selectedTrackId, isTabLoading]);

  // Ctrl + scroll behavior
  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;

        setZoom((prev) => {
          const next = prev + delta;
          applyZoom(next);
          return next;
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [applyZoom, containerRef]);

  return (
    <section className="flex-1 flex flex-col relative w-full h-full overflow-hidden">
      {!selectedSong && (
        <div className="flex flex-1 items-center justify-center">
          <h2>No Song Selected</h2>
        </div>
      )}

      {selectedSong && isTabLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          <h2 className="text-lg font-medium animate-pulse">Preparing your Tab...</h2>
        </div>
      )}

      {/* Actual TAB */}
      {selectedSong && (
        <ScrollArea ref={scrollAreaRef} className="flex-1 w-full h-full">
          <div className="flex justify-center w-full p-4">
            <div
              ref={containerRef}
              className="w-full max-w-[1000px]"
              // Must keep mounted but hidden
              style={{ visibility: isTabLoading ? 'hidden' : 'visible' }}
            />
          </div>
        </ScrollArea>
      )}

      {/* Zoom Controls */}
      {selectedSong && !isTabLoading && (
        <div className="absolute bottom-6 right-6 z-50 flex items-center gap-3 bg-background border px-4 py-2 rounded-full shadow-md opacity-50 hover:opacity-100 transition-opacity duration-300">
          <ZoomOut size={16} className="text-muted-foreground" />
          <Slider
            className="w-32"
            value={[zoom * 100]}
            min={ZOOM_MIN * 100}
            max={ZOOM_MAX * 100}
            step={5}
            onValueChange={(vals) => setZoom(vals[0] / 100)}
            onValueCommit={(vals) => applyZoom(vals[0] / 100)}
          />
          <ZoomIn size={16} className="text-muted-foreground" />
          <span className="text-xs font-mono min-w-8 text-end">
            {Math.round(zoom * 100)}
            %
          </span>
        </div>
      )}
    </section>
  );
}

export default TabViewPanel;
