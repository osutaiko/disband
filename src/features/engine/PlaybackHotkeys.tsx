import { useEffect } from 'react';
import useLibraryStore from '@/store/useLibraryStore';
import { handlePlayPause } from './playback';

function PlaybackHotkeys() {
  const { api, selectedTrackId } = useLibraryStore();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!api || !api.isReadyForPlayback) return;
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || target?.isContentEditable) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayPause(api);
        return;
      }

      if (!api.tickCache) return;
      const trackId = selectedTrackId ?? 0;
      const lookup = api.tickCache.findBeat(new Set([trackId]), api.tickPosition);
      if (!lookup?.beat) return;

      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const prev = lookup.beat.previousBeat;
        if (!prev) return;
        api.tickPosition = api.tickCache.getBeatStart(prev);
        api.scrollToCursor();
        return;
      }

      if (e.code === 'ArrowRight') {
        e.preventDefault();
        const next = lookup.beat.nextBeat;
        if (!next) return;
        api.tickPosition = api.tickCache.getBeatStart(next);
        api.scrollToCursor();
        return;
      }

      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
        const currentBar = lookup.beat.voice.bar;
        const nextBar = e.code === 'ArrowUp' ? currentBar.previousBar : currentBar.nextBar;
        if (!nextBar) return;
        let targetBeat = nextBar.voices[0]?.beats?.[0] ?? null;
        if (!targetBeat) {
          for (const voice of nextBar.voices) {
            if (voice.beats?.length) {
              targetBeat = voice.beats[0];
              break;
            }
          }
        }
        if (!targetBeat) return;
        api.tickPosition = api.tickCache.getBeatStart(targetBeat);
        api.scrollToCursor();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [api, selectedTrackId]);

  return null;
}

export default PlaybackHotkeys;
