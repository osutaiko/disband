import { useMemo } from "react";
import { useLibraryStore } from "@/store/useLibraryStore";
import BarMarker from "./BarMarker";
import QuarterBarMarker from "./QuarterBarMarker";
import NoteMarker from "./NoteMarker";

const AudioAnalysisPanel = () => {
  const { api, selectedTrackId, currentTime, endTime } = useLibraryStore();

  const pxPerMs = 0.25;
  const playheadOffset = 200;

  // Panel padding "p-6"
  const panelPadding = 24;

  // Padding before/after time=0
  const trackStartPadding = 1000;
  const totalTrackWidth = endTime * pxPerMs + (2 * trackStartPadding);

  const { noteMarkers, barMarkers, quarterBarMarkers } = useMemo(() => {
    if (!api?.score) return [];
    const currentTrack = api.score.tracks[selectedTrackId ?? 0];
    const noteMarkers: { timestamp: number; length: number }[] = [];

    const barMarkers: { index: number, timestamp: number }[] = [];
    const quarterBarMarkers: { timestamp: number }[] = [];
    
    // TODO: Account for tempo changes
    let currentTempo = api.score.tempo;
    const PPQ = 960;
    const msPerTick = 60000 / (currentTempo * PPQ);

    let barIndex = 1;
    let tick = 0;

    const beatsPerBar = api.score.timeSignature?.beats ?? 4;
    const beatUnit = api.score.timeSignature?.beatType ?? 4;
    const ticksPerBeat = PPQ * (4 / beatUnit);
    const ticksPerBar = ticksPerBeat * beatsPerBar;
    const endTick = endTime / msPerTick;
    
    // Note markers
    currentTrack.staves.forEach((staff) => {
      staff.bars.forEach((bar) => {
        bar.voices.forEach((voice) => {
          voice.beats.forEach((beat) => {
            if (!beat.isRest) { 
              noteMarkers.push({
                timestamp: beat.absolutePlaybackStart * msPerTick,
                length: beat.playbackDuration * msPerTick,
              });
            }
          });
        });
      });
    });

    while (tick <= endTick) {
      const timeMs = tick * msPerTick;

      // Bar marker
      barMarkers.push({
        index: barIndex,
        timestamp: timeMs,
      });

      // Quarter bar marker
      for (let b = 0; b < beatsPerBar; b++) {
        const beatTick = tick + b * ticksPerBeat;
        if (beatTick >= endTick) break;

        quarterBarMarkers.push({
          timestamp: beatTick * msPerTick,
        });
      }

      tick += ticksPerBar;
      barIndex++;
    }
    
    return { noteMarkers, barMarkers, quarterBarMarkers };
  }, [api, selectedTrackId]);

  const currentTranslation = playheadOffset - (currentTime * pxPerMs + trackStartPadding + panelPadding);

  if (!api || selectedTrackId === null) return null;

  return (
    <section
      className="h-min border-t bg-background relative overflow-hidden"
      style={{ padding: `${panelPadding}px` }}
    >
      <div className="relative mask-x-from-90% h-40 w-full overflow-hidden">
        <div 
          className="absolute top-0 h-full flex flex-col gap-2 will-change-transform"
          style={{ 
            width: `${totalTrackWidth}px`,
            transform: `translateX(${currentTranslation}px)`,
          }}
        >
          <div className="w-full h-[20px]"></div>

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
          
          {/* Reference Lane */}
          <div className="relative w-full h-1/3 bg-secondary z-20">
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
          <div className="w-full h-2/3 bg-secondary/50 z-20">
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
