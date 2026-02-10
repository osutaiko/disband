import { useMemo } from "react";
import { AlphaTabApi } from "@coderline/alphatab";

export const useAudioAnalysisMarkers = (
  api: AlphaTabApi | null,
  selectedTrackId: number | null
) => {
  // MasterBars in actual playback order
  const getPlaybackMasterBars = (score) => {
    const result: any[] = [];
    const repeatCounters = new Map<any, number>();

    for (let i = 0; i < score.masterBars.length; i++) {
      const mb = score.masterBars[i];
      result.push(mb);

      const group = mb.repeatGroup;
      if (!group) continue;

      // Handle repeat close
      if (group.isClosed && group.closings?.includes(mb)) {
        const count = repeatCounters.get(group) ?? 0;

        if (count < (group.repeatCount ?? 1)) {
          repeatCounters.set(group, count + 1);

          // Loop back to opening bar
          i = score.masterBars.indexOf(group.opening) - 1;
        }
      }
    }

    return result;
  };


  return useMemo(() => {
    if (!api?.score) return { noteMarkers: [], barMarkers: [], quarterBarMarkers: [], sixteenthBarMarkers: [] };

    const currentTrack = api.score.tracks[selectedTrackId ?? 0];

    const noteMarkers: { timestamp: number, length: number }[] = [];
    const barMarkers: { index: number, timestamp: number }[] = [];
    const quarterBarMarkers: { timestamp: number }[] = [];
    const sixteenthBarMarkers: { timestamp: number }[] = [];

    const PPQ = 960;
    
    let currentBpm = 0;
    let msPerTick = 0;
    let currentBarStartMs = 0;

    const playbackMasterBars = getPlaybackMasterBars(api.score);

    console.log(playbackMasterBars.map((mb) => mb.index))

    playbackMasterBars.forEach((masterBar) => {
      const bar = currentTrack.staves[0].bars.find(
        b => b.masterBar === masterBar
      );
      
      if (!bar) return;

      bar.masterBar.tempoAutomations.forEach((tempoAutomation) => {{
        currentBpm = tempoAutomation.value;
        msPerTick = 60000 / (currentBpm * PPQ);
      }});

      // --- Bar markers ---
      barMarkers.push({
        index: bar.masterBar.index + 1,
        timestamp: currentBarStartMs,
      });

      const quarterNotesPerBar = (bar.masterBar.timeSignatureNumerator / bar.masterBar.timeSignatureDenominator * 4)

      // --- Quarter note bar markers ---
      for (let i = 1; i < quarterNotesPerBar; i++) {
        quarterBarMarkers.push({
          timestamp: currentBarStartMs + i * PPQ * msPerTick,
        })
      }
    
      // --- Sixteenth note bar markers ---
      for (let i = 1; i < quarterNotesPerBar * 4; i++) {
        sixteenthBarMarkers.push({
          timestamp: currentBarStartMs + i * (PPQ / 4) * msPerTick,
        })
      }

      // --- Note markers ---
      bar.voices.forEach((voice) => {
        voice.beats.forEach((beat) => {
          if (beat.isRest) return;

          beat.notes.forEach((note) => {
            // Skip tied notes on destination
            if (note.isTieDestination) return;

            let totalDuration = beat.playbackDuration;
            let tiedNote = note.tieDestination;

            // Through tie group
            while (tiedNote) {
              totalDuration += tiedNote.beat.playbackDuration;
              tiedNote = tiedNote.tieDestination;
            }

            noteMarkers.push({
              timestamp: currentBarStartMs + beat.playbackStart * msPerTick,
              length: totalDuration * msPerTick,
            });
          });
        });
      });
      
      currentBarStartMs += bar.masterBar.calculateDuration(true) * msPerTick;
    });

    return { noteMarkers, barMarkers, quarterBarMarkers, sixteenthBarMarkers };
  }, [api, selectedTrackId]);
};
