import { useRef } from "react";
import { useLibraryStore } from "@/store/useLibraryStore";
import { useAlphaTab } from "./useAlphaTab";

import { ScrollArea } from "@/components/ui/scroll-area";

const TabView = () => {
  const { selectedSong } = useLibraryStore();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { isLoading } = useAlphaTab(containerRef, selectedSong);

  return (
    <section className="flex-1 flex flex-col relative w-full h-full overflow-hidden">
      {!selectedSong && (
        <div className="flex flex-1 items-center justify-center">
          <h2 className="text-[18px]">No Song Selected</h2>
        </div>
      )}

      {selectedSong && isLoading && (
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
              style={{ visibility: isLoading ? "hidden" : "visible" }}
            />
          </div>
        </ScrollArea>
      )}
    </section>
  );
};

export default TabView;