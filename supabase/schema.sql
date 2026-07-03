-- Schema do MaduTasks na nuvem (rodar no SQL Editor do Supabase).
-- Espelha as tabelas locais do SQLite; referências usam uuid (module_uuid,
-- subject_uuid, task_uuid) porque cada aparelho tem ids numéricos próprios.
-- RLS garante que cada usuária só enxerga as próprias linhas.

create table if not exists modules (
  uuid text primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  name text not null,
  position integer not null default 0,
  updated_at text not null,
  deleted integer not null default 0
);

create table if not exists subjects (
  uuid text primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  module_uuid text,
  name text not null,
  color text not null,
  updated_at text not null,
  deleted integer not null default 0
);

create table if not exists tasks (
  uuid text primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  title text not null,
  type text not null default 'tarefa',
  subject_uuid text,
  due_date text not null,
  remind_minutes integer not null default 1440,
  repeat_days text,
  done integer not null default 0,
  completed_at text,
  grade real,
  updated_at text not null,
  deleted integer not null default 0
);

create table if not exists steps (
  uuid text primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  task_uuid text not null,
  title text not null,
  done integer not null default 0,
  position integer not null default 0,
  updated_at text not null,
  deleted integer not null default 0
);

create table if not exists pomodoro_sessions (
  uuid text primary key,
  user_id uuid not null default auth.uid() references auth.users (id),
  minutes integer not null,
  finished_at text not null,
  updated_at text not null,
  deleted integer not null default 0
);

-- Row Level Security: cada usuária só acessa o que é dela.
alter table modules enable row level security;
alter table subjects enable row level security;
alter table tasks enable row level security;
alter table steps enable row level security;
alter table pomodoro_sessions enable row level security;

create policy "own modules" on modules
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own subjects" on subjects
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tasks" on tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own steps" on steps
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own pomodoro_sessions" on pomodoro_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
