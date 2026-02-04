import { useEffect, useRef, useState } from "react";
import { useLibraryStore } from "@/store/useLibraryStore";
import { useAlphaTab } from "./useAlphaTab";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut } from "lucide-react";

const TabView = () => {
  const ZOOM_MIN = 0.25;
  const ZOOM_MAX = 2.0;

  const { api, selectedSong, selectedTrackId } = useLibraryStore();
  const [zoom, setZoom] = useState<number>(1.0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { isTabLoading } = useAlphaTab(containerRef, selectedSong);

  const applyZoom = (newZoom: number) => {
    if (!api) return;
    const clampedZoom = Math.min(Math.max(newZoom, ZOOM_MIN), ZOOM_MAX);
    setZoom(clampedZoom);
    
    api.settings.display.scale = clampedZoom;
    api.updateSettings();
    api.render();
  };

  useEffect(() => {
    setZoom(1.0);
  }, [selectedSong, selectedTrackId]);

  // Ctrl + scroll behavior
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        applyZoom(zoom + delta);
      }
    };

    const container = containerRef.current;
    if (container) {
      window.addEventListener("wheel", handleWheel, { passive: false });
    }
    return () => window.removeEventListener("wheel", handleWheel);
  }, [api, zoom]);

  return (
    <section className="flex-1 flex flex-col relative w-full h-full overflow-hidden">
      {!selectedSong && (
        <div className="flex flex-1 items-center justify-center">
          <h2 className="text-[18px]">No Song Selected</h2>
        </div>
      )}

      {selectedSong && isTabLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          <h2 className="text-lg font-medium animate-pulse">Preparing your Tab...</h2>
        </div>
      )}

      {/* Actual TAB */}
      {selectedSong && (
        <ScrollArea className="flex-1 w-full h-full">
          <div className="flex justify-center w-full p-4">
            <div 
              ref={containerRef} 
              className="w-full max-w-[1000px]"
              // Must keep mounted but hidden
              style={{ visibility: isTabLoading ? "hidden" : "visible" }}
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
          <span className="text-xs font-mono min-w-8 text-end">{Math.round(zoom * 100)}%</span>
        </div>
      )}
    </section>
  );
};

export default TabView;