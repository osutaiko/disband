import { useEffect } from 'react';
import Shell from '@/components/layout/Shell';
import { ColorThemeProvider } from '@/components/ui/color-theme-provider';

import SettingsWindow from '@/features/configuration/SettingsWindow';
import useConfigStore from '@/store/useConfigStore';

function App() {
  const hydrate = useConfigStore((state) => state.hydrate);
  const hydrated = useConfigStore((state) => state.hydrated);

  useEffect(() => {
    hydrate().catch(() => {});
  }, [hydrate]);

  const params = new URLSearchParams(window.location.search);
  const windowType = params.get('window');

  if (!hydrated) {
    return null;
  }

  if (windowType === 'settings') {
    return (
      <ColorThemeProvider defaultColorTheme="dark" storageKey="vite-ui-theme">
        <SettingsWindow />
      </ColorThemeProvider>
    );
  }

  return (
    <ColorThemeProvider defaultColorTheme="dark" storageKey="vite-ui-theme">
      <Shell />
    </ColorThemeProvider>
  );
}

export default App;
