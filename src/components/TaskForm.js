// Formulário de nova tarefa, apresentado como uma folha (bottom sheet) sobre a lista.

import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, taskTypes } from '../theme';
import { formatDateTime } from '../utils/date';

// Prazo sugerido: amanhã às 08:00.
function defaultDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d;
}

export default function TaskForm({ visible, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('tarefa');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [picker, setPicker] = useState(null); // 'date' | 'time' | null

  function reset() {
    setTitle('');
    setType('tarefa');
    setSubject('');
    setDueDate(defaultDueDate());
    setPicker(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSave() {
    if (!title.trim()) return;
    onSave({ title: title.trim(), type, subject: subject.trim(), dueDate });
    reset();
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      {/* 'padding' também no Android: com edge-to-edge (Android 15+) o sistema
          não redimensiona a janela sozinho e o teclado cobria o formulário. */}
      <KeyboardAvoidingView style={styles.backdrop} behavior="padding">
        <View style={styles.sheet}>
          <Text style={styles.heading}>Nova tarefa ✨</Text>

          <TextInput
            style={styles.input}
            placeholder="O que precisa ser feito?"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            autoFocus
          />

          <View style={styles.typeRow}>
            {Object.entries(taskTypes).map(([key, info]) => (
              <Pressable
                key={key}
                style={[styles.typeChip, type === key && { backgroundColor: info.color }]}
                onPress={() => setType(key)}
              >
                <Text style={[styles.typeChipText, type === key && styles.typeChipTextActive]}>
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

          <Text style={styles.deadline}>Prazo: {formatDateTime(dueDate)}</Text>
          <View style={styles.dateRow}>
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

          <View style={styles.actions}>
            <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.actionButton, styles.saveButton, !title.trim() && styles.saveDisabled]}
              onPress={handleSave}
            >
              <Text style={styles.saveText}>Salvar</Text>
            </Pressable>
          </View>
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
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeChip: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: 'center',
  },
  typeChipText: {
    fontSize: 13,
    color: colors.text,
  },
  typeChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  deadline: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
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
