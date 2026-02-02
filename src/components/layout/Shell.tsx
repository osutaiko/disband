import SongOverview from "@/features/library/SongOverview"
import SongSelector from "@/features/library/SongSelector"

import TabView from "@/features/engine/TabView"
import Recorder from "@/features/session/Recorder"  

import PlaybackControls from "@/features/engine/PlaybackControls"
import TrackMenu from "@/features/mixing/TrackMenu"
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