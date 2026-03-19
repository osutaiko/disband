import {
  useEffect, RefObject, useRef, useState, useCallback,
} from 'react';

import { ZoomIn, ZoomOut } from 'lucide-react';
import useLibraryStore from '@/store/useLibraryStore';
import useEngineStore from '@/store/useEngineStore';
import { applyAlphaTabSettings } from './alphaTabSettings';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';

function TabViewPanel({
  containerRef,
  isTabLoading,
}: {
  containerRef: RefObject<HTMLDivElement> | null,
  isTabLoading: boolean,
}) {
  const ZOOM_MIN = 25;
  const ZOOM_MAX = 200;
  const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 175, 200];

  const { selectedSong, selectedTrackId } = useLibraryStore();
  const { api } = useEngineStore();
  const [zoom, setZoom] = useState<number>(100);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  const applyZoom = useCallback((newZoomPercent: number) => {
    if (!api) return;

    const clampedZoom = Math.min(Math.max(newZoomPercent, ZOOM_MIN), ZOOM_MAX);
    setZoom(clampedZoom);

    applyAlphaTabSettings(api, (settings) => {
      settings.display.scale = clampedZoom / 100;
    });
  }, [api]);

  const applyZoomPreset = useCallback((percent: number) => {
    applyZoom(percent);
  }, [applyZoom]);

  const zoomInStep = useCallback(() => {
    const next = ZOOM_PRESETS.find((step) => step > zoom);
    if (next !== undefined) applyZoomPreset(next);
  }, [applyZoomPreset, zoom]);

  const zoomOutStep = useCallback(() => {
    const prev = [...ZOOM_PRESETS].reverse().find((step) => step < zoom);
    if (prev !== undefined) applyZoomPreset(prev);
  }, [applyZoomPreset, zoom]);

  useEffect(() => {
    setZoom(100);
  }, [selectedSong, selectedTrackId]);

  useEffect(() => {
    const offZoomIn = window.electron.onScoreZoomInMenu(zoomInStep);
    const offZoomOut = window.electron.onScoreZoomOutMenu(zoomOutStep);
    const offZoomReset = window.electron.onScoreZoomResetMenu(() => applyZoomPreset(100));

    return () => {
      offZoomIn();
      offZoomOut();
      offZoomReset();
    };
  }, [applyZoomPreset, zoomInStep, zoomOutStep]);

  // Auto scrolling during playback
  useEffect(() => {
    if (!api || !scrollAreaRef.current) return;

    const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (!viewport) return;

    applyAlphaTabSettings(api, (settings) => {
      settings.player.scrollElement = viewport;
    });
  }, [api, selectedSong, selectedTrackId, isTabLoading]);

  // Ctrl + scroll behavior
  useEffect(() => {
    const container = containerRef?.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -5 : 5;

        setZoom((prev) => {
          const next = prev + delta;
          applyZoom(next);
          return Math.min(Math.max(next, ZOOM_MIN), ZOOM_MAX);
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [applyZoom, containerRef]);

  return (
    <section className="flex-1 min-w-0 flex flex-col relative w-full h-full overflow-hidden bg-white">
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
        <ScrollArea ref={scrollAreaRef} className="flex-1 min-w-0 w-full h-full">
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
            value={[zoom]}
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={5}
            onValueChange={(vals) => setZoom(vals[0])}
            onValueCommit={(vals) => applyZoom(vals[0])}
          />
          <ZoomIn size={16} className="text-muted-foreground" />
          <span className="text-xs font-mono min-w-8 text-end">
            {Math.round(zoom)}
            %
          </span>
        </div>
      )}
    </section>
  );
}

export default TabViewPanel;
