import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import TabBar from './src/components/TabBar';
import { initDatabase } from './src/db/database';
import { setupNotifications } from './src/notifications/notifications';
import CalendarScreen from './src/screens/CalendarScreen';
import HomeScreen from './src/screens/HomeScreen';
import PomodoroScreen from './src/screens/PomodoroScreen';
import StatsScreen from './src/screens/StatsScreen';
import { colors } from './src/theme';

// O banco precisa existir antes de qualquer tela consultar.
initDatabase();

const SCREENS = {
  tasks: HomeScreen,
  calendar: CalendarScreen,
  pomodoro: PomodoroScreen,
  stats: StatsScreen,
};

export default function App() {
  const [tab, setTab] = useState('tasks');

  useEffect(() => {
    setupNotifications();
  }, []);

  // Só a aba ativa é renderizada: ao trocar, a tela remonta e recarrega
  // os dados do banco — calendário e resumo sempre atualizados.
  const Screen = SCREENS[tab];

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background }}
        edges={['top', 'bottom']}
      >
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>
          <Screen />
        </View>
        <TabBar active={tab} onChange={setTab} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
