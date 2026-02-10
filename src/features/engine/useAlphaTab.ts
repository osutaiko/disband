import { useEffect, useRef, useState } from "react";
import { AlphaTabApi, Settings } from "@coderline/alphatab";
import { useLibraryStore } from "@/store/useLibraryStore";

import { alphaTabSettings } from "./alphaTabSettings";

export const useAlphaTab = (
  containerRef: React.RefObject<HTMLDivElement | null>,
  selectedSong: string | null
) => {
  const { setApi, setIsPlaying, setTracks, setEndMs, setCurrentBar, setEndBar, selectedTrackId, setSelectedTrackId } = useLibraryStore();

  const [isTabLoading, setIsTabLoading] = useState(false);
  const apiRef = useRef<AlphaTabApi | null>(null);
  const currentMsRef = useRef(0);

  const onError = () => {
    setIsTabLoading(false);
  };

  useEffect(() => {
    if (!containerRef || !containerRef.current || !selectedSong) return;

    const initAlphaTab = async () => {
      setIsTabLoading(true);
    
      try {
        // Fetch binary data via Electron
        const data = await window.electron.getSongData(selectedSong);
        const uint8Data = new Uint8Array(data);

        // Cleanup existing instance
        if (apiRef.current) {
          apiRef.current.destroy();
          apiRef.current = null;
          setApi(null);
        }

        // Small delay to allow DOM to settle
        setTimeout(() => {
          if (!containerRef.current) return;

          const api = new AlphaTabApi(containerRef.current, alphaTabSettings as Settings);
          apiRef.current = api;
          setApi(api);

          try {
            // --- Event Listeners --- //
            api.scoreLoaded.on((score) => {
              setTracks(score.tracks);
              const trackExists = score.tracks.some(t => t.index === selectedTrackId);
              if (!trackExists && score.tracks.length > 0) {
                setSelectedTrackId(score.tracks[0].index); 
              }
              
              if (score.tracks.length > 0) {
                setEndBar(score.tracks[0].staves[0].bars.length);
              }
            });
            api.renderFinished.on(() => {
              setIsTabLoading(false);
            });

            api.playerReady.on(() => {
              setApi(api);
              setEndMs(api.endTime);
            });

            api.playerStateChanged.on((args) => {
              // 0 = stopped, 1 = playing, 2 = paused
              setIsPlaying(args.state === 1);
            });

            api.playerPositionChanged.on((args) => {
              currentMsRef.current = args.currentTime;
              if (args.isSeek && api.tickCache) {
                const trackId = useLibraryStore.getState().selectedTrackId ?? 0;
                const lookup = api.tickCache.findBeat(new Set([trackId]), args.currentTick);
                if (lookup?.beat) {
                  setCurrentBar(lookup.beat.voice.bar.index + 1);
                }
              }
            });

            api.playedBeatChanged.on((beat) => {
              setCurrentBar(beat.voice.bar.index + 1) // 1-based
            });

            api.error.on((e) => {
              console.error("AlphaTab API error:", e);
              onError();
            });

            // Load data
            api.load(uint8Data);
          } catch (e) {
            console.error("AlphaTab init failed:", e);
            onError();
          }
        }, 150);
      } catch (e) {
        console.error("AlphaTab data fetch error:", e);
        onError();
      }
    };

    initAlphaTab();

    return () => {
      if (apiRef.current) {
        apiRef.current.destroy();
        apiRef.current = null;
        setApi(null);
      }
    };
  }, [selectedSong, setApi, setIsPlaying, containerRef]);

  useEffect(() => {
    if (apiRef.current && apiRef.current.score && selectedTrackId !== null) {
      const track = apiRef.current.score.tracks.find(t => t.index === selectedTrackId);
      if (track) {
        apiRef.current.renderTracks([track]);
      }
    }
  }, [apiRef.current, selectedTrackId]);

  return {
    isTabLoading,
    currentMsRef,
  };
};
