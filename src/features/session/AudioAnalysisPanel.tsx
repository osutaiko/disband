import { useMemo } from "react";
import { useLibraryStore } from "@/store/useLibraryStore";

const NoteMarker = ({
  timestamp,
  length,
  offsetBase,
  pxPerMs,
}: {
  timestamp: number;
  length: number;
  offsetBase: number;
  pxPerMs: number;
}) => {
  const left = timestamp * pxPerMs + offsetBase;
  const width = Math.max(length * pxPerMs, 4);

  return (
    <div
      className="absolute h-full border-l-4 border-primary bg-primary/50 rounded-r-md"
      style={{
        left: `${left}px`,
        width: `${width}px`,
      }}
    />
  )
}

const AudioAnalysisPanel = () => {
  const { api, selectedTrackId, currentTime, endTime } = useLibraryStore();

  const pxPerMs = 0.15;
  const playheadOffset = 100;

  // Panel padding "p-4"
  const panelPadding = 16;

  // Padding before/after time=0
  const trackStartPadding = 1000;
  const totalTrackWidth = endTime * pxPerMs + (2 * trackStartPadding);

  const markers = useMemo(() => {
    if (!api?.score) return [];
    const currentTrack = api.score.tracks[selectedTrackId ?? 0];
    const events: { time: number; length: number }[] = [];
    
    // TODO: Account for tempo changes
    let currentTempo = api.score.tempo;
    const PPQ = 960;
    const msPerTick = 60000 / (currentTempo * PPQ);

    currentTrack.staves.forEach((staff) => {
      staff.bars.forEach((bar) => {
        bar.voices.forEach((voice) => {
          voice.beats.forEach((beat) => {
            if (!beat.isRest) { 
              events.push({
                time: beat.absolutePlaybackStart * msPerTick,
                length: beat.playbackDuration * msPerTick,
              });
            }
          });
        });
      });
    });
    return events;
  }, [api, selectedTrackId]);

  const currentTranslation = playheadOffset - (currentTime * pxPerMs + trackStartPadding + panelPadding);

  if (!api || selectedTrackId === null) return null;

  return (
    <section
      className="h-min border-t bg-background relative overflow-hidden"
      style={{ padding: `${panelPadding}px` }}
    >
      {/* Playhead */}
      <div className={`absolute top-4 bottom-4 w-[1px] bg-red-500 z-20 shadow-[0_0_15px_red]`} style={{ left: `${playheadOffset}px` }} />
      
      <div className="relative h-48 w-full overflow-hidden">
        <div 
          className="absolute top-0 h-full flex flex-col gap-2 will-change-transform"
          style={{ 
            width: `${totalTrackWidth}px`,
            transform: `translateX(${currentTranslation}px)`,
          }}
        >
          {/* Reference Lane */}
          <div className="relative w-full h-10 bg-secondary">
            {markers.map((marker, index) => (
              <NoteMarker 
                key={index}
                timestamp={marker.time}
                length={marker.length}
                offsetBase={trackStartPadding}
                pxPerMs={pxPerMs}
              />
            ))}
          </div>
          
          {/* Recorded Audio */}
          <div className="w-full h-20 bg-secondary/50 border border-dashed flex items-center justify-center">
          </div>
        </div>
      </div>
    </section>
  );
};

export default AudioAnalysisPanel;
