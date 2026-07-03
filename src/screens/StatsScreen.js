// Resumo dos estudos: streak, tarefas, pomodoros, média das provas por matéria,
// backup local e conta de sincronização (Supabase).

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as db from '../db/database';
import { getSessionUser, signIn, signOut, syncNow } from '../sync/sync';
import { isSyncConfigured } from '../sync/supabase';
import { taskTypes } from '../theme';
import { useTheme } from '../theme-context';
import { exportBackup, importBackup } from '../utils/backup';

function funMessage(stats, streak) {
  if (streak >= 7) return `${streak} dias seguidos de estudo — imparável! 🔥`;
  if (stats.doneMonth >= 10) return `Você concluiu ${stats.doneMonth} tarefas este mês! 🎉👑`;
  if (stats.doneMonth >= 5) return `${stats.doneMonth} tarefas concluídas no mês — tá voando! 🚀`;
  if (stats.doneMonth >= 1)
    return `${stats.doneMonth} ${stats.doneMonth === 1 ? 'tarefa concluída' : 'tarefas concluídas'} este mês. Boa! 💪`;
  if (stats.pending > 0) return 'Mês começando — bora riscar a primeira? ✏️';
  return 'Tudo tranquilo por aqui 🌸';
}

// Dias seguidos (terminando hoje ou ontem) com tarefa concluída ou pomodoro.
function computeStreak(dates) {
  const set = new Set(dates);
  const key = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const cursor = new Date();
  if (!set.has(key(cursor))) cursor.setDate(cursor.getDate() - 1); // hoje ainda não estudou? conta até ontem
  let streak = 0;
  while (set.has(key(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function StatsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [stats, setStats] = useState(null);
  const [streak, setStreak] = useState(0);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refresh();
    getSessionUser().then(setUser).catch(() => {});
  }, []);

  function refresh() {
    setStats(db.getStats());
    setStreak(computeStreak(db.getActivityDates()));
  }

  async function handleSignIn() {
    if (!email.trim() || !password) return;
    setBusy(true);
    try {
      const u = await signIn(email.trim(), password);
      setUser(u);
      setPassword('');
      await syncNow();
      refresh();
      Alert.alert('Conectada! ☁️', 'Seus dados agora sincronizam entre os aparelhos.');
    } catch (e) {
      Alert.alert('Não deu certo', 'Confira o email e a senha e tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSync() {
    setBusy(true);
    try {
      const result = await syncNow();
      refresh();
      Alert.alert(result.ok ? 'Sincronizado! ☁️' : 'Sem conexão', result.ok ? 'Tudo atualizado.' : 'Tente de novo mais tarde.');
    } catch (e) {
      Alert.alert('Erro ao sincronizar', 'Verifique sua internet e tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  async function handleExport() {
    try {
      await exportBackup();
    } catch (e) {
      Alert.alert('Erro ao exportar', String(e?.message ?? e));
    }
  }

  function handleImport() {
    Alert.alert(
      'Importar backup',
      'Isso substitui TODOS os dados atuais pelos do arquivo. Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Importar',
          style: 'destructive',
          onPress: async () => {
            try {
              const done = await importBackup();
              if (done) {
                refresh();
                Alert.alert('Pronto! 💾', 'Backup importado com sucesso.');
              }
            } catch (e) {
              Alert.alert('Erro ao importar', 'O arquivo não parece ser um backup do MaduTasks.');
            }
          },
        },
      ]
    );
  }

  if (!stats) return null;

  const focusHours = Math.floor(stats.pomodoro.total_minutes / 60);
  const focusRest = stats.pomodoro.total_minutes % 60;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Resumo 📊</Text>
      <Text style={styles.subtitle}>{funMessage(stats, streak)}</Text>

      <View style={styles.cardRow}>
        <View style={styles.card}>
          <Text style={styles.cardNumber}>{streak}</Text>
          <Text style={styles.cardLabel}>dias seguidos{'\n'}de estudo 🔥</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardNumber}>{stats.doneMonth}</Text>
          <Text style={styles.cardLabel}>concluídas{'\n'}este mês ✅</Text>
        </View>
      </View>

      <View style={styles.cardRow}>
        <View style={styles.card}>
          <Text style={styles.cardNumber}>{stats.pending}</Text>
          <Text style={styles.cardLabel}>pendentes{'\n'}⏳</Text>
        </View>
        <View style={styles.card}>
          <Text style={[styles.cardNumber, stats.overdue > 0 && { color: colors.danger }]}>
            {stats.overdue}
          </Text>
          <Text style={styles.cardLabel}>atrasadas{'\n'}😬</Text>
        </View>
      </View>

      <View style={styles.wideCard}>
        <Text style={styles.wideCardTitle}>🍅 Pomodoros este mês</Text>
        <Text style={styles.wideCardText}>
          {stats.pomodoro.n === 0
            ? 'Nenhum ainda — experimenta a aba Pomodoro!'
            : `${stats.pomodoro.n} ${stats.pomodoro.n === 1 ? 'sessão' : 'sessões'} · ${
                focusHours > 0
                  ? `${focusHours}h${focusRest > 0 ? ` ${focusRest}min` : ''}`
                  : `${focusRest}min`
              } de foco total`}
        </Text>
      </View>

      <View style={styles.wideCard}>
        <Text style={styles.wideCardTitle}>📝 Média das provas por matéria</Text>
        {stats.gradesBySubject.length === 0 ? (
          <Text style={styles.wideCardText}>
            Lance a nota nas provas (editando a tarefa) pra ver as médias aqui!
          </Text>
        ) : (
          stats.gradesBySubject.map((row) => (
            <View key={row.name} style={styles.typeRow}>
              <Text style={[styles.typeLabel, { color: row.color }]}>● {row.name}</Text>
              <Text style={styles.typeCount}>
                {row.media} ({row.provas} {row.provas === 1 ? 'prova' : 'provas'})
              </Text>
            </View>
          ))
        )}
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

      <View style={styles.wideCard}>
        <Text style={styles.wideCardTitle}>☁️ Sincronização</Text>
        {!isSyncConfigured() ? (
          <Text style={styles.wideCardText}>
            Ainda não configurada — veja o arquivo SUPABASE.md do projeto.
          </Text>
        ) : user ? (
          <>
            <Text style={styles.wideCardText}>Conectada como {user.email}</Text>
            <View style={styles.buttonRow}>
              <Pressable style={[styles.smallButton, styles.smallPrimary]} onPress={handleSync} disabled={busy}>
                <Text style={styles.smallPrimaryText}>{busy ? '...' : 'Sincronizar agora'}</Text>
              </Pressable>
              <Pressable
                style={styles.smallButton}
                onPress={async () => {
                  await signOut();
                  setUser(null);
                }}
              >
                <Text style={styles.smallText}>Sair</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <Pressable style={[styles.smallButton, styles.smallPrimary]} onPress={handleSignIn} disabled={busy}>
              <Text style={styles.smallPrimaryText}>{busy ? 'Entrando...' : 'Entrar'}</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.wideCard}>
        <Text style={styles.wideCardTitle}>💾 Backup local</Text>
        <View style={styles.buttonRow}>
          <Pressable style={[styles.smallButton, styles.smallPrimary]} onPress={handleExport}>
            <Text style={styles.smallPrimaryText}>Exportar</Text>
          </Pressable>
          <Pressable style={styles.smallButton} onPress={handleImport}>
            <Text style={styles.smallText}>Importar</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
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
      fontWeight: '600',
    },
    typeCount: {
      fontSize: 15,
      fontWeight: '800',
      color: colors.text,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
      marginBottom: 8,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    smallButton: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    smallPrimary: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    smallPrimaryText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
    smallText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
