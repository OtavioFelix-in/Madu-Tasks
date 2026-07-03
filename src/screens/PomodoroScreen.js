// Timer Pomodoro: 25 min de foco, 5 de pausa.
// O tempo restante é calculado pelo relógio (endsAt - agora), então continua
// certo mesmo se o app ficar em segundo plano. Ao iniciar, agenda uma
// notificação para o fim do ciclo; ao pausar/zerar, cancela.

import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as db from '../db/database';
import { cancelReminder, schedulePomodoroEnd } from '../notifications/notifications';
import { colors } from '../theme';

const MODES = {
  foco: { label: 'Foco', emoji: '🍅', seconds: 25 * 60 },
  pausa: { label: 'Pausa', emoji: '☕', seconds: 5 * 60 },
};

function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function PomodoroScreen() {
  const [mode, setMode] = useState('foco');
  const [remaining, setRemaining] = useState(MODES.foco.seconds);
  const [running, setRunning] = useState(false);
  const [doneToday, setDoneToday] = useState(0);
  const endsAtRef = useRef(null);
  const notifIdRef = useRef(null);

  useEffect(() => {
    setDoneToday(db.getPomodorosToday());
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        clearInterval(timer);
        finishCycle();
      }
    }, 500);
    return () => clearInterval(timer);
  }, [running]);

  async function start() {
    endsAtRef.current = Date.now() + remaining * 1000;
    notifIdRef.current = await schedulePomodoroEnd(new Date(endsAtRef.current), mode === 'pausa');
    setRunning(true);
  }

  async function pause() {
    setRunning(false);
    await cancelReminder(notifIdRef.current);
    notifIdRef.current = null;
  }

  async function reset() {
    await pause();
    setRemaining(MODES[mode].seconds);
  }

  function finishCycle() {
    setRunning(false);
    notifIdRef.current = null; // a notificação já disparou sozinha
    if (mode === 'foco') {
      db.addPomodoroSession(25);
      setDoneToday((n) => n + 1);
      switchMode('pausa');
    } else {
      switchMode('foco');
    }
  }

  function switchMode(next) {
    setMode(next);
    setRemaining(MODES[next].seconds);
  }

  async function handleModePress(next) {
    if (next === mode) return;
    await pause();
    switchMode(next);
  }

  const progress = 1 - remaining / MODES[mode].seconds;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pomodoro 🍅</Text>
      <Text style={styles.subtitle}>25 min de foco, 5 de pausa. Simples assim.</Text>

      <View style={styles.modeRow}>
        {Object.entries(MODES).map(([key, info]) => (
          <Pressable
            key={key}
            style={[styles.modeChip, mode === key && styles.modeChipActive]}
            onPress={() => handleModePress(key)}
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

      <View style={styles.buttonRow}>
        <Pressable style={[styles.button, styles.buttonGhost]} onPress={reset}>
          <Text style={styles.buttonGhostText}>Zerar</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.buttonPrimary]} onPress={running ? pause : start}>
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

const styles = StyleSheet.create({
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
    marginBottom: 24,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
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
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.card,
    borderWidth: 8,
    borderColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  clock: {
    fontSize: 56,
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
    marginBottom: 24,
  },
  progressFill: {
    backgroundColor: colors.primary,
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
    marginTop: 24,
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
});
