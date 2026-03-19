/* eslint-disable no-param-reassign */
import useEngineStore from '@/store/useEngineStore';
import { AlphaTabApi, model } from '@coderline/alphatab';

export const handlePlayPause = (api: AlphaTabApi | null) => {
  if (!api || !api.isReadyForPlayback) return;
  api.playPause();
};

export const handleGotoStart = (api: AlphaTabApi | null) => {
  if (!api) return;

  if (api.playerState === 1) {
    api.pause();
  }
  api.timePosition = 0;
  api.scrollToCursor();
};

export const handleGotoEnd = (api: AlphaTabApi | null, endMs: number) => {
  if (!api) return;

  if (api.playerState === 1) {
    api.pause();
  }

  // TODO: jump to start of final bar instead
  api.timePosition = Math.max(0, endMs - 1);
  api.scrollToCursor();
};

const getFirstBeatFromBar = (bar: model.Bar | null) => {
  if (!bar) return null;

  const firstVoiceBeat = bar.voices[0]?.beats?.[0] ?? null;
  if (firstVoiceBeat) return firstVoiceBeat;

  const voiceWithBeats = bar.voices.find((voice: model.Voice) => voice.beats?.length);
  return voiceWithBeats?.beats?.[0] ?? null;
};

const handleGotoAdjacentBar = (
  api: AlphaTabApi | null,
  selectedTrackId: number | null,
  direction: 'previous' | 'next',
) => {
  if (!api || !api.tickCache) return;

  const trackId = selectedTrackId ?? 0;
  const lookup = api.tickCache.findBeat(new Set([trackId]), api.tickPosition);
  if (!lookup?.beat) return;

  const currentBar = lookup.beat.voice.bar;
  const targetBar = direction === 'previous' ? currentBar.previousBar : currentBar.nextBar;
  const targetBeat = getFirstBeatFromBar(targetBar);
  if (!targetBeat) return;

  api.tickPosition = api.tickCache.getBeatStart(targetBeat);
  api.scrollToCursor();
};

export const handleGotoPreviousBar = (api: AlphaTabApi | null, selectedTrackId: number | null) => {
  handleGotoAdjacentBar(api, selectedTrackId, 'previous');
};

export const handleGotoNextBar = (api: AlphaTabApi | null, selectedTrackId: number | null) => {
  handleGotoAdjacentBar(api, selectedTrackId, 'next');
};

export const handleSpeedChange = (speed: number) => {
  if (!Number.isFinite(speed)) return;

  const { setPlaybackSpeed } = useEngineStore.getState();
  const clampedPercent = Math.min(400, Math.max(20, speed));
  const playbackSpeed = clampedPercent / 100;

  setPlaybackSpeed(playbackSpeed);
};
