/* eslint-disable no-param-reassign */
import { AlphaTabApi } from '@coderline/alphatab';

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
};

export const handleGotoEnd = (api: AlphaTabApi | null, endMs: number) => {
  if (!api) return;

  if (api.playerState === 1) {
    api.pause();
  }

  // TODO: jump to start of final bar instead
  api.timePosition = Math.max(0, endMs - 1);
};
