import { useEffect } from 'react';
import Shell from '@/components/layout/Shell';
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
    return <SettingsWindow />;
  }

  return (
    <Shell />
  );
}

export default App;
