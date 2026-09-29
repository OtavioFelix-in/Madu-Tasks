import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import TabBar from './src/components/TabBar';
import PomodoroBanner from './src/components/PomodoroBanner';
import { initDatabase } from './src/db/database';
import { setupNotifications } from './src/notifications/notifications';
import { initPomodoro } from './src/pomodoro/pomodoro-store';
import CalendarScreen from './src/screens/CalendarScreen';
import HomeScreen from './src/screens/HomeScreen';
import PomodoroScreen from './src/screens/PomodoroScreen';
import StatsScreen from './src/screens/StatsScreen';
import { syncNow } from './src/sync/sync';
import { ThemeProvider, useTheme } from './src/theme-context';
import { writeWidgetSnapshot } from './src/widget/widget';

// O banco precisa existir antes de qualquer tela (ou o tema) consultar.
initDatabase();
// O timer do Pomodoro vive fora das telas: precisa iniciar aqui, não na aba.
initPomodoro();

const SCREENS = {
  tasks: HomeScreen,
  calendar: CalendarScreen,
  pomodoro: PomodoroScreen,
  stats: StatsScreen,
};

function Root() {
  const { colors, isDark } = useTheme();
  const [tab, setTab] = useState('tasks');

  useEffect(() => {
    setupNotifications();
    syncNow()
      .catch(() => {}) // sincroniza na abertura, se logada e com internet
      .finally(writeWidgetSnapshot);

    // Ao sair do app, deixa o widget da tela inicial com os dados de agora.
    writeWidgetSnapshot();
    const sub = AppState.addEventListener('change', (status) => {
      if (status !== 'active') writeWidgetSnapshot();
    });
    return () => sub.remove();
  }, []);

  // Só a aba ativa é renderizada: ao trocar, a tela remonta e recarrega
  // os dados do banco — calendário e resumo sempre atualizados.
  const Screen = SCREENS[tab];

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'bottom']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>
        <Screen />
      </View>
      {tab !== 'pomodoro' ? <PomodoroBanner onPress={() => setTab('pomodoro')} /> : null}
      <TabBar active={tab} onChange={setTab} />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
