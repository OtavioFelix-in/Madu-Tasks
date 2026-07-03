# Configurar a sincronização (Supabase) ☁️

A sincronização deixa o MaduTasks igual nos dois aparelhos (celular e tablet).
O app continua **offline-first**: funciona sem internet e sincroniza quando dá.

## Passo a passo (uma vez só, ~10 minutos)

1. **Criar o projeto**
   - Crie uma conta gratuita em [supabase.com](https://supabase.com)
   - "New project" → dê um nome (ex.: `madutasks`) e uma senha de banco → Create

2. **Criar as tabelas**
   - No painel do projeto: **SQL Editor** → New query
   - Cole o conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql) → Run

3. **Criar a usuária da Madu**
   - **Authentication → Users → Add user → Create new user**
   - Email dela + uma senha (marque "Auto Confirm User")

4. **Pegar as chaves**
   - **Project Settings → API**
   - Copie a **Project URL** e a **anon public key**

5. **Colar no app**
   - Abra [`src/sync/supabase.js`](src/sync/supabase.js) e preencha:
     ```js
     export const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
     export const SUPABASE_ANON_KEY = 'SUA-ANON-KEY';
     ```
   - Gere o APK de novo e instale nos dois aparelhos

6. **Entrar**
   - No app: aba **Resumo → ☁️ Sincronização** → email e senha → Entrar
   - Faça isso no celular e no tablet. Pronto!

## Como funciona por dentro

- Toda linha tem `uuid` (identidade global), `updated_at` e `deleted`
- **Pull**: baixa o que mudou na nuvem desde o último sync e aplica localmente
  (a modificação mais recente vence — *last write wins*)
- **Push**: envia o que mudou localmente
- Apagar vira `deleted = 1` (soft delete), para a exclusão viajar entre aparelhos
- O sync roda ao abrir o app, alguns segundos depois de cada alteração,
  e no botão "Sincronizar agora"

## Limitações conhecidas

- **Notificações são por aparelho**: uma tarefa criada no celular não agenda
  lembrete no tablet (o app do tablet mostraria a tarefa, mas quem notifica é
  o aparelho onde ela foi criada/editada).
- A `anon key` pode ficar no código sem medo: a segurança vem do login + RLS
  (cada usuária só acessa as próprias linhas).
