// Card de uma tarefa na lista.
// Toque: marca/desmarca como concluída. Toque longo: apagar.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, taskTypes } from '../theme';
import { formatDateTime, isOverdue, relativeLabel } from '../utils/date';

export default function TaskItem({ task, onToggle, onDelete }) {
  const type = taskTypes[task.type] ?? taskTypes.tarefa;
  const done = task.done === 1;
  const late = !done && isOverdue(task.due_date);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, done && styles.cardDone, pressed && styles.cardPressed]}
      onPress={() => onToggle(task)}
      onLongPress={() => onDelete(task)}
    >
      <View style={[styles.typeBadge, { backgroundColor: `${type.color}22` }]}>
        <Text style={styles.typeEmoji}>{type.emoji}</Text>
      </View>

      <View style={styles.info}>
        <Text style={[styles.title, done && styles.titleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        {task.subject ? <Text style={styles.subject}>{task.subject}</Text> : null}
        <Text style={[styles.date, late && styles.dateLate]}>
          {formatDateTime(task.due_date)} · {done ? 'concluída 🎉' : relativeLabel(task.due_date)}
        </Text>
      </View>

      <View style={[styles.check, done && styles.checkDone]}>
        {done ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 12,
  },
  cardDone: {
    opacity: 0.55,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  typeBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeEmoji: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  titleDone: {
    textDecorationLine: 'line-through',
  },
  subject: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  dateLate: {
    color: colors.danger,
    fontWeight: '600',
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
