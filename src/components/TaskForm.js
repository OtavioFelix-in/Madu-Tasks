// Formulário de tarefa (nova ou edição), apresentado como bottom sheet.

import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
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
import { colors, taskTypes } from '../theme';
import { formatDateTime } from '../utils/date';

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
  const editing = !!task;
  const [title, setTitle] = useState('');
  const [type, setType] = useState('tarefa');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [remindMinutes, setRemindMinutes] = useState(1440);
  const [picker, setPicker] = useState(null); // 'date' | 'time' | null

  // Ao abrir, carrega a tarefa em edição ou limpa para uma nova.
  useEffect(() => {
    if (!visible) return;
    setTitle(task ? task.title : '');
    setType(task ? task.type : 'tarefa');
    setSubject(task?.subject ?? '');
    setDueDate(task ? new Date(task.due_date) : defaultDueDate());
    setRemindMinutes(task?.remind_minutes ?? 1440);
    setPicker(null);
  }, [visible, task]);

  function handleSave() {
    if (!title.trim()) return;
    onSave({ title: title.trim(), type, subject: subject.trim(), dueDate, remindMinutes });
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
              autoFocus={!editing}
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

            <TextInput
              style={styles.input}
              placeholder="Matéria (opcional)"
              placeholderTextColor={colors.textMuted}
              value={subject}
              onChangeText={setSubject}
            />

            <Text style={styles.label}>Prazo: {formatDateTime(dueDate)}</Text>
            <View style={styles.chipRow}>
              <Pressable style={styles.dateButton} onPress={() => setPicker('date')}>
                <Text style={styles.dateButtonText}>📅 Mudar data</Text>
              </Pressable>
              <Pressable style={styles.dateButton} onPress={() => setPicker('time')}>
                <Text style={styles.dateButtonText}>⏰ Mudar hora</Text>
              </Pressable>
            </View>

            {picker && (
              <DateTimePicker value={dueDate} mode={picker} onChange={onPickerChange} />
            )}

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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(61, 44, 53, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
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
