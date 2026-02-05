import { useMemo } from "react";

export const useAudioAnalysisMarkers = (api, selectedTrackId, endMs) => {
  return useMemo(() => {
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
    const endTick = endMs / msPerTick;
    
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
};
