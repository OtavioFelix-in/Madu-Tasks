// Estado global do Pomodoro, independente de qual aba está aberta.
//
// Antes o timer vivia dentro da PomodoroScreen, e como o App só renderiza a aba
// ativa, trocar de aba desmontava a tela e o cronômetro morria. Agora o estado
// mora aqui (fora do React), é salvo no banco (settings) e o tempo restante é
// sempre calculado por `endsAt - agora`. Assim ele continua certo ao trocar de
// aba, com o app em segundo plano, ou mesmo depois do app ser fechado: se o ciclo
// terminou enquanto isso, ele é contabilizado na próxima abertura.

import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import * as db from '../db/database';
import { cancelReminder, schedulePomodoroEnd } from '../notifications/notifications';
import { queueSync } from '../sync/sync';

const STATE_KEY = 'pomodoro_state';
const clamp = (n) => Math.min(120, Math.max(1, n));

let state = null;
let ticker = null;
const listeners = new Set();

export function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const secondsFor = (mode) => (mode === 'foco' ? state.focusMin : state.breakMin) * 60;

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  db.setSetting(
    STATE_KEY,
    JSON.stringify({
      mode: state.mode,
      endsAt: state.endsAt,
      remaining: state.remaining,
      notifId: state.notifId,
    })
  );
}

// Troca o estado, salva e avisa quem está ouvindo.
function update(patch, { save = true } = {}) {
  state = { ...state, ...patch };
  if (save) persist();
  emit();
}

function ensureTicker() {
  if (state.running && !ticker) {
    ticker = setInterval(tick, 500);
  } else if (!state.running && ticker) {
    clearInterval(ticker);
    ticker = null;
  }
}

function tick() {
  if (!state.running) return;
  const left = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
  if (left <= 0) {
    finishCycle();
  } else if (left !== state.remaining) {
    update({ remaining: left }, { save: false }); // endsAt já está salvo
  }
}

function finishCycle() {
  const wasFocus = state.mode === 'foco';
  const endedAt = new Date(state.endsAt);
  if (wasFocus) {
    db.addPomodoroSession(state.focusMin, endedAt);
    queueSync();
  }
  const next = wasFocus ? 'pausa' : 'foco';
  // A notificação do fim do ciclo já disparou sozinha.
  update({
    mode: next,
    running: false,
    endsAt: null,
    notifId: null,
    remaining: secondsFor(next),
    doneToday: db.getPomodorosToday(),
  });
  ensureTicker();
}

// Chamar uma vez, logo depois de initDatabase().
export function initPomodoro() {
  if (state) return;
  const focusMin = clamp(parseInt(db.getSetting('pomodoro_focus', '25'), 10) || 25);
  const breakMin = clamp(parseInt(db.getSetting('pomodoro_break', '5'), 10) || 5);
  state = {
    focusMin,
    breakMin,
    mode: 'foco',
    running: false,
    endsAt: null,
    remaining: focusMin * 60,
    notifId: null,
    doneToday: db.getPomodorosToday(),
  };

  let saved = null;
  try {
    saved = JSON.parse(db.getSetting(STATE_KEY, 'null'));
  } catch {
    saved = null;
  }
  if (saved && (saved.mode === 'foco' || saved.mode === 'pausa')) {
    state.mode = saved.mode;
    state.notifId = saved.notifId ?? null;
    if (saved.endsAt) {
      state.running = true;
      state.endsAt = saved.endsAt;
      state.remaining = Math.max(0, Math.ceil((saved.endsAt - Date.now()) / 1000));
    } else {
      state.remaining = saved.remaining > 0 ? saved.remaining : secondsFor(saved.mode);
    }
  }

  // Terminou com o app fechado? Contabiliza agora.
  if (state.running && state.endsAt <= Date.now()) finishCycle();
  ensureTicker();

  // Ao voltar do segundo plano o setInterval pode ter ficado parado: reconfere.
  AppState.addEventListener('change', (status) => {
    if (status === 'active') tick();
  });
}

// ---- Ações ----

export async function startPomodoro() {
  if (state.running) return;
  const endsAt = Date.now() + state.remaining * 1000;
  update({ running: true, endsAt });
  ensureTicker();
  const notifId = await schedulePomodoroEnd(new Date(endsAt), state.mode === 'pausa');
  if (state.running && state.endsAt === endsAt) {
    update({ notifId });
  } else {
    await cancelReminder(notifId); // pausou/zerou enquanto agendava
  }
}

export async function pausePomodoro() {
  if (!state.running) return;
  const left = Math.max(1, Math.ceil((state.endsAt - Date.now()) / 1000));
  const notifId = state.notifId;
  update({ running: false, endsAt: null, notifId: null, remaining: left });
  ensureTicker();
  await cancelReminder(notifId);
}

export async function resetPomodoro() {
  const notifId = state.notifId;
  update({ running: false, endsAt: null, notifId: null, remaining: secondsFor(state.mode) });
  ensureTicker();
  await cancelReminder(notifId);
}

export async function setPomodoroMode(mode) {
  if (mode === state.mode) return;
  const notifId = state.notifId;
  update({ mode, running: false, endsAt: null, notifId: null, remaining: secondsFor(mode) });
  ensureTicker();
  await cancelReminder(notifId);
}

// Ajusta a duração do foco/pausa (só com o timer parado).
export function adjustPomodoro(kind, delta) {
  if (state.running) return;
  if (kind === 'foco') {
    const next = clamp(state.focusMin + delta);
    db.setSetting('pomodoro_focus', next);
    update({ focusMin: next, ...(state.mode === 'foco' ? { remaining: next * 60 } : {}) });
  } else {
    const next = clamp(state.breakMin + delta);
    db.setSetting('pomodoro_break', next);
    update({ breakMin: next, ...(state.mode === 'pausa' ? { remaining: next * 60 } : {}) });
  }
}

export function refreshPomodoroToday() {
  update({ doneToday: db.getPomodorosToday() }, { save: false });
}

// ---- Hook ----

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePomodoro() {
  return useSyncExternalStore(subscribe, () => state);
}
