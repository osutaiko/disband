import { useEffect, useRef, useState } from "react";
import { AlphaTabApi } from "@coderline/alphatab";
import { useLibraryStore } from "@/store/useLibraryStore";

import { alphaTabSettings } from "./alphaTabSettings";

export const useAlphaTab = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  selectedSong: string | null
) => {
  const [isLoading, setIsLoading] = useState(false);
  const apiRef = useRef<AlphaTabApi | null>(null);
  const setMetadata = useLibraryStore((state) => state.setMetadata);

  useEffect(() => {
    if (!containerRef.current || !selectedSong) return;

    const initAlphaTab = async () => {
      setIsLoading(true);
      try {
        // Fetch binary data via Electron
        const data = await window.electron.getSongData(selectedSong);
        const uint8Data = new Uint8Array(data);

        // Cleanup existing instance
        if (apiRef.current) {
          apiRef.current.destroy();
          apiRef.current = null;
        }

        // Small delay to allow DOM/ScrollArea to settle
        setTimeout(() => {
          if (!containerRef.current) return;

          try {
            const api = new AlphaTabApi(containerRef.current, alphaTabSettings);

            // --- Event Listeners --- //
            api.scoreLoaded.on((score) => {
              setMetadata({
              title: score.title,
              artist: score.artist,
              album: score.album,
              tempo: score.tempo,
              tracks: score.tracks.map(track => ({
                index: track.index,
                name: track.name,
              }))
            });
            });
            api.renderFinished.on(() => {
              setIsLoading(false);
            });
            api.error.on((e) => {
              console.error("AlphaTab API error:", e);
              setIsLoading(false);
            });

            // Load data
            api.load(uint8Data);
            apiRef.current = api;
          } catch (e) {
            console.error("AlphaTab init failed:", e);
            setIsLoading(false);
          }
        }, 150);
      } catch (e) {
        console.error("AlphaTab data fetch error:", e);
        setIsLoading(false);
      }
    };

    initAlphaTab();

    return () => {
      if (apiRef.current) {
        apiRef.current.destroy();
        apiRef.current = null;
      }
    };
  }, [selectedSong, setMetadata, containerRef]);

  return { isLoading };
};
