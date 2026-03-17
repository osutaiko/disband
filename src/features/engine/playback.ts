/* eslint-disable no-param-reassign */
import useEngineStore from '@/store/useEngineStore';
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

export const handleSpeedChange = (api: AlphaTabApi | null, speed: number) => {
  if (!Number.isFinite(speed)) return;

  const { setPlaybackSpeed } = useEngineStore.getState();
  const clampedPercent = Math.min(400, Math.max(20, speed));
  const playbackSpeed = clampedPercent / 100;

  if (api) {
    api.playbackSpeed = playbackSpeed;
  }
  setPlaybackSpeed(playbackSpeed);
};
