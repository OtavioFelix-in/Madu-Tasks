// Barra de navegação inferior, feita à mão (sem biblioteca de navegação).

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

const TABS = [
  { key: 'tasks', emoji: '✅', label: 'Tarefas' },
  { key: 'calendar', emoji: '📅', label: 'Calendário' },
  { key: 'pomodoro', emoji: '🍅', label: 'Pomodoro' },
  { key: 'stats', emoji: '📊', label: 'Resumo' },
];

export default function TabBar({ active, onChange }) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable key={tab.key} style={styles.tab} onPress={() => onChange(tab.key)}>
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Text style={styles.emoji}>{tab.emoji}</Text>
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  iconWrap: {
    paddingHorizontal: 16,
    paddingVertical: 3,
    borderRadius: 14,
  },
  iconWrapActive: {
    backgroundColor: colors.primaryLight,
  },
  emoji: {
    fontSize: 18,
  },
  label: {
    fontSize: 11,
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
