import { useMemo } from "react";

export const useAudioAnalysisMarkers = (api, selectedTrackId, endMs) => {
  return useMemo(() => {
    if (!api?.score) return [];
    const currentTrack = api.score.tracks[selectedTrackId ?? 0];

    const noteMarkers: { timestamp: number; length: number }[] = [];
    const barMarkers: { index: number, timestamp: number }[] = [];
    const quarterBarMarkers: { timestamp: number }[] = [];

    const PPQ = 960;
    
    let currentBpm = api.score.tempo ?? 120;
    let msPerTick = 60000 / (currentBpm * PPQ);
    let currentBarStartMs = 0;

    // Note markers
    currentTrack.staves.forEach((staff) => {
      staff.bars.forEach((bar) => {
        bar.masterBar.tempoAutomations.forEach((tempoAutomation) => {{
          currentBpm = tempoAutomation.value;
          msPerTick = 60000 / (currentBpm * PPQ);
        }});

        // Bar markers
        barMarkers.push({
          index: bar.masterBar.index + 1,
          timestamp: currentBarStartMs,
        });

        const quarterNotesPerBar = (bar.masterBar.timeSignatureNumerator / bar.masterBar.timeSignatureDenominator * 4)

        // Quarter bar markers
        for (let i = 1; i <= quarterNotesPerBar; i++) {
          quarterBarMarkers.push({
            timestamp: currentBarStartMs + i * PPQ * msPerTick,
          })
        }

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
        
        currentBarStartMs += quarterNotesPerBar * PPQ * msPerTick;
      });
    });

    return { noteMarkers, barMarkers, quarterBarMarkers };
  }, [api, selectedTrackId]);
};
