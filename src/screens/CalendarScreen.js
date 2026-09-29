// Calendário do mês: bolinhas nos dias com tarefa (na cor da matéria),
// toque no dia lista as tarefas embaixo.

import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { clearAttachments } from '../attachments/attachments';
import TaskItem from '../components/TaskItem';
import * as db from '../db/database';
import { cancelReminder } from '../notifications/notifications';
import { queueSync } from '../sync/sync';
import { taskTypes } from '../theme';
import { useTheme } from '../theme-context';
import { formatDateTime, isSameDay, monthMatrix, monthTitle, WEEKDAY_INITIALS } from '../utils/date';

export default function CalendarScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    setTasks(db.getTasks());
  }

  function tasksOfDay(day) {
    return tasks.filter((t) => isSameDay(new Date(t.due_date), day));
  }

  function moveMonth(step) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + step, 1));
  }

  async function handleToggle(task) {
    const nowDone = task.done !== 1;
    if (nowDone) await cancelReminder(task.notification_id);
    db.setTaskDone(task.id, nowDone);
    queueSync();
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
          clearAttachments(task.uuid);
          queueSync();
          refresh();
        },
      },
    ]);
  }

  const weeks = monthMatrix(cursor.getFullYear(), cursor.getMonth());
  const dayTasks = tasksOfDay(selected);

  return (
    <View style={styles.container}>
      <View style={styles.monthBar}>
        <Pressable style={styles.arrow} onPress={() => moveMonth(-1)} hitSlop={8}>
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{monthTitle(cursor)}</Text>
        <Pressable style={styles.arrow} onPress={() => moveMonth(1)} hitSlop={8}>
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekHeader}>
        {WEEKDAY_INITIALS.map((letter, i) => (
          <Text key={i} style={styles.weekLetter}>
            {letter}
          </Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={styles.dayCell} />;
            const isSelected = isSameDay(day, selected);
            const isToday = isSameDay(day, today);
            const dots = tasksOfDay(day)
              .filter((t) => t.done === 0)
              .slice(0, 3);
            return (
              <Pressable key={di} style={styles.dayCell} onPress={() => setSelected(day)}>
                <View
                  style={[
                    styles.dayCircle,
                    isToday && styles.dayToday,
                    isSelected && styles.daySelected,
                  ]}
                >
                  <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                    {day.getDate()}
                  </Text>
                </View>
                <View style={styles.dotsRow}>
                  {dots.map((t, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            t.subject_color ?? (taskTypes[t.type] ?? taskTypes.tarefa).color,
                        },
                      ]}
                    />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      <Text style={styles.dayHeading}>
        {formatDateTime(selected).split(' às ')[0]} ·{' '}
        {dayTasks.length === 0
          ? 'dia livre 🌸'
          : `${dayTasks.length} ${dayTasks.length === 1 ? 'tarefa' : 'tarefas'}`}
      </Text>

      <FlatList
        data={dayTasks}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TaskItem task={item} onToggle={handleToggle} onDelete={handleDelete} />
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    monthBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    arrow: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    arrowText: {
      fontSize: 22,
      color: colors.primary,
      lineHeight: 26,
      fontWeight: '700',
    },
    monthTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'capitalize',
    },
    weekHeader: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      marginBottom: 4,
    },
    weekLetter: {
      flex: 1,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
    },
    weekRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
    },
    dayCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 3,
    },
    dayCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayToday: {
      borderWidth: 2,
      borderColor: colors.primary,
    },
    daySelected: {
      backgroundColor: colors.primary,
    },
    dayNumber: {
      fontSize: 14,
      color: colors.text,
    },
    dayNumberSelected: {
      color: '#fff',
      fontWeight: '700',
    },
    dotsRow: {
      flexDirection: 'row',
      gap: 3,
      height: 6,
      marginTop: 1,
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },
    dayHeading: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 8,
    },
    list: {
      paddingBottom: 24,
    },
  });
}
