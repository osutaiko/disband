import { useRef } from "react";
import { useLibraryStore } from "@/store/useLibraryStore";
import { useSongMetadata } from "@/features/library/useSongMetadata";
import { useAlphaTab } from "@/features/engine/useAlphaTab";
import PlaybackHotkeys from "@/features/engine/PlaybackHotkeys";

import SongOverviewPanel from "@/features/library/SongOverviewPanel";
import LibraryPanel from "@/features/library/LibraryPanel";

import TabViewPanel from "@/features/engine/TabViewPanel";
import AudioAnalysisPanel from "@/features/session/AudioAnalysisPanel";  

import PlaybackControlPanel from "@/features/engine/PlaybackControlPanel";
import TrackMenuPanel from "@/features/tracks/TrackMenuPanel";
import OptionsPanel from "@/features/configuration/OptionsPanel";

const Shell = () => {
  useSongMetadata();
  
  const { selectedSong } = useLibraryStore();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { isTabLoading, currentMsRef } = useAlphaTab(containerRef, selectedSong);

  return (
    <div className="flex h-screen w-full overflow-hidden select-none">
      <PlaybackHotkeys />
      
      {/* Left Panel Group */}
      <aside className="w-80 flex flex-col border-r">
        <SongOverviewPanel />
        <LibraryPanel />
      </aside>

      {/* Center Panel (Tab & Recorder View) */}
      <main className="flex-1 flex flex-col">
        <TabViewPanel
          containerRef={containerRef}
          isTabLoading={isTabLoading}
        />
        <AudioAnalysisPanel
          currentMsRef={currentMsRef}
        />
      </main>

      {/* Right Panel Group */}
      <aside className="w-80 flex flex-col border-l">
        <PlaybackControlPanel />
        <TrackMenuPanel />
        <OptionsPanel />
      </aside>

    </div>
  )
};

export default Shell;
