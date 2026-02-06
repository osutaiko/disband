export const handlePlayPause = (api: any, isPlaying: boolean) => {
  if (!api || !api.isReadyForPlayback) return;
  isPlaying ? api.pause() : api.play();
};

export const handleGotoStart = (api: any) => {
  if (!api) return;
  if (api.playerState === 1) {
    api.pause();
  }
  api.timePosition = 0;
};

export const handleGotoEnd = (api: any, endMs: number) => {
  if (!api) return;
  if (api.playerState === 1) {
    api.pause();
  }
  api.timePosition = endMs;
};
