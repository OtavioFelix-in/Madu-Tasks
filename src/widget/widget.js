// Alimenta o widget da tela inicial (Android).
//
// O widget nativo (plugins/task-widget) não acessa o banco: ele lê o arquivo
// widget.json, que este módulo regrava com as próximas tarefas. Chamado ao abrir
// o app e sempre que ele sai de foco, então o que a usuária vê ao voltar para a
// tela inicial já está atualizado (o widget também se atualiza sozinho a cada 15 min).

import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import * as db from '../db/database';
import { taskTypes } from '../theme';

const MAX_TASKS = 4;

export function writeWidgetSnapshot() {
  if (Platform.OS !== 'android') return;
  try {
    const stats = db.getStats();
    const tasks = db.getWidgetTasks(MAX_TASKS).map((t) => ({
      title: t.title,
      emoji: (taskTypes[t.type] ?? taskTypes.tarefa).emoji,
      due: t.due_date,
      subject: t.subject_name ?? '',
    }));
    const snapshot = {
      updatedAt: new Date().toISOString(),
      pending: stats.pending,
      overdue: stats.overdue,
      tasks,
    };
    const file = new File(Paths.document, 'widget.json');
    file.create({ overwrite: true });
    file.write(JSON.stringify(snapshot));
  } catch {
    // o widget é um extra: nunca deve atrapalhar o app
  }
}
