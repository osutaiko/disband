import { useMemo } from "react";
import { AlphaTabApi } from "@coderline/alphatab";

export const useAudioAnalysisMarkers = (
  api: AlphaTabApi | null,
  selectedTrackId: number | null,
 ) => {
  return useMemo(() => {
    if (!api?.score) return { noteMarkers: [], barMarkers: [], quarterBarMarkers: [], sixteenthBarMarkers: [] };

    const currentTrack = api.score.tracks[selectedTrackId ?? 0];

    const noteMarkers: { timestamp: number; length: number }[] = [];
    const barMarkers: { index: number, timestamp: number }[] = [];
    const quarterBarMarkers: { timestamp: number }[] = [];
    const sixteenthBarMarkers: { timestamp: number }[] = [];

    const PPQ = 960;
    
    let currentBpm = 0;
    let msPerTick = 0;
    let currentBarStartMs = 0;

    let anacrusisShiftMs = 0;

    // Note markers
    currentTrack.staves.forEach((staff) => {
      staff.bars.forEach((bar) => {
        bar.masterBar.tempoAutomations.forEach((tempoAutomation) => {{
          currentBpm = tempoAutomation.value;
          msPerTick = 60000 / (currentBpm * PPQ);
        }});

        if (bar.masterBar.isAnacrusis) {
          anacrusisShiftMs = bar.masterBar.calculateDuration(true) * msPerTick;
        }

        // Bar markers
        barMarkers.push({
          index: bar.masterBar.index + 1,
          timestamp: currentBarStartMs,
        });

        const quarterNotesPerBar = (bar.masterBar.timeSignatureNumerator / bar.masterBar.timeSignatureDenominator * 4)

        // Quarter bar markers
        for (let i = 1; i < quarterNotesPerBar; i++) {
          quarterBarMarkers.push({
            timestamp: currentBarStartMs + i * PPQ * msPerTick,
          })
        }

        for (let i = 1; i < quarterNotesPerBar * 4; i++) {
          sixteenthBarMarkers.push({
            timestamp: currentBarStartMs + i * (PPQ / 4) * msPerTick,
          })
        }

        bar.voices.forEach((voice) => {
          voice.beats.forEach((beat) => {
            if (!beat.isRest) { 
              noteMarkers.push({
                timestamp: currentBarStartMs + beat.playbackStart * msPerTick,
                length: beat.playbackDuration * msPerTick,
              });
            }
          });
        });
        
        currentBarStartMs += bar.masterBar.calculateDuration(true) * msPerTick;
      });
    });

    return { noteMarkers, barMarkers, quarterBarMarkers, sixteenthBarMarkers };
  }, [api, selectedTrackId]);
};
