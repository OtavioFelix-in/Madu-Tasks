// Gerenciador de módulos e matérias (modal).
// Cada módulo agrupa matérias; cada matéria tem uma cor da paleta.
// Toque longo apaga (módulo ou matéria).

import { useMemo, useState } from 'react';
import {
  Alert,
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
import { SUBJECT_COLORS } from '../theme';
import { useTheme } from '../theme-context';

export default function SubjectsManager({ visible, onClose, onChanged }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [refreshKey, setRefreshKey] = useState(0);
  const [newModule, setNewModule] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [targetModule, setTargetModule] = useState(null); // módulo que recebe a matéria nova
  const [newColor, setNewColor] = useState(SUBJECT_COLORS[0]);

  const modules = useMemo(() => (visible ? db.getModules() : []), [visible, refreshKey]);
  const subjects = useMemo(() => (visible ? db.getSubjects() : []), [visible, refreshKey]);

  function changed() {
    setRefreshKey((k) => k + 1);
    onChanged?.();
  }

  function handleAddModule() {
    const name = newModule.trim();
    if (!name) return;
    const id = db.addModule(name);
    setNewModule('');
    setTargetModule(id);
    changed();
  }

  function handleAddSubject() {
    const name = newSubject.trim();
    if (!name || !targetModule) return;
    db.addSubject({ moduleId: targetModule, name, color: newColor });
    setNewSubject('');
    changed();
  }

  function confirmDeleteModule(mod) {
    Alert.alert('Apagar módulo', `Apagar "${mod.name}" e todas as matérias dele?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => { db.deleteModule(mod.id); changed(); } },
    ]);
  }

  function confirmDeleteSubject(subject) {
    Alert.alert('Apagar matéria', `Apagar "${subject.name}"? As tarefas dela continuam existindo.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => { db.deleteSubject(subject.id); changed(); } },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior="padding">
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text style={styles.heading}>Módulos e matérias 📚</Text>

            {modules.length === 0 ? (
              <Text style={styles.hint}>
                Crie um módulo (ex.: "Módulo 1") e depois adicione as matérias dele.
              </Text>
            ) : null}

            {modules.map((mod) => (
              <Pressable key={mod.id} onLongPress={() => confirmDeleteModule(mod)}>
                <View style={styles.moduleBlock}>
                  <View style={styles.moduleHeader}>
                    <Text style={styles.moduleName}>{mod.name}</Text>
                    <Pressable
                      style={[styles.pickButton, targetModule === mod.id && styles.pickButtonActive]}
                      onPress={() => setTargetModule(mod.id)}
                    >
                      <Text
                        style={[styles.pickText, targetModule === mod.id && styles.pickTextActive]}
                      >
                        {targetModule === mod.id ? 'adicionando aqui ✓' : 'adicionar aqui'}
                      </Text>
                    </Pressable>
                  </View>
                  {subjects
                    .filter((s) => s.module_id === mod.id)
                    .map((s) => (
                      <Pressable key={s.id} onLongPress={() => confirmDeleteSubject(s)}>
                        <View style={styles.subjectRow}>
                          <View style={[styles.colorDot, { backgroundColor: s.color }]} />
                          <Text style={styles.subjectName}>{s.name}</Text>
                        </View>
                      </Pressable>
                    ))}
                </View>
              </Pressable>
            ))}

            <Text style={styles.label}>Novo módulo</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Ex.: Módulo 2"
                placeholderTextColor={colors.textMuted}
                value={newModule}
                onChangeText={setNewModule}
              />
              <Pressable style={styles.addButton} onPress={handleAddModule}>
                <Text style={styles.addButtonText}>+</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Nova matéria {targetModule ? '' : '(escolha um módulo acima)'}</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Ex.: Anatomia"
                placeholderTextColor={colors.textMuted}
                value={newSubject}
                onChangeText={setNewSubject}
              />
              <Pressable
                style={[styles.addButton, !targetModule && { opacity: 0.4 }]}
                onPress={handleAddSubject}
              >
                <Text style={styles.addButtonText}>+</Text>
              </Pressable>
            </View>
            <View style={styles.colorRow}>
              {SUBJECT_COLORS.map((c) => (
                <Pressable
                  key={c}
                  style={[
                    styles.colorOption,
                    { backgroundColor: c },
                    newColor === c && styles.colorOptionActive,
                  ]}
                  onPress={() => setNewColor(c)}
                />
              ))}
            </View>

            <Text style={styles.hint}>Toque longo num módulo ou matéria para apagar.</Text>

            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>Fechar</Text>
            </Pressable>
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
      maxHeight: '88%',
    },
    content: {
      padding: 20,
      paddingBottom: 32,
      gap: 10,
    },
    heading: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    hint: {
      fontSize: 13,
      color: colors.textMuted,
    },
    moduleBlock: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 4,
    },
    moduleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    moduleName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.primary,
    },
    pickButton: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pickText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    pickTextActive: {
      color: '#fff',
      fontWeight: '600',
    },
    subjectRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 5,
    },
    colorDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    subjectName: {
      fontSize: 15,
      color: colors.text,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginTop: 6,
    },
    row: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
    },
    addButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButtonText: {
      color: '#fff',
      fontSize: 24,
      lineHeight: 28,
      fontWeight: '600',
    },
    colorRow: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    colorOption: {
      width: 30,
      height: 30,
      borderRadius: 15,
    },
    colorOptionActive: {
      borderWidth: 3,
      borderColor: colors.text,
    },
    closeButton: {
      marginTop: 10,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    closeText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
