// Cliente do Supabase (nuvem para sincronizar celular e tablet).
//
// CONFIGURAÇÃO: preencha as duas constantes abaixo com os dados do seu projeto
// (Supabase → Settings → API). Enquanto estiverem vazias, o app funciona
// normalmente, só sem sincronização. Passo a passo completo em SUPABASE.md.

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = ''; // ex.: 'https://abcdefgh.supabase.co'
export const SUPABASE_ANON_KEY = ''; // a "anon public" key do projeto

export function isSyncConfigured() {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

export const supabase = isSyncConfigured()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
