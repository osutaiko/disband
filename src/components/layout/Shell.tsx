import SongOverview from "@/features/library/SongOverviewPanel"
import SongSelector from "@/features/library/SongSelectorPanel"

import TabView from "@/features/engine/TabViewPanel"
import Recorder from "@/features/session/AudioAnalysisPanel"  

import PlaybackControls from "@/features/engine/PlaybackControlsPanel"
import TrackMenu from "@/features/tracks/TrackMenuPanel"
import OptionsPanel from "@/features/configuration/OptionsPanel"

const Shell = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden select-none">
      
      {/* Left Panel Group */}
      <aside className="w-80 flex flex-col border-r">
        <SongOverview />
        <SongSelector />
      </aside>

      {/* Center Panel (Tab & Recorder View) */}
      <main className="flex-1 flex flex-col">
        <TabView />
        <Recorder />
      </main>

      {/* Right Panel Group */}
      <aside className="w-80 flex flex-col border-l">
        <PlaybackControls />
        <TrackMenu />
        <OptionsPanel />
      </aside>

    </div>
  )
};

export default Shell;
