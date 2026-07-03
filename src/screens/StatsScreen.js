// Resumo dos estudos: tarefas concluídas, pendentes e pomodoros do mês.

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as db from '../db/database';
import { colors, taskTypes } from '../theme';

function funMessage(stats) {
  if (stats.doneMonth >= 10) return `Você concluiu ${stats.doneMonth} tarefas este mês! 🎉👑`;
  if (stats.doneMonth >= 5) return `${stats.doneMonth} tarefas concluídas no mês — tá voando! 🚀`;
  if (stats.doneMonth >= 1) return `${stats.doneMonth} ${stats.doneMonth === 1 ? 'tarefa concluída' : 'tarefas concluídas'} este mês. Boa! 💪`;
  if (stats.pending > 0) return 'Mês começando — bora riscar a primeira? ✏️';
  return 'Tudo tranquilo por aqui 🌸';
}

export default function StatsScreen() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    setStats(db.getStats());
  }, []);

  if (!stats) return null;

  const focusHours = Math.floor(stats.pomodoro.total_minutes / 60);
  const focusRest = stats.pomodoro.total_minutes % 60;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Resumo 📊</Text>
      <Text style={styles.subtitle}>{funMessage(stats)}</Text>

      <View style={styles.cardRow}>
        <View style={styles.card}>
          <Text style={styles.cardNumber}>{stats.doneMonth}</Text>
          <Text style={styles.cardLabel}>concluídas{'\n'}este mês ✅</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardNumber}>{stats.pending}</Text>
          <Text style={styles.cardLabel}>pendentes{'\n'}⏳</Text>
        </View>
      </View>

      <View style={styles.cardRow}>
        <View style={styles.card}>
          <Text style={[styles.cardNumber, stats.overdue > 0 && { color: colors.danger }]}>
            {stats.overdue}
          </Text>
          <Text style={styles.cardLabel}>atrasadas{'\n'}😬</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardNumber}>{stats.doneTotal}</Text>
          <Text style={styles.cardLabel}>concluídas{'\n'}desde sempre 🏆</Text>
        </View>
      </View>

      <View style={styles.wideCard}>
        <Text style={styles.wideCardTitle}>🍅 Pomodoros este mês</Text>
        <Text style={styles.wideCardText}>
          {stats.pomodoro.n === 0
            ? 'Nenhum ainda — experimenta a aba Pomodoro!'
            : `${stats.pomodoro.n} ${stats.pomodoro.n === 1 ? 'sessão' : 'sessões'} · ${
                focusHours > 0 ? `${focusHours}h${focusRest > 0 ? ` ${focusRest}min` : ''}` : `${focusRest}min`
              } de foco total`}
        </Text>
      </View>

      <View style={styles.wideCard}>
        <Text style={styles.wideCardTitle}>Concluídas por tipo</Text>
        {stats.byType.length === 0 ? (
          <Text style={styles.wideCardText}>Conclua a primeira tarefa pra ver aqui! 🌱</Text>
        ) : (
          stats.byType.map((row) => {
            const info = taskTypes[row.type] ?? taskTypes.tarefa;
            return (
              <View key={row.type} style={styles.typeRow}>
                <Text style={styles.typeLabel}>
                  {info.emoji} {info.label}
                </Text>
                <Text style={[styles.typeCount, { color: info.color }]}>{row.n}</Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 20,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
  },
  cardNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.primary,
  },
  cardLabel: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  wideCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  wideCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  wideCardText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  typeLabel: {
    fontSize: 14,
    color: colors.text,
  },
  typeCount: {
    fontSize: 15,
    fontWeight: '800',
  },
});
