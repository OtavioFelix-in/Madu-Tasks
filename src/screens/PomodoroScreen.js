// Tela do Pomodoro. Toda a lógica do timer vive em src/pomodoro/pomodoro-store.js
// (fora da tela), então ele continua rodando ao trocar de aba ou fechar o app.

import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  adjustPomodoro,
  formatClock,
  pausePomodoro,
  refreshPomodoroToday,
  resetPomodoro,
  setPomodoroMode,
  startPomodoro,
  usePomodoro,
} from '../pomodoro/pomodoro-store';
import { useTheme } from '../theme-context';

export default function PomodoroScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { focusMin, breakMin, mode, remaining, running, doneToday } = usePomodoro();

  useEffect(() => {
    refreshPomodoroToday();
  }, []);

  const modes = {
    foco: { label: 'Foco', emoji: '🍅', seconds: focusMin * 60 },
    pausa: { label: 'Pausa', emoji: '☕', seconds: breakMin * 60 },
  };

  const progress = 1 - remaining / modes[mode].seconds;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pomodoro 🍅</Text>
      <Text style={styles.subtitle}>
        {focusMin} min de foco, {breakMin} de pausa. Ajuste como quiser.
      </Text>

      <View style={styles.modeRow}>
        {Object.entries(modes).map(([key, info]) => (
          <Pressable
            key={key}
            style={[styles.modeChip, mode === key && styles.modeChipActive]}
            onPress={() => setPomodoroMode(key)}
          >
            <Text style={[styles.modeText, mode === key && styles.modeTextActive]}>
              {info.emoji} {info.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.clockCircle}>
        <Text style={styles.clock}>{formatClock(remaining)}</Text>
        <Text style={styles.clockHint}>
          {running ? (mode === 'foco' ? 'focando...' : 'descansando...') : 'pronta?'}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { flex: progress }]} />
        <View style={{ flex: 1 - progress }} />
      </View>

      {!running ? (
        <View style={styles.tuneRow}>
          <View style={styles.tuneBox}>
            <Text style={styles.tuneLabel}>🍅 Foco</Text>
            <View style={styles.tuneControls}>
              <Pressable style={styles.tuneButton} onPress={() => adjustPomodoro('foco', -5)}>
                <Text style={styles.tuneButtonText}>−</Text>
              </Pressable>
              <Text style={styles.tuneValue}>{focusMin}min</Text>
              <Pressable style={styles.tuneButton} onPress={() => adjustPomodoro('foco', 5)}>
                <Text style={styles.tuneButtonText}>+</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.tuneBox}>
            <Text style={styles.tuneLabel}>☕ Pausa</Text>
            <View style={styles.tuneControls}>
              <Pressable style={styles.tuneButton} onPress={() => adjustPomodoro('pausa', -1)}>
                <Text style={styles.tuneButtonText}>−</Text>
              </Pressable>
              <Text style={styles.tuneValue}>{breakMin}min</Text>
              <Pressable style={styles.tuneButton} onPress={() => adjustPomodoro('pausa', 1)}>
                <Text style={styles.tuneButtonText}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.buttonRow}>
        <Pressable style={[styles.button, styles.buttonGhost]} onPress={resetPomodoro}>
          <Text style={styles.buttonGhostText}>Zerar</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.buttonPrimary]} onPress={running ? pausePomodoro : startPomodoro}>
          <Text style={styles.buttonPrimaryText}>{running ? 'Pausar' : 'Começar'}</Text>
        </Pressable>
      </View>

      <Text style={styles.counter}>
        {doneToday === 0
          ? 'Nenhum pomodoro hoje ainda 🌱'
          : `🍅 ${doneToday} ${doneToday === 1 ? 'pomodoro concluído' : 'pomodoros concluídos'} hoje!`}
      </Text>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.primary,
      alignSelf: 'flex-start',
      paddingTop: 16,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
      alignSelf: 'flex-start',
      marginTop: 4,
      marginBottom: 18,
    },
    modeRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 20,
    },
    modeChip: {
      paddingHorizontal: 22,
      paddingVertical: 10,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modeChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    modeText: {
      fontSize: 15,
      color: colors.text,
    },
    modeTextActive: {
      color: '#fff',
      fontWeight: '700',
    },
    clockCircle: {
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: colors.card,
      borderWidth: 8,
      borderColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    clock: {
      fontSize: 52,
      fontWeight: '800',
      color: colors.text,
      fontVariant: ['tabular-nums'],
    },
    clockHint: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 4,
    },
    progressTrack: {
      flexDirection: 'row',
      width: '100%',
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primaryLight,
      overflow: 'hidden',
      marginBottom: 16,
    },
    progressFill: {
      backgroundColor: colors.primary,
    },
    tuneRow: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
      marginBottom: 16,
    },
    tuneBox: {
      flex: 1,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 10,
      alignItems: 'center',
      gap: 6,
    },
    tuneLabel: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: '600',
    },
    tuneControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    tuneButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tuneButtonText: {
      fontSize: 18,
      color: colors.text,
      lineHeight: 22,
      fontWeight: '700',
    },
    tuneValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      minWidth: 52,
      textAlign: 'center',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    button: {
      flex: 1,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: 'center',
    },
    buttonPrimary: {
      backgroundColor: colors.primary,
    },
    buttonPrimaryText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '700',
    },
    buttonGhost: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonGhostText: {
      color: colors.textMuted,
      fontSize: 17,
      fontWeight: '600',
    },
    counter: {
      marginTop: 18,
      fontSize: 15,
      color: colors.text,
      fontWeight: '600',
    },
  });
}
