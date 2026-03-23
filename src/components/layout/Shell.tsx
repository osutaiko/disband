import { useRef } from 'react';
import useSongMetadata from '@/features/library/useSongMetadata';
import useLibraryStore from '@/store/useLibraryStore';
import useAlphaTab from '@/features/engine/useAlphaTab';
import PlaybackHotkeys from '@/features/engine/PlaybackHotkeys';

import SongOverviewPanel from '@/features/library/SongOverviewPanel';
import LibraryPanel from '@/features/library/LibraryPanel';
import SessionPanel from '@/features/timeline/session/SessionPanel';

import TabViewPanel from '@/features/engine/TabViewPanel';
import TimelinePanel from '@/features/timeline/TimelinePanel';
import useTestAudioFixtures from '@/features/timeline/session/useTestAudioFixtures';

import PlaybackControlPanel from '@/features/engine/PlaybackControlPanel';
import TrackMenuPanel from '@/features/tracks/TrackMenuPanel';

/**
 * Global app layout.
 */ 
function Shell() {
  // Run loadAllMetadata() on initial mount
  useSongMetadata();

  // Load test fixtures when in test mode env:VITE_ENABLE_TEST_AUDIO_FIXTURES='1'
  useTestAudioFixtures();

  const { selectedSong } = useLibraryStore();

  // Container passed to AlphaTab rendering
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { isTabLoading, currentMsRef } = useAlphaTab(containerRef, selectedSong);

  return (
    <div className="flex h-screen w-full overflow-hidden select-none">
      <PlaybackHotkeys />

      {/* Left Panel Group (1-dimensional Song/Track Navigation) */}
      <aside className="w-80 shrink-0 flex flex-col border-r divide-y">
        <SongOverviewPanel />
        <LibraryPanel />
        <TrackMenuPanel />
      </aside>

      {/* Center Panel (Visualizations) */}
      <main className="flex-1 min-w-0 flex flex-col">
        <TabViewPanel
          containerRef={containerRef}
          isTabLoading={isTabLoading}
        />
        <TimelinePanel
          currentMsRef={currentMsRef}
        />
      </main>

      {/* Right Panel Group (Analysis Session Data) */}
      <aside className="w-80 shrink-0 flex flex-col border-l divide-y">
        <PlaybackControlPanel />
        <SessionPanel />
      </aside>
    </div>
  );
}

export default Shell;
