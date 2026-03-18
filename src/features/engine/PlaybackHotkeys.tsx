import { useEffect } from 'react';
import {
  handleGotoEnd, handleGotoNextBar, handleGotoPreviousBar, handleGotoStart, handlePlayPause,
} from './playback';

import useLibraryStore from '@/store/useLibraryStore';
import useEngineStore from '@/store/useEngineStore';

function PlaybackHotkeys() {
  const { selectedTrackId } = useLibraryStore();
  const { api, endMs } = useEngineStore();

  useEffect(() => {
    const offPlayPause = window.electron.onPlaybackPlayPauseMenu(() => {
      handlePlayPause(api);
    });
    const offGotoStart = window.electron.onPlaybackGotoStartMenu(() => {
      handleGotoStart(api);
    });
    const offGotoEnd = window.electron.onPlaybackGotoEndMenu(() => {
      handleGotoEnd(api, endMs);
    });

    return () => {
      offPlayPause();
      offGotoStart();
      offGotoEnd();
    };
  }, [api, endMs]);

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

      if (e.code === 'ArrowUp') {
        e.preventDefault();
        handleGotoPreviousBar(api, selectedTrackId);
      }
      
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        handleGotoNextBar(api, selectedTrackId);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [api, selectedTrackId]);

  return null;
}

export default PlaybackHotkeys;
