import { useEffect } from 'react';

import useLibraryStore from '@/store/useLibraryStore';
import useEngineStore from '@/store/useEngineStore';
import useSessionStore from '@/store/useSessionStore';

const ENABLE_TEST_AUDIO_FIXTURES = import.meta.env.VITE_ENABLE_TEST_AUDIO_FIXTURES === '1';

type FixtureEntry = {
  song: string;
  trackId: number;
  filePath: string;
  startMs: number;
  index: number;
};

// /tests/data/<song>__tr-<trackId>__start-<startMs>__<index>.wav
// e.g. /tests/data/crazytrain.gp__tr-3__start-0__1.wav
const FIXTURE_FILENAME_REGEX = /^(.*?)__tr-(\d+)__start-(\d+)__(\d+)\.wav$/i;
const TEST_FIXTURE_PATHS = Object.keys(import.meta.glob('/tests/data/*.wav'))
  .map((fullPath) => fullPath.replace(/^\//, ''));

function parseFixtureFromPath(filePath: string): FixtureEntry | null {
  const fileName = filePath.split('/').pop();
  if (!fileName) return null;

  const match = fileName.match(FIXTURE_FILENAME_REGEX);
  if (!match) return null;

  return {
    song: match[1],
    trackId: Number(match[2]),
    filePath,
    startMs: Number(match[3]),
    index: Number(match[4]),
  };
}

function getFixtureCandidates(): FixtureEntry[] {
  return TEST_FIXTURE_PATHS
    .map((filePath) => parseFixtureFromPath(filePath))
    .filter((entry): entry is FixtureEntry => entry !== null);
}

function useTestAudioFixtures() {
  const { selectedSong, selectedTrackId } = useLibraryStore();
  const { endMs } = useEngineStore();
  const { setRecordedPaths } = useSessionStore();

  const selectionId = selectedTrackId === null
    ? null
    : `${selectedSong ?? 'no-song'}::${selectedTrackId}`;

  useEffect(() => {
    if (!ENABLE_TEST_AUDIO_FIXTURES) return;
    if (!selectedSong || selectedTrackId === null || !selectionId) return;

    const fixture = getFixtureCandidates()
      .filter((entry) => entry.song === selectedSong && entry.trackId === selectedTrackId)
      .sort((a, b) => b.index - a.index)[0];

    if (!fixture) return;

    setRecordedPaths((prev) => {
      if (prev[selectionId]) return prev;
      return {
        ...prev,
        [selectionId]: fixture.filePath,
      };
    });
  }, [
    selectedSong,
    selectedTrackId,
    selectionId,
    endMs,
    setRecordedPaths,
  ]);
}

export default useTestAudioFixtures;
