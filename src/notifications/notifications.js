// Lembretes locais com expo-notifications — não precisa de servidor.
// Regra: avisa 1 dia antes do prazo; se já faltar menos que isso, avisa 1 hora antes.
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

export async function scheduleTaskReminder(title, typeLabel, dueDate) {
  if (!Notifications) return null;

  const now = new Date();
  const oneDayBefore = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
  const oneHourBefore = new Date(dueDate.getTime() - 60 * 60 * 1000);

  let remindAt = null;
  if (oneDayBefore > now) {
    remindAt = oneDayBefore;
  } else if (oneHourBefore > now) {
    remindAt = oneHourBefore;
  }
  if (!remindAt) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `${typeLabel} chegando! 💖`,
      body: `"${title}" vence ${formatDateTime(dueDate)}. Você consegue!`,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: remindAt,
      channelId: 'lembretes',
    },
  });
}

export async function cancelReminder(notificationId) {
  if (Notifications && notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }
}
