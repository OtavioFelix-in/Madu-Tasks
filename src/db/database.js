// Camada de acesso ao banco SQLite local (expo-sqlite, API síncrona do SDK 57).
// Tudo fica salvo no aparelho — o app funciona 100% offline.

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('madutasks.db');

export function initDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'tarefa',
      subject TEXT,
      due_date TEXT NOT NULL,
      notification_id TEXT,
      done INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);
}

// Pendentes primeiro, ordenadas pelo prazo mais próximo.
export function getTasks() {
  return db.getAllSync('SELECT * FROM tasks ORDER BY done ASC, due_date ASC');
}

export function addTask({ title, type, subject, dueDate, notificationId }) {
  const result = db.runSync(
    'INSERT INTO tasks (title, type, subject, due_date, notification_id) VALUES (?, ?, ?, ?, ?)',
    title,
    type,
    subject,
    dueDate,
    notificationId
  );
  return result.lastInsertRowId;
}

export function setTaskDone(id, done) {
  db.runSync('UPDATE tasks SET done = ? WHERE id = ?', done ? 1 : 0, id);
}

export function deleteTask(id) {
  db.runSync('DELETE FROM tasks WHERE id = ?', id);
}
