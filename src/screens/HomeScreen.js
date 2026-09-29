// Tela principal: lista de tarefas com busca e filtro por módulo/matéria.
// Toque no card edita; toque no círculo conclui (com confete 🎉); longo apaga.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import SubjectsManager from '../components/SubjectsManager';
import TaskForm from '../components/TaskForm';
import TaskItem from '../components/TaskItem';
import * as db from '../db/database';
import { cancelReminder, scheduleTaskReminder } from '../notifications/notifications';
import { queueSync } from '../sync/sync';
import { taskTypes } from '../theme';
import { useTheme } from '../theme-context';
import { nextRepeatDate } from '../utils/date';

export default function HomeScreen() {
  const { colors, mode, cycleMode } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tasks, setTasks] = useState([]);
  const [stepCounts, setStepCounts] = useState({});
  const [formVisible, setFormVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [managerVisible, setManagerVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState(null);
  const [subjectFilter, setSubjectFilter] = useState(null);
  const [celebrate, setCelebrate] = useState(0);
  const modules = useRef([]);
  const subjects = useRef([]);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    modules.current = db.getModules();
    subjects.current = db.getSubjects();
    setTasks(db.getTasks());
    const counts = {};
    for (const row of db.getStepCounts()) {
      counts[row.task_uuid] = { total: row.total, done: row.done ?? 0 };
    }
    setStepCounts(counts);
  }

  function openNew() {
    setEditingTask(null);
    setFormVisible(true);
  }

  function openEdit(task) {
    setEditingTask(task);
    setFormVisible(true);
  }

  async function handleSave({ title, type, subjectId, dueDate, remindMinutes, repeatDays, grade, steps }) {
    if (editingTask) {
      await cancelReminder(editingTask.notification_id);
    }
    const notificationId = await scheduleTaskReminder(
      title,
      taskTypes[type].label,
      dueDate,
      remindMinutes
    );
    const fields = {
      title,
      type,
      subjectId,
      dueDate: dueDate.toISOString(),
      remindMinutes,
      repeatDays,
      grade,
      notificationId,
    };
    let taskUuid;
    if (editingTask) {
      db.updateTask({ id: editingTask.id, ...fields });
      taskUuid = editingTask.uuid;
    } else {
      taskUuid = db.addTask(fields);
    }
    db.replaceSteps(taskUuid, steps);
    setFormVisible(false);
    setEditingTask(null);
    queueSync();
    refresh();
  }

  async function handleToggle(task) {
    const nowDone = task.done !== 1;
    if (nowDone) {
      await cancelReminder(task.notification_id);
      db.setTaskDone(task.id, true);
      await spawnNextOccurrence(task);
      setCelebrate((c) => c + 1); // 🎉
    } else {
      db.setTaskDone(task.id, false);
    }
    queueSync();
    refresh();
  }

  // Tarefa com repetição: ao concluir, nasce a próxima ocorrência.
  async function spawnNextOccurrence(task) {
    if (!task.repeat_days) return;
    const next = nextRepeatDate(new Date(task.due_date), task.repeat_days);
    if (!next) return;
    db.clearTaskRepeat(task.id); // esta ocorrência já gerou a próxima
    const notificationId = await scheduleTaskReminder(
      task.title,
      (taskTypes[task.type] ?? taskTypes.tarefa).label,
      next,
      task.remind_minutes
    );
    const newUuid = db.addTask({
      title: task.title,
      type: task.type,
      subjectId: task.subject_id,
      dueDate: next.toISOString(),
      remindMinutes: task.remind_minutes,
      repeatDays: task.repeat_days,
      grade: null,
      notificationId,
    });
    // Etapas renascem desmarcadas na nova ocorrência.
    const steps = db.getSteps(task.uuid).map((s) => ({ title: s.title, done: false }));
    if (steps.length > 0) db.replaceSteps(newUuid, steps);
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
          queueSync();
          refresh();
        },
      },
    ]);
  }

  const moduleSubjects = moduleFilter
    ? subjects.current.filter((s) => s.module_id === moduleFilter)
    : [];

  const visibleTasks = tasks.filter((t) => {
    if (subjectFilter && t.subject_id !== subjectFilter) return false;
    if (!subjectFilter && moduleFilter && t.subject_module_id !== moduleFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const inTitle = t.title.toLowerCase().includes(q);
      const inSubject = (t.subject_name ?? '').toLowerCase().includes(q);
      if (!inTitle && !inSubject) return false;
    }
    return true;
  });

  const pendingCount = tasks.filter((t) => t.done === 0).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.appTitle}>MaduTasks 💖</Text>
          <Text style={styles.subtitle}>
            {pendingCount === 0
              ? 'Tudo em dia, arrasou! 🎉'
              : `${pendingCount} ${pendingCount === 1 ? 'tarefa pendente' : 'tarefas pendentes'}`}
          </Text>
        </View>
        <Pressable style={styles.headerButton} onPress={() => setManagerVisible(true)}>
          <Text style={styles.headerButtonText}>📚</Text>
        </Pressable>
        <Pressable style={styles.headerButton} onPress={cycleMode}>
          <Text style={styles.headerButtonText}>
            {mode === 'auto' ? '🌗' : mode === 'dark' ? '🌙' : '☀️'}
          </Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.search}
        placeholder="🔍 Buscar tarefa ou matéria..."
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      {modules.current.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          <Pressable
            style={[styles.filterChip, moduleFilter === null && styles.filterChipActive]}
            onPress={() => {
              setModuleFilter(null);
              setSubjectFilter(null);
            }}
          >
            <Text style={[styles.filterText, moduleFilter === null && styles.filterTextActive]}>
              Todas
            </Text>
          </Pressable>
          {modules.current.map((mod) => (
            <Pressable
              key={mod.id}
              style={[styles.filterChip, moduleFilter === mod.id && styles.filterChipActive]}
              onPress={() => {
                setModuleFilter(moduleFilter === mod.id ? null : mod.id);
                setSubjectFilter(null);
              }}
            >
              <Text style={[styles.filterText, moduleFilter === mod.id && styles.filterTextActive]}>
                {mod.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {moduleFilter && moduleSubjects.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {moduleSubjects.map((s) => (
            <Pressable
              key={s.id}
              style={[
                styles.filterChip,
                subjectFilter === s.id && { backgroundColor: s.color, borderColor: s.color },
              ]}
              onPress={() => setSubjectFilter(subjectFilter === s.id ? null : s.id)}
            >
              <Text style={[styles.filterText, subjectFilter === s.id && styles.filterTextActive]}>
                ● {s.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <FlatList
        data={visibleTasks}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TaskItem
            task={item}
            stepCount={stepCounts[item.uuid]}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onEdit={openEdit}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌸</Text>
            <Text style={styles.emptyText}>
              {tasks.length === 0 ? 'Nenhuma tarefa ainda.' : 'Nada por aqui com esse filtro.'}
            </Text>
            <Text style={styles.emptyHint}>
              {tasks.length === 0 ? 'Toque no + para adicionar a primeira!' : 'Tente limpar a busca ou o filtro.'}
            </Text>
          </View>
        }
      />

      <Pressable style={styles.fab} onPress={openNew}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <TaskForm
        visible={formVisible}
        task={editingTask}
        onSave={handleSave}
        onClose={() => {
          setFormVisible(false);
          setEditingTask(null);
        }}
      />

      <SubjectsManager
        visible={managerVisible}
        onClose={() => setManagerVisible(false)}
        onChanged={refresh}
      />

      {celebrate > 0 && (
        <ConfettiCannon
          key={celebrate}
          count={70}
          origin={{ x: Dimensions.get('window').width / 2, y: -10 }}
          fadeOut
          autoStart
        />
      )}
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
      gap: 8,
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
    headerButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerButtonText: {
      fontSize: 18,
    },
    search: {
      marginHorizontal: 16,
      marginBottom: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
    },
    filterScroll: {
      flexGrow: 0,
      marginBottom: 8,
    },
    filterRow: {
      paddingHorizontal: 16,
      gap: 8,
    },
    filterChip: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      paddingVertical: 7,
      paddingHorizontal: 14,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterText: {
      fontSize: 13,
      color: colors.text,
    },
    filterTextActive: {
      color: '#fff',
      fontWeight: '600',
    },
    list: {
      paddingBottom: 100,
    },
    empty: {
      alignItems: 'center',
      marginTop: 60,
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
      bottom: 24,
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
}
