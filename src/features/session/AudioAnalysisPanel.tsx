import { useEffect } from "react";

import { useLibraryStore } from "@/store/useLibraryStore";
import { useAudioAnalysisMarkers } from "./useAudioAnalysisMarkers";

import BarMarker from "./BarMarker";
import QuarterBarMarker from "./QuarterBarMarker";
import SixteenthBarMarker from "./SixteenthBarMarker";
import NoteMarker from "./NoteMarker";

const AudioAnalysisPanel = ({ currentMsRef }) => {
  const { api, selectedTrackId, currentMs, setCurrentMs, endMs } = useLibraryStore();
  const {
    noteMarkers = [],
    barMarkers = [],
    quarterBarMarkers = [],
    sixteenthBarMarkers = [],
  } = useAudioAnalysisMarkers(api, selectedTrackId, endMs);

  const pxPerMs = 0.20;
  const playheadOffset = 200;

  // Panel padding "p-6"
  const panelPadding = 24;

  // Padding before/after time=0
  const trackStartPadding = 1000;
  
  const totalTrackWidth = endMs * pxPerMs + (2 * trackStartPadding);
  const currentTranslation = playheadOffset - (currentMs * pxPerMs + trackStartPadding + panelPadding);

  useEffect(() => {
    let rafId: number;

    const tick = () => {
      setCurrentMs(currentMsRef.current);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  if (!api || selectedTrackId === null) return null;

  return (
    <section
      className="h-min border-t bg-background relative overflow-hidden"
      style={{ padding: `${panelPadding}px` }}
    >
      <div className="relative mask-x-from-90% h-40 w-full overflow-hidden">
        <div 
          className="absolute top-0 h-full pt-[24px] pb-[12px] flex flex-col gap-2 will-change-transform"
          style={{ 
            width: `${totalTrackWidth}px`,
            transform: `translateX(${currentTranslation}px)`,
          }}
        >
          {/* Bar Markers */}
          {barMarkers.map((marker) => (
            <BarMarker 
              key={marker.index}
              index={marker.index}
              timestamp={marker.timestamp}
              pxPerMs={pxPerMs}
              offsetBase={trackStartPadding}
            />
          ))}
          {quarterBarMarkers.map((marker, index) => (
            <QuarterBarMarker 
              key={index}
              timestamp={marker.timestamp}
              pxPerMs={pxPerMs}
              offsetBase={trackStartPadding}
            />
          ))}
          {sixteenthBarMarkers.map((marker, index) => (
            <SixteenthBarMarker 
              key={index}
              timestamp={marker.timestamp}
              pxPerMs={pxPerMs}
              offsetBase={trackStartPadding}
            />
          ))}
          
          {/* Reference Lane */}
          <div className="relative w-full h-1/3 z-20">
            {/* Note Markers */}
            {noteMarkers.map((marker, index) => (
              <NoteMarker 
                key={index}
                timestamp={marker.timestamp}
                length={marker.length}
                offsetBase={trackStartPadding}
                pxPerMs={pxPerMs}
              />
            ))}
          </div>
          
          {/* Recorded Audio */}
          <div className="w-full h-2/3 bg-secondary z-20">
          </div>
        </div>
      </div>

      {/* Playhead */}
      <div
        className={`absolute w-[1px] bg-red-500 z-100`}
        style={{
          left: `${playheadOffset}px`,
          top: `${panelPadding}px`,
          bottom: `${panelPadding}px`,
        }}
      >
        <div 
          className="absolute top-0 -translate-y-full left-1/2 -translate-x-1/2 
                    w-0 h-0 
                    border-l-[6px] border-l-transparent 
                    border-r-[6px] border-r-transparent 
                    border-t-[8px] border-t-red-500" 
        />
        <div 
          className="absolute bottom-0 translate-y-full left-1/2 -translate-x-1/2 
                    w-0 h-0 
                    border-l-[6px] border-l-transparent 
                    border-r-[6px] border-r-transparent 
                    border-b-[8px] border-b-red-500" 
        />  
      </div>
    </section>
  );
};

export default AudioAnalysisPanel;
