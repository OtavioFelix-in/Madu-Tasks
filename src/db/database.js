// Camada de acesso ao banco SQLite local (expo-sqlite, API síncrona do SDK 57).
// Tudo fica salvo no aparelho — o app funciona 100% offline.

import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('madutasks.db');

// Adiciona coluna nova sem quebrar bancos criados na v1 (migração leve).
function addColumnIfMissing(table, name, definition) {
  const columns = db.getAllSync(`PRAGMA table_info(${table})`);
  if (!columns.some((c) => c.name === name)) {
    db.execSync(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

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
    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      minutes INTEGER NOT NULL,
      finished_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);
  // v2: quando lembrar (minutos antes do prazo) e quando foi concluída
  addColumnIfMissing('tasks', 'remind_minutes', 'INTEGER NOT NULL DEFAULT 1440');
  addColumnIfMissing('tasks', 'completed_at', 'TEXT');
}

// ---- Tarefas ----

// Pendentes primeiro, ordenadas pelo prazo mais próximo.
export function getTasks() {
  return db.getAllSync('SELECT * FROM tasks ORDER BY done ASC, due_date ASC');
}

export function addTask({ title, type, subject, dueDate, remindMinutes, notificationId }) {
  const result = db.runSync(
    `INSERT INTO tasks (title, type, subject, due_date, remind_minutes, notification_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    title,
    type,
    subject,
    dueDate,
    remindMinutes,
    notificationId
  );
  return result.lastInsertRowId;
}

export function updateTask({ id, title, type, subject, dueDate, remindMinutes, notificationId }) {
  db.runSync(
    `UPDATE tasks
     SET title = ?, type = ?, subject = ?, due_date = ?, remind_minutes = ?, notification_id = ?
     WHERE id = ?`,
    title,
    type,
    subject,
    dueDate,
    remindMinutes,
    notificationId,
    id
  );
}

export function setTaskDone(id, done) {
  db.runSync(
    `UPDATE tasks
     SET done = ?, completed_at = CASE WHEN ? THEN datetime('now', 'localtime') ELSE NULL END
     WHERE id = ?`,
    done ? 1 : 0,
    done ? 1 : 0,
    id
  );
}

export function deleteTask(id) {
  db.runSync('DELETE FROM tasks WHERE id = ?', id);
}

// ---- Pomodoro ----

export function addPomodoroSession(minutes) {
  db.runSync('INSERT INTO pomodoro_sessions (minutes) VALUES (?)', minutes);
}

export function getPomodorosToday() {
  return db.getFirstSync(
    `SELECT COUNT(*) AS n FROM pomodoro_sessions WHERE finished_at >= date('now', 'localtime')`
  ).n;
}

// ---- Estatísticas ----

export function getStats() {
  const doneMonth = db.getFirstSync(
    `SELECT COUNT(*) AS n FROM tasks
     WHERE done = 1 AND completed_at >= date('now', 'start of month', 'localtime')`
  ).n;
  const doneTotal = db.getFirstSync('SELECT COUNT(*) AS n FROM tasks WHERE done = 1').n;
  const pending = db.getFirstSync('SELECT COUNT(*) AS n FROM tasks WHERE done = 0').n;
  const overdue = db.getFirstSync(
    'SELECT COUNT(*) AS n FROM tasks WHERE done = 0 AND due_date < ?',
    new Date().toISOString()
  ).n;
  const byType = db.getAllSync(
    'SELECT type, COUNT(*) AS n FROM tasks WHERE done = 1 GROUP BY type'
  );
  const pomodoro = db.getFirstSync(
    `SELECT COUNT(*) AS n, COALESCE(SUM(minutes), 0) AS total_minutes
     FROM pomodoro_sessions
     WHERE finished_at >= date('now', 'start of month', 'localtime')`
  );

  return { doneMonth, doneTotal, pending, overdue, byType, pomodoro };
}
