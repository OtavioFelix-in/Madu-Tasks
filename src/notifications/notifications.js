// Lembretes locais com expo-notifications — não precisa de servidor.
//
// IMPORTANTE: no Expo Go (Android, SDK 53+) o módulo expo-notifications quebra
// só de ser importado. Por isso o require é condicional: dentro do Expo Go os
// lembretes ficam desativados; no APK/build de desenvolvimento funcionam normal.

import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { formatDateTime } from '../utils/date';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications = null;
if (!isExpoGo) {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function setupNotifications() {
  if (!Notifications) {
    console.log('Expo Go: lembretes desativados (funcionam no APK final).');
    return false;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('lembretes', {
      name: 'Lembretes de tarefas',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleAt(date, title, body) {
  if (!Notifications || date <= new Date()) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: 'lembretes',
    },
  });
}

// Agenda o lembrete da tarefa X minutos antes do prazo (escolha da usuária).
// Se esse momento já passou, não agenda nada.
export async function scheduleTaskReminder(title, typeLabel, dueDate, remindMinutes) {
  const remindAt = new Date(dueDate.getTime() - remindMinutes * 60 * 1000);
  return scheduleAt(
    remindAt,
    `${typeLabel} chegando! 💖`,
    `"${title}" vence ${formatDateTime(dueDate)}. Você consegue!`
  );
}

// Avisa quando o ciclo do Pomodoro termina (mesmo com o app em segundo plano).
export async function schedulePomodoroEnd(endsAt, isBreak) {
  return scheduleAt(
    endsAt,
    isBreak ? 'Pausa encerrada! 🍅' : 'Foco concluído! 🎉',
    isBreak ? 'Bora voltar pros estudos?' : 'Você merece 5 minutinhos de pausa.'
  );
}

export async function cancelReminder(notificationId) {
  if (Notifications && notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }
}
