// Motor de sincronização offline-first.
//
// O SQLite continua sendo a fonte local: o app funciona 100% sem internet.
// Quando há conexão e login, o sync roda em duas fases:
//   1. PULL — baixa da nuvem o que mudou desde o último sync e aplica
//      localmente (a modificação mais recente vence, por updated_at).
//   2. PUSH — envia para a nuvem as linhas locais alteradas desde então.
// Exclusões viajam como deleted=1 (soft delete), nunca como DELETE físico.
//
// Limitação conhecida: lembretes/notificações são agendados por aparelho —
// uma tarefa criada no celular não agenda notificação no tablet.

import * as db from '../db/database';
import { isSyncConfigured, supabase } from './supabase';

export async function getSessionUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

export async function signIn(email, password) {
  if (!supabase) throw new Error('Sincronização não configurada');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

let syncing = false;

export async function syncNow() {
  if (!supabase || syncing) return { ok: false };
  const user = await getSessionUser();
  if (!user) return { ok: false };

  syncing = true;
  try {
    const startedAt = new Date().toISOString();
    const since = db.getSetting('last_sync', '1970-01-01T00:00:00.000Z');

    // PULL na ordem das dependências (módulo antes da matéria, etc.)
    for (const table of db.SYNC_TABLES) {
      const { data, error } = await supabase.from(table).select('*').gt('updated_at', since);
      if (error) throw error;
      for (const row of data ?? []) {
        db.applyCloudRow(table, row);
      }
    }

    // PUSH do que mudou localmente
    for (const table of db.SYNC_TABLES) {
      const rows = db.getRowsForPush(table, since);
      if (rows.length > 0) {
        const { error } = await supabase
          .from(table)
          .upsert(rows.map((r) => ({ ...r, user_id: user.id })), { onConflict: 'uuid' });
        if (error) throw error;
      }
    }

    db.setSetting('last_sync', startedAt);
    return { ok: true };
  } finally {
    syncing = false;
  }
}

// Sync com atraso: as telas chamam a cada alteração, sem travar a interface.
let timer = null;
export function queueSync() {
  if (!isSyncConfigured()) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    syncNow().catch(() => {}); // sem internet? tenta de novo no próximo sync
  }, 3000);
}
