import { useMemo } from 'react';
import { AlphaTabApi, model } from '@coderline/alphatab';

const useAudioAnalysisMarkers = (
  api: AlphaTabApi | null,
  selectedTrackId: number | null,
) => useMemo(() => {
  if (!api?.score) return { noteMarkers: [], barMarkers: [] };

  const isBarActiveForRepeat = (mb: model.MasterBar, repeatIndex: number) => {
    if (!mb.alternateEndings || mb.alternateEndings === 0) return true;

    // eslint-disable-next-line
      return (mb.alternateEndings & (1 << repeatIndex)) !== 0;
  };

  // MasterBars in actual playback order
  const getPlaybackMasterBars = (score: model.Score) => {
    const result: any[] = [];
    const repeatCounters = new Map<any, number>();

    for (let i = 0; i < score.masterBars.length; i++) {
      const mb = score.masterBars[i];
      const group = mb.repeatGroup;

      let repeatIndex = 0;
      if (group) {
        repeatIndex = repeatCounters.get(group) ?? 0;
      }

      // For this repeat pass:
      if (isBarActiveForRepeat(mb, repeatIndex)) {
        result.push(mb);

        // Handle repeat close
        if (group.opening && group.isClosed && group.closings.includes(mb)) {
          const maxRepeats = mb.repeatCount ?? 1;

          if (repeatIndex < maxRepeats - 1) {
            repeatCounters.set(group, repeatIndex + 1);

            // jump back to opening bar
            i = score.masterBars.indexOf(group.opening) - 1;
          }
        }
      }
    }

    return result;
  };

  const currentTrack = api.score.tracks[selectedTrackId ?? 0];

  const noteMarkers: { timestamp: number, length: number, midi: number }[] = [];
  const barMarkers: {
    variant: 'score-start' | 'score-end' | 'whole' | 'quarter' | 'sixteenth', timestamp: number
  }[] = [];

  const PPQ = 960;

  let currentBpm = 0;
  let msPerTick = 0;
  let currentBarStartMs = 0;

  const playbackMasterBars = getPlaybackMasterBars(api.score);

  barMarkers.push({
    variant: 'score-start',
    timestamp: 0,
  }, {
    variant: 'score-end',
    timestamp: api.endTime,
  });

  playbackMasterBars.forEach((masterBar) => {
    const bar = currentTrack.staves[0].bars.find(
      (b) => b.masterBar === masterBar,
    );

    if (!bar) return;

    bar.masterBar.tempoAutomations.forEach((tempoAutomation) => {
      currentBpm = tempoAutomation.value;
      msPerTick = 60000 / (currentBpm * PPQ);
    });

    // --- Bar markers ---
    if (currentBarStartMs > 0) {
      barMarkers.push({
        variant: 'whole',
        timestamp: currentBarStartMs,
      });
    }

    const quarterNotesPerBar = (bar.masterBar.timeSignatureNumerator
        / bar.masterBar.timeSignatureDenominator)
        * 4;

    // --- Quarter note bar markers ---
    for (let i = 1; i < quarterNotesPerBar; i++) {
      barMarkers.push({
        variant: 'quarter',
        timestamp: currentBarStartMs + i * PPQ * msPerTick,
      });
    }

    // --- Sixteenth note bar markers ---
    for (let i = 1; i < quarterNotesPerBar * 4; i++) {
      barMarkers.push({
        variant: 'sixteenth',
        timestamp: currentBarStartMs + i * (PPQ / 4) * msPerTick,
      });
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

          // Handle staccato note length
          if (note.isStaccato) {
            totalDuration /= 2;
          }

          noteMarkers.push({
            timestamp: currentBarStartMs + beat.playbackStart * msPerTick,
            length: totalDuration * msPerTick,
            midi: note.calculateRealValue(true, true),
          });
        });
      });
    });

    currentBarStartMs += bar.masterBar.calculateDuration(true) * msPerTick;
  });

  return { noteMarkers, barMarkers };
}, [api, selectedTrackId]);

export default useAudioAnalysisMarkers;
