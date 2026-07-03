// Tela principal: lista de tarefas + botão flutuante para adicionar.

import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import TaskForm from '../components/TaskForm';
import TaskItem from '../components/TaskItem';
import * as db from '../db/database';
import {
  cancelReminder,
  scheduleTaskReminder,
  setupNotifications,
} from '../notifications/notifications';
import { colors, taskTypes } from '../theme';

export default function HomeScreen() {
  const [tasks, setTasks] = useState([]);
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    db.initDatabase();
    setupNotifications();
    refresh();
  }, []);

  function refresh() {
    setTasks(db.getTasks());
  }

  async function handleSave({ title, type, subject, dueDate }) {
    const notificationId = await scheduleTaskReminder(title, taskTypes[type].label, dueDate);
    db.addTask({
      title,
      type,
      subject: subject || null,
      dueDate: dueDate.toISOString(),
      notificationId,
    });
    setFormVisible(false);
    refresh();
  }

  async function handleToggle(task) {
    const nowDone = task.done !== 1;
    if (nowDone) {
      await cancelReminder(task.notification_id);
    }
    db.setTaskDone(task.id, nowDone);
    refresh();
  }

  function handleDelete(task) {
    Alert.alert('Apagar tarefa', `Quer mesmo apagar "${task.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          await cancelReminder(task.notification_id);
          db.deleteTask(task.id);
          refresh();
        },
      },
    ]);
  }

  const pendingCount = tasks.filter((t) => t.done === 0).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>MaduTasks 💖</Text>
        <Text style={styles.subtitle}>
          {pendingCount === 0
            ? 'Tudo em dia, arrasou! 🎉'
            : `${pendingCount} ${pendingCount === 1 ? 'tarefa pendente' : 'tarefas pendentes'}`}
        </Text>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TaskItem task={item} onToggle={handleToggle} onDelete={handleDelete} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌸</Text>
            <Text style={styles.emptyText}>Nenhuma tarefa ainda.</Text>
            <Text style={styles.emptyHint}>Toque no + para adicionar a primeira!</Text>
          </View>
        }
      />

      <Pressable style={styles.fab} onPress={() => setFormVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <TaskForm
        visible={formVisible}
        onSave={handleSave}
        onClose={() => setFormVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  list: {
    paddingBottom: 100,
  },
  empty: {
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: {
    color: '#fff',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '600',
  },
});
