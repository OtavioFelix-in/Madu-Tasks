// Faixa que aparece em qualquer aba enquanto o Pomodoro está rodando,
// mostrando o tempo que falta. Toque para abrir o cronômetro.

import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { formatClock, usePomodoro } from '../pomodoro/pomodoro-store';
import { useTheme } from '../theme-context';

export default function PomodoroBanner({ onPress }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { running, mode, remaining } = usePomodoro();

  if (!running) return null;
  return (
    <Pressable style={styles.banner} onPress={onPress}>
      <Text style={styles.text}>
        {mode === 'foco' ? '🍅 Focando' : '☕ Pausa'} · {formatClock(remaining)}
      </Text>
    </Pressable>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    banner: {
      backgroundColor: colors.primary,
      paddingVertical: 8,
      alignItems: 'center',
    },
    text: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
  });
}
