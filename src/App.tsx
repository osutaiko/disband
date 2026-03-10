import Shell from '@/components/layout/Shell';
import SettingsWindow from '@/features/configuration/SettingsWindow';

function App() {
  const params = new URLSearchParams(window.location.search);
  const windowType = params.get('window');

  if (windowType === 'settings') {
    return <SettingsWindow />;
  }

  return (
    <Shell />
  );
}

export default App;
