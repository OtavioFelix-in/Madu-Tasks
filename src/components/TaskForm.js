// Formulário de tarefa (nova ou edição), apresentado como bottom sheet.
// v3: matéria, repetição semanal, etapas (checklist) e nota de prova.

import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as db from '../db/database';
import { taskTypes } from '../theme';
import { useTheme } from '../theme-context';
import { formatDateTime, WEEKDAY_INITIALS } from '../utils/date';

// Opções de "quando lembrar", em minutos antes do prazo.
export const REMINDER_OPTIONS = [
  { minutes: 0, label: 'Na hora' },
  { minutes: 60, label: '1h antes' },
  { minutes: 1440, label: '1 dia antes' },
  { minutes: 4320, label: '3 dias antes' },
];

// Prazo sugerido: amanhã às 08:00.
function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d;
}

export default function TaskForm({ visible, task, onSave, onClose }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const editing = !!task;

  const [title, setTitle] = useState('');
  const [type, setType] = useState('tarefa');
  const [subjectId, setSubjectId] = useState(null);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [remindMinutes, setRemindMinutes] = useState(1440);
  const [repeatDays, setRepeatDays] = useState([]); // [0..6]
  const [steps, setSteps] = useState([]); // { id?, title, done }
  const [newStep, setNewStep] = useState('');
  const [grade, setGrade] = useState('');
  const [picker, setPicker] = useState(null); // 'date' | 'time' | null

  const subjects = useMemo(() => (visible ? db.getSubjects() : []), [visible]);

  // Ao abrir, carrega a tarefa em edição ou limpa para uma nova.
  useEffect(() => {
    if (!visible) return;
    setTitle(task ? task.title : '');
    setType(task ? task.type : 'tarefa');
    setSubjectId(task?.subject_id ?? null);
    setDueDate(task ? new Date(task.due_date) : defaultDueDate());
    setRemindMinutes(task?.remind_minutes ?? 1440);
    setRepeatDays(task?.repeat_days ? task.repeat_days.split(',').map(Number) : []);
    setSteps(
      task
        ? db.getSteps(task.uuid).map((s) => ({ id: s.id, title: s.title, done: s.done === 1 }))
        : []
    );
    setNewStep('');
    setGrade(task?.grade != null ? String(task.grade) : '');
    setPicker(null);
  }, [visible, task]);

  function toggleRepeatDay(day) {
    setRepeatDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort()
    );
  }

  function addStep() {
    const text = newStep.trim();
    if (!text) return;
    setSteps((s) => [...s, { title: text, done: false }]);
    setNewStep('');
  }

  function toggleStep(index) {
    setSteps((s) => s.map((step, i) => (i === index ? { ...step, done: !step.done } : step)));
  }

  function removeStep(index) {
    setSteps((s) => s.filter((_, i) => i !== index));
  }

  function handleSave() {
    if (!title.trim()) return;
    const parsedGrade = grade.trim() === '' ? null : parseFloat(grade.replace(',', '.'));
    onSave({
      title: title.trim(),
      type,
      subjectId,
      dueDate,
      remindMinutes,
      repeatDays: repeatDays.length > 0 ? repeatDays.join(',') : null,
      grade: Number.isFinite(parsedGrade) ? parsedGrade : null,
      steps,
    });
  }

  function onPickerChange(event, selected) {
    const mode = picker;
    setPicker(null);
    if (event.type === 'dismissed' || !selected) return;
    setDueDate((current) => {
      const next = new Date(current);
      if (mode === 'date') {
        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      } else {
        next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      }
      return next;
    });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* 'padding' também no Android: com edge-to-edge (Android 15+) o sistema
          não redimensiona a janela sozinho e o teclado cobria o formulário. */}
      <KeyboardAvoidingView style={styles.backdrop} behavior="padding">
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
            <Text style={styles.heading}>{editing ? 'Editar tarefa ✏️' : 'Nova tarefa ✨'}</Text>

            <TextInput
              style={styles.input}
              placeholder="O que precisa ser feito?"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <View style={styles.chipRow}>
              {Object.entries(taskTypes).map(([key, info]) => (
                <Pressable
                  key={key}
                  style={[styles.chip, type === key && { backgroundColor: info.color, borderColor: info.color }]}
                  onPress={() => setType(key)}
                >
                  <Text style={[styles.chipText, type === key && styles.chipTextActive]}>
                    {info.emoji} {info.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {subjects.length > 0 ? (
              <>
                <Text style={styles.label}>Matéria:</Text>
                <View style={styles.chipRow}>
                  <Pressable
                    style={[styles.chip, subjectId === null && styles.chipPrimary]}
                    onPress={() => setSubjectId(null)}
                  >
                    <Text style={[styles.chipText, subjectId === null && styles.chipTextActive]}>
                      Sem matéria
                    </Text>
                  </Pressable>
                  {subjects.map((s) => (
                    <Pressable
                      key={s.id}
                      style={[
                        styles.chip,
                        subjectId === s.id && { backgroundColor: s.color, borderColor: s.color },
                      ]}
                      onPress={() => setSubjectId(s.id)}
                    >
                      <Text style={[styles.chipText, subjectId === s.id && styles.chipTextActive]}>
                        {s.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.hint}>
                Dica: crie matérias no botão 📚 da tela de tarefas para organizar e filtrar.
              </Text>
            )}

            <Text style={styles.label}>Prazo: {formatDateTime(dueDate)}</Text>
            <View style={styles.chipRow}>
              <Pressable style={styles.dateButton} onPress={() => setPicker('date')}>
                <Text style={styles.dateButtonText}>📅 Mudar data</Text>
              </Pressable>
              <Pressable style={styles.dateButton} onPress={() => setPicker('time')}>
                <Text style={styles.dateButtonText}>⏰ Mudar hora</Text>
              </Pressable>
            </View>

            {picker && <DateTimePicker value={dueDate} mode={picker} onChange={onPickerChange} />}

            <Text style={styles.label}>Me lembre:</Text>
            <View style={styles.chipRow}>
              {REMINDER_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.minutes}
                  style={[styles.chip, remindMinutes === opt.minutes && styles.chipPrimary]}
                  onPress={() => setRemindMinutes(opt.minutes)}
                >
                  <Text
                    style={[styles.chipText, remindMinutes === opt.minutes && styles.chipTextActive]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>
              Repetir toda semana: {repeatDays.length === 0 ? 'não repete' : ''}
            </Text>
            <View style={styles.chipRow}>
              {WEEKDAY_INITIALS.map((letter, day) => (
                <Pressable
                  key={day}
                  style={[styles.dayChip, repeatDays.includes(day) && styles.chipPrimary]}
                  onPress={() => toggleRepeatDay(day)}
                >
                  <Text
                    style={[styles.chipText, repeatDays.includes(day) && styles.chipTextActive]}
                  >
                    {letter}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Etapas:</Text>
            {steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <Pressable
                  style={[styles.stepCheck, step.done && styles.stepCheckDone]}
                  onPress={() => toggleStep(i)}
                >
                  {step.done ? <Text style={styles.stepCheckMark}>✓</Text> : null}
                </Pressable>
                <Text style={[styles.stepTitle, step.done && styles.stepTitleDone]}>
                  {step.title}
                </Text>
                <Pressable hitSlop={10} onPress={() => removeStep(i)}>
                  <Text style={styles.stepRemove}>✕</Text>
                </Pressable>
              </View>
            ))}
            <View style={styles.chipRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Ex.: ler capítulo 3"
                placeholderTextColor={colors.textMuted}
                value={newStep}
                onChangeText={setNewStep}
                onSubmitEditing={addStep}
              />
              <Pressable style={styles.stepAdd} onPress={addStep}>
                <Text style={styles.stepAddText}>+</Text>
              </Pressable>
            </View>

            {type === 'prova' ? (
              <>
                <Text style={styles.label}>Nota da prova (opcional):</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex.: 8,5 — preencha depois de receber"
                  placeholderTextColor={colors.textMuted}
                  value={grade}
                  onChangeText={setGrade}
                  keyboardType="decimal-pad"
                />
              </>
            ) : null}

            <View style={styles.actions}>
              <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={onClose}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.saveButton, !title.trim() && styles.saveDisabled]}
                onPress={handleSave}
              >
                <Text style={styles.saveText}>{editing ? 'Salvar edição' : 'Salvar'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
    },
    sheetContent: {
      padding: 20,
      paddingBottom: 32,
      gap: 12,
    },
    heading: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center',
    },
    chip: {
      flexGrow: 1,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 10,
      alignItems: 'center',
    },
    dayChip: {
      width: 38,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 19,
      paddingVertical: 8,
      alignItems: 'center',
    },
    chipPrimary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: 13,
      color: colors.text,
    },
    chipTextActive: {
      color: '#fff',
      fontWeight: '600',
    },
    label: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
    },
    hint: {
      fontSize: 13,
      color: colors.textMuted,
    },
    dateButton: {
      flex: 1,
      backgroundColor: colors.primaryLight,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    dateButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    stepCheck: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepCheckDone: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    stepCheckMark: {
      color: '#fff',
      fontSize: 12,
      fontWeight: 'bold',
    },
    stepTitle: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
    },
    stepTitleDone: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    stepRemove: {
      color: colors.textMuted,
      fontSize: 16,
    },
    stepAdd: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepAddText: {
      color: colors.text,
      fontSize: 24,
      lineHeight: 28,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 8,
    },
    actionButton: {
      flex: 1,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelText: {
      color: colors.textMuted,
      fontSize: 16,
      fontWeight: '600',
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    saveDisabled: {
      opacity: 0.4,
    },
    saveText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
