// Camada de acesso ao banco SQLite local (expo-sqlite, API síncrona do SDK 57).
// Tudo fica salvo no aparelho — o app funciona 100% offline.
//
// v3: módulos > matérias (com cor), etapas, notas de prova, repetição semanal,
// settings e suporte a sincronização (uuid, updated_at e soft delete em tudo:
// apagar marca deleted=1 para o sync poder propagar a exclusão entre aparelhos).

import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';
import { SUBJECT_COLORS } from '../theme';

const db = SQLite.openDatabaseSync('madutasks.db');

export const newUuid = () => Crypto.randomUUID();
const nowIso = () => new Date().toISOString();

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
    CREATE TABLE IF NOT EXISTS modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      name TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT,
      deleted INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      module_id INTEGER,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      updated_at TEXT,
      deleted INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      task_uuid TEXT NOT NULL,
      title TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT,
      deleted INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE,
      task_uuid TEXT NOT NULL,
      file_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Migrações v2
  addColumnIfMissing('tasks', 'remind_minutes', 'INTEGER NOT NULL DEFAULT 1440');
  addColumnIfMissing('tasks', 'completed_at', 'TEXT');

  // Migrações v3
  addColumnIfMissing('tasks', 'uuid', 'TEXT');
  addColumnIfMissing('tasks', 'subject_id', 'INTEGER');
  addColumnIfMissing('tasks', 'grade', 'REAL');
  addColumnIfMissing('tasks', 'repeat_days', 'TEXT');
  addColumnIfMissing('tasks', 'updated_at', 'TEXT');
  addColumnIfMissing('tasks', 'deleted', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('pomodoro_sessions', 'uuid', 'TEXT');
  addColumnIfMissing('pomodoro_sessions', 'updated_at', 'TEXT');
  addColumnIfMissing('pomodoro_sessions', 'deleted', 'INTEGER NOT NULL DEFAULT 0');

  migrateV3();
}

function migrateV3() {
  // Linhas antigas ganham uuid e updated_at.
  for (const table of ['tasks', 'pomodoro_sessions']) {
    const rows = db.getAllSync(`SELECT id FROM ${table} WHERE uuid IS NULL`);
    for (const row of rows) {
      db.runSync(
        `UPDATE ${table} SET uuid = ?, updated_at = COALESCE(updated_at, ?) WHERE id = ?`,
        newUuid(),
        nowIso(),
        row.id
      );
    }
  }

  // Matérias da v2 (texto livre) viram registros de verdade no módulo "Geral".
  const legacy = db.getAllSync(
    `SELECT DISTINCT subject FROM tasks
     WHERE subject IS NOT NULL AND subject != '' AND subject_id IS NULL`
  );
  if (legacy.length > 0) {
    const moduleId = getOrCreateModule('Geral');
    legacy.forEach((row, i) => {
      const subjectId = addSubject({
        moduleId,
        name: row.subject,
        color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
      });
      db.runSync(
        'UPDATE tasks SET subject_id = ?, updated_at = ? WHERE subject = ? AND subject_id IS NULL',
        subjectId,
        nowIso(),
        row.subject
      );
    });
  }
}

// ---- Módulos ----

export function getModules() {
  return db.getAllSync('SELECT * FROM modules WHERE deleted = 0 ORDER BY position, id');
}

export function addModule(name) {
  const result = db.runSync(
    'INSERT INTO modules (uuid, name, updated_at) VALUES (?, ?, ?)',
    newUuid(),
    name,
    nowIso()
  );
  return result.lastInsertRowId;
}

function getOrCreateModule(name) {
  const row = db.getFirstSync('SELECT id FROM modules WHERE name = ? AND deleted = 0', name);
  return row ? row.id : addModule(name);
}

export function deleteModule(id) {
  db.runSync('UPDATE modules SET deleted = 1, updated_at = ? WHERE id = ?', nowIso(), id);
  db.runSync('UPDATE subjects SET deleted = 1, updated_at = ? WHERE module_id = ?', nowIso(), id);
}

// ---- Matérias ----

export function getSubjects(moduleId = null) {
  if (moduleId) {
    return db.getAllSync(
      'SELECT * FROM subjects WHERE deleted = 0 AND module_id = ? ORDER BY name',
      moduleId
    );
  }
  return db.getAllSync('SELECT * FROM subjects WHERE deleted = 0 ORDER BY name');
}

export function addSubject({ moduleId, name, color }) {
  const result = db.runSync(
    'INSERT INTO subjects (uuid, module_id, name, color, updated_at) VALUES (?, ?, ?, ?, ?)',
    newUuid(),
    moduleId,
    name,
    color,
    nowIso()
  );
  return result.lastInsertRowId;
}

export function deleteSubject(id) {
  db.runSync('UPDATE subjects SET deleted = 1, updated_at = ? WHERE id = ?', nowIso(), id);
}

// ---- Tarefas ----

// Pendentes primeiro, ordenadas pelo prazo; traz nome/cor da matéria junto.
export function getTasks() {
  return db.getAllSync(`
    SELECT t.*, s.name AS subject_name, s.color AS subject_color, s.module_id AS subject_module_id
    FROM tasks t
    LEFT JOIN subjects s ON s.id = t.subject_id AND s.deleted = 0
    WHERE t.deleted = 0
    ORDER BY t.done ASC, t.due_date ASC
  `);
}

export function addTask({ title, type, subjectId, dueDate, remindMinutes, repeatDays, grade, notificationId }) {
  const uuid = newUuid();
  db.runSync(
    `INSERT INTO tasks (uuid, title, type, subject_id, due_date, remind_minutes, repeat_days, grade, notification_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    uuid,
    title,
    type,
    subjectId,
    dueDate,
    remindMinutes,
    repeatDays,
    grade,
    notificationId,
    nowIso()
  );
  return uuid;
}

export function updateTask({ id, title, type, subjectId, dueDate, remindMinutes, repeatDays, grade, notificationId }) {
  db.runSync(
    `UPDATE tasks
     SET title = ?, type = ?, subject_id = ?, due_date = ?, remind_minutes = ?,
         repeat_days = ?, grade = ?, notification_id = ?, updated_at = ?
     WHERE id = ?`,
    title,
    type,
    subjectId,
    dueDate,
    remindMinutes,
    repeatDays,
    grade,
    notificationId,
    nowIso(),
    id
  );
}

export function setTaskDone(id, done) {
  db.runSync(
    `UPDATE tasks
     SET done = ?, completed_at = CASE WHEN ? THEN datetime('now', 'localtime') ELSE NULL END,
         updated_at = ?
     WHERE id = ?`,
    done ? 1 : 0,
    done ? 1 : 0,
    nowIso(),
    id
  );
}

// Consome a repetição da tarefa concluída (evita gerar duas vezes).
export function clearTaskRepeat(id) {
  db.runSync('UPDATE tasks SET repeat_days = NULL, updated_at = ? WHERE id = ?', nowIso(), id);
}

export function deleteTask(id) {
  const task = db.getFirstSync('SELECT uuid FROM tasks WHERE id = ?', id);
  db.runSync('UPDATE tasks SET deleted = 1, updated_at = ? WHERE id = ?', nowIso(), id);
  if (task) {
    db.runSync('UPDATE steps SET deleted = 1, updated_at = ? WHERE task_uuid = ?', nowIso(), task.uuid);
  }
}

// ---- Etapas ----

export function getSteps(taskUuid) {
  return db.getAllSync(
    'SELECT * FROM steps WHERE task_uuid = ? AND deleted = 0 ORDER BY position, id',
    taskUuid
  );
}

// Contagem por tarefa, para mostrar "2/4 etapas" nos cards com uma consulta só.
export function getStepCounts() {
  return db.getAllSync(
    `SELECT task_uuid, COUNT(*) AS total, SUM(done) AS done
     FROM steps WHERE deleted = 0 GROUP BY task_uuid`
  );
}

// Substitui as etapas de uma tarefa pelo que veio do formulário.
export function replaceSteps(taskUuid, steps) {
  const current = getSteps(taskUuid);
  const keptIds = steps.filter((s) => s.id).map((s) => s.id);
  for (const old of current) {
    if (!keptIds.includes(old.id)) {
      db.runSync('UPDATE steps SET deleted = 1, updated_at = ? WHERE id = ?', nowIso(), old.id);
    }
  }
  steps.forEach((step, i) => {
    if (step.id) {
      db.runSync(
        'UPDATE steps SET title = ?, done = ?, position = ?, updated_at = ? WHERE id = ?',
        step.title,
        step.done ? 1 : 0,
        i,
        nowIso(),
        step.id
      );
    } else {
      db.runSync(
        'INSERT INTO steps (uuid, task_uuid, title, done, position, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        newUuid(),
        taskUuid,
        step.title,
        step.done ? 1 : 0,
        i,
        nowIso()
      );
    }
  });
}

// ---- Anexos (fotos) ----
// Só o nome do arquivo fica no banco; a imagem em si mora na pasta do app
// (ver src/attachments/attachments.js). Anexos ficam só no aparelho: não entram
// no sync nem no backup em JSON.

export function getAttachments(taskUuid) {
  return db.getAllSync('SELECT * FROM attachments WHERE task_uuid = ? ORDER BY id', taskUuid);
}

// Contagem por tarefa, para o selo "📷 2" nos cards com uma consulta só.
export function getAttachmentCounts() {
  return db.getAllSync('SELECT task_uuid, COUNT(*) AS total FROM attachments GROUP BY task_uuid');
}

export function addAttachment(taskUuid, fileName) {
  db.runSync(
    'INSERT INTO attachments (uuid, task_uuid, file_name) VALUES (?, ?, ?)',
    newUuid(),
    taskUuid,
    fileName
  );
}

export function removeAttachment(id) {
  db.runSync('DELETE FROM attachments WHERE id = ?', id);
}

// ---- Settings (chave/valor) ----

export function getSetting(key, fallback = null) {
  const row = db.getFirstSync('SELECT value FROM settings WHERE key = ?', key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  db.runSync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    String(value)
  );
}

// ---- Pomodoro ----

// finished_at fica em hora local ('YYYY-MM-DD HH:MM:SS'), como o default da tabela.
function toLocalSql(date) {
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ` +
    `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
  );
}

// `finishedAt` permite contabilizar um ciclo que terminou com o app fechado.
export function addPomodoroSession(minutes, finishedAt = new Date()) {
  db.runSync(
    'INSERT INTO pomodoro_sessions (uuid, minutes, finished_at, updated_at) VALUES (?, ?, ?, ?)',
    newUuid(),
    minutes,
    toLocalSql(finishedAt),
    nowIso()
  );
}

export function getPomodorosToday() {
  return db.getFirstSync(
    `SELECT COUNT(*) AS n FROM pomodoro_sessions
     WHERE deleted = 0 AND finished_at >= date('now', 'localtime')`
  ).n;
}

// ---- Widget ----

// Próximas tarefas pendentes (com nome da matéria) para o widget da tela inicial.
export function getWidgetTasks(limit) {
  return db.getAllSync(
    `SELECT t.title, t.type, t.due_date, s.name AS subject_name
     FROM tasks t
     LEFT JOIN subjects s ON s.id = t.subject_id AND s.deleted = 0
     WHERE t.deleted = 0 AND t.done = 0
     ORDER BY t.due_date ASC
     LIMIT ?`,
    limit
  );
}

// ---- Estatísticas ----

export function getStats() {
  const doneMonth = db.getFirstSync(
    `SELECT COUNT(*) AS n FROM tasks
     WHERE deleted = 0 AND done = 1 AND completed_at >= date('now', 'start of month', 'localtime')`
  ).n;
  const doneTotal = db.getFirstSync(
    'SELECT COUNT(*) AS n FROM tasks WHERE deleted = 0 AND done = 1'
  ).n;
  const pending = db.getFirstSync(
    'SELECT COUNT(*) AS n FROM tasks WHERE deleted = 0 AND done = 0'
  ).n;
  const overdue = db.getFirstSync(
    'SELECT COUNT(*) AS n FROM tasks WHERE deleted = 0 AND done = 0 AND due_date < ?',
    new Date().toISOString()
  ).n;
  const byType = db.getAllSync(
    'SELECT type, COUNT(*) AS n FROM tasks WHERE deleted = 0 AND done = 1 GROUP BY type'
  );
  const pomodoro = db.getFirstSync(
    `SELECT COUNT(*) AS n, COALESCE(SUM(minutes), 0) AS total_minutes
     FROM pomodoro_sessions
     WHERE deleted = 0 AND finished_at >= date('now', 'start of month', 'localtime')`
  );
  // Média das notas lançadas, por matéria.
  const gradesBySubject = db.getAllSync(`
    SELECT s.name, s.color, ROUND(AVG(t.grade), 1) AS media, COUNT(t.grade) AS provas
    FROM tasks t
    JOIN subjects s ON s.id = t.subject_id
    WHERE t.deleted = 0 AND t.grade IS NOT NULL
    GROUP BY s.id
    ORDER BY s.name
  `);

  return { doneMonth, doneTotal, pending, overdue, byType, pomodoro, gradesBySubject };
}

// Dias (YYYY-MM-DD, hora local) com tarefa concluída ou pomodoro — para o streak.
export function getActivityDates() {
  return db
    .getAllSync(`
      SELECT DISTINCT date(completed_at) AS d FROM tasks
      WHERE deleted = 0 AND completed_at IS NOT NULL
      UNION
      SELECT DISTINCT date(finished_at) FROM pomodoro_sessions WHERE deleted = 0
    `)
    .map((r) => r.d);
}

// ---- Backup ----

const BACKUP_TABLES = ['modules', 'subjects', 'tasks', 'steps', 'pomodoro_sessions', 'settings'];

export function exportAll() {
  const data = {};
  for (const table of BACKUP_TABLES) {
    data[table] = db.getAllSync(`SELECT * FROM ${table}`);
  }
  return { app: 'MaduTasks', version: 3, exported_at: nowIso(), data };
}

// Importa um backup substituindo tudo (com confirmação na tela antes).
export function importAll(backup) {
  const data = backup?.data;
  if (!data || !Array.isArray(data.tasks)) {
    throw new Error('Arquivo de backup inválido');
  }
  db.execSync('BEGIN');
  try {
    for (const table of BACKUP_TABLES) {
      db.runSync(`DELETE FROM ${table}`);
      for (const row of data[table] ?? []) {
        const cols = Object.keys(row);
        db.runSync(
          `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          ...cols.map((c) => row[c])
        );
      }
    }
    db.execSync('COMMIT');
  } catch (e) {
    db.execSync('ROLLBACK');
    throw e;
  }
}

// ---- Sincronização (usado por src/sync/sync.js) ----
// Na nuvem as referências usam uuid (module_uuid, subject_uuid) em vez dos ids
// locais, porque cada aparelho tem seus próprios ids numéricos.

export const SYNC_TABLES = ['modules', 'subjects', 'tasks', 'steps', 'pomodoro_sessions'];

export function getRowsForPush(table, sinceIso) {
  const rows = db.getAllSync(
    `SELECT * FROM ${table} WHERE updated_at > ? AND uuid IS NOT NULL`,
    sinceIso
  );
  return rows.map((r) => toCloudRow(table, r));
}

function toCloudRow(table, r) {
  const base = { uuid: r.uuid, updated_at: r.updated_at, deleted: r.deleted };
  switch (table) {
    case 'modules':
      return { ...base, name: r.name, position: r.position };
    case 'subjects': {
      const mod = r.module_id
        ? db.getFirstSync('SELECT uuid FROM modules WHERE id = ?', r.module_id)
        : null;
      return { ...base, module_uuid: mod?.uuid ?? null, name: r.name, color: r.color };
    }
    case 'tasks': {
      const sub = r.subject_id
        ? db.getFirstSync('SELECT uuid FROM subjects WHERE id = ?', r.subject_id)
        : null;
      return {
        ...base,
        title: r.title,
        type: r.type,
        subject_uuid: sub?.uuid ?? null,
        due_date: r.due_date,
        remind_minutes: r.remind_minutes,
        repeat_days: r.repeat_days,
        done: r.done,
        completed_at: r.completed_at,
        grade: r.grade,
      };
    }
    case 'steps':
      return { ...base, task_uuid: r.task_uuid, title: r.title, done: r.done, position: r.position };
    case 'pomodoro_sessions':
      return { ...base, minutes: r.minutes, finished_at: r.finished_at };
    default:
      return base;
  }
}

// Aplica uma linha vinda da nuvem: a modificação mais recente vence (LWW).
// notification_id nunca é tocado — cada aparelho agenda seus próprios lembretes.
export function applyCloudRow(table, row) {
  const local = db.getFirstSync(`SELECT * FROM ${table} WHERE uuid = ?`, row.uuid);
  if (local && local.updated_at && local.updated_at >= row.updated_at) return;

  if (table === 'modules') {
    upsert(table, local, {
      uuid: row.uuid, name: row.name, position: row.position ?? 0,
      updated_at: row.updated_at, deleted: row.deleted ?? 0,
    });
  } else if (table === 'subjects') {
    const mod = row.module_uuid
      ? db.getFirstSync('SELECT id FROM modules WHERE uuid = ?', row.module_uuid)
      : null;
    upsert(table, local, {
      uuid: row.uuid, module_id: mod?.id ?? null, name: row.name, color: row.color,
      updated_at: row.updated_at, deleted: row.deleted ?? 0,
    });
  } else if (table === 'tasks') {
    const sub = row.subject_uuid
      ? db.getFirstSync('SELECT id FROM subjects WHERE uuid = ?', row.subject_uuid)
      : null;
    upsert(table, local, {
      uuid: row.uuid, title: row.title, type: row.type, subject_id: sub?.id ?? null,
      due_date: row.due_date, remind_minutes: row.remind_minutes ?? 1440,
      repeat_days: row.repeat_days, done: row.done ?? 0, completed_at: row.completed_at,
      grade: row.grade, updated_at: row.updated_at, deleted: row.deleted ?? 0,
    });
  } else if (table === 'steps') {
    upsert(table, local, {
      uuid: row.uuid, task_uuid: row.task_uuid, title: row.title, done: row.done ?? 0,
      position: row.position ?? 0, updated_at: row.updated_at, deleted: row.deleted ?? 0,
    });
  } else if (table === 'pomodoro_sessions') {
    upsert(table, local, {
      uuid: row.uuid, minutes: row.minutes, finished_at: row.finished_at,
      updated_at: row.updated_at, deleted: row.deleted ?? 0,
    });
  }
}

function upsert(table, local, fields) {
  const cols = Object.keys(fields);
  if (local) {
    const sets = cols.map((c) => `${c} = ?`).join(', ');
    db.runSync(`UPDATE ${table} SET ${sets} WHERE id = ?`, ...cols.map((c) => fields[c]), local.id);
  } else {
    db.runSync(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      ...cols.map((c) => fields[c])
    );
  }
}
