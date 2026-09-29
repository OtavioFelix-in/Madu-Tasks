<div align="center">

<img src="assets/icon.png" width="110" alt="MaduTasks" />

# MaduTasks 💖

**A agenda de estudos que nasceu de uma promessa.**

![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-offline--first-003B57?logo=sqlite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-sync-3ECF8E?logo=supabase&logoColor=white)
![Android](https://img.shields.io/badge/Android-APK-3DDC84?logo=android&logoColor=white)

</div>

---

## 💌 A história

Minha namorada, a **Madu**, faz um curso cheio de provas, trabalhos e entregas — e organizava tudo no **Bloco de Notas** do celular. Eu tinha prometido a ela um app de verdade pra isso.

O **MaduTasks** é essa promessa cumprida: um lugar bonito e simples pra ela anotar as provas e atividades, receber lembretes na hora certa e ter controle dos estudos sem depender de anotação solta. Feito com carinho, do zero, sob medida pra rotina dela. 💖

---

## ✨ Funcionalidades

**Organização**
- 📝 Tarefas com tipo (prova, trabalho, tarefa), prazo e lembrete configurável (na hora, 1h, 1 dia ou 3 dias antes)
- 📚 **Módulos → Matérias** com cores próprias, além de **filtro** e **busca**
- ☑️ **Etapas** (checklist) dentro de cada tarefa, com progresso no card
- 🔁 **Repetição** semanal, mensal ou a cada N dias: ao concluir, a próxima ocorrência nasce sozinha
- 📷 **Fotos** nas tarefas (câmera ou galeria), com miniaturas e visualização em tela cheia
- ✏️ Edição completa e conclusão com um toque

**Estudo**
- 📅 **Calendário** mensal com marcadores coloridos por matéria
- 🍅 **Pomodoro** com foco e pausa ajustáveis e notificação ao fim do ciclo. O cronômetro **continua rodando em qualquer aba**, com o app em segundo plano ou fechado
- 📝 **Notas das provas** com média por matéria
- 📊 **Resumo**: concluídas no mês, pendentes, atrasadas e **sequência de dias** estudando 🔥
- 🎉 Confete ao concluir uma tarefa

**Experiência**
- 🔔 Lembretes locais que funcionam com o app fechado
- 🧩 **Widget** na tela inicial do Android com as próximas tarefas
- 🌙 **Tema claro e escuro** (automático ou manual)
- 💾 **Backup** local (exportar/importar) e ☁️ **sincronização** entre celular e tablet
- 📴 **100% offline** — a internet só é usada (opcionalmente) para sincronizar

---

## 📱 Telas

<div align="center">

| Tarefas | Tema escuro | Calendário |
|:---:|:---:|:---:|
| <img src="docs/screenshots/home-light.png" width="230"/> | <img src="docs/screenshots/home-dark.png" width="230"/> | <img src="docs/screenshots/calendar.png" width="230"/> |
| **Pomodoro** | **Resumo** | **Matérias** |
| <img src="docs/screenshots/pomodoro.png" width="230"/> | <img src="docs/screenshots/stats.png" width="230"/> | <img src="docs/screenshots/subjects.png" width="230"/> |

</div>

---

## 🛠️ Tecnologias

- **React Native 0.86** + **Expo SDK 57** (um código só para celular e tablet)
- **expo-sqlite** — banco local, o app funciona sem internet
- **expo-notifications** — lembretes locais agendados
- **Supabase** (Postgres + Auth) — sincronização opcional na nuvem
- **JavaScript** puro, sem framework de UI externo (componentes próprios)

---

## 🏗️ Arquitetura

Offline-first: o **SQLite é a fonte da verdade** no aparelho; o Supabase é só uma cópia na nuvem para manter celular e tablet iguais (a alteração mais recente vence).

```
madu-tasks/
├── App.js                     # entrada: tema, abas e sincronização inicial
├── src/
│   ├── theme.js               # paletas (clara/escura), tipos e cores de matéria
│   ├── theme-context.js       # provedor de tema com alternância salva
│   ├── db/database.js         # SQLite + migrações + estatísticas + backup
│   ├── notifications/         # lembretes locais (expo-notifications)
│   ├── pomodoro/              # estado global do cronômetro (roda em qualquer aba)
│   ├── attachments/           # fotos das tarefas (câmera, galeria, arquivos)
│   ├── widget/                # grava o resumo lido pelo widget da tela inicial
│   ├── sync/                  # cliente Supabase + motor de sincronização
│   ├── utils/                 # datas em pt-BR e backup em arquivo
│   ├── components/            # cards, formulário, abas, gerenciador de matérias
│   └── screens/               # Tarefas, Calendário, Pomodoro e Resumo
├── plugins/task-widget/       # widget Android (Java + layout), instalado no prebuild
├── supabase/schema.sql        # tabelas + segurança (RLS) da nuvem
└── SUPABASE.md                # guia de configuração da sincronização
```

---

## 🚀 Rodando o projeto

**Desenvolvimento** (com o app Expo Go no celular):

```bash
npm install
npx expo start
```

**Gerar o APK** (build local com Android SDK):

```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
# APK em: android/app/build/outputs/apk/release/app-release.apk
```

Depois é só mandar o `.apk` para o celular, tocar nele e permitir a instalação.

**Atualizando um APK já instalado:** instale o novo `.apk` por cima, sem desinstalar, e os dados (tarefas, fotos, notas) ficam intactos. Para o Android aceitar a atualização, a cada versão nova aumente o `android.versionCode` no `app.json` (e o `version`). O pacote (`com.otavio.madutasks`) e a chave de assinatura precisam continuar os mesmos. Se aparecer "app não instalado", geralmente o `versionCode` não subiu ou o APK anterior foi assinado com outra chave.

> Os lembretes **não** funcionam dentro do Expo Go (limitação do Android desde o SDK 53), mas funcionam normalmente no APK instalado.

---

## ☁️ Sincronização entre aparelhos

Opcional e desligada por padrão. Para ligar (celular + tablet com os mesmos dados), siga o passo a passo em **[SUPABASE.md](SUPABASE.md)** — leva uns 10 minutos e usa o plano gratuito do Supabase.

---

## 🗺️ Próximos passos

**Já entregue na v1.1**
- ✅ Repetição mensal e por intervalo ("a cada 15 dias")
- ✅ Fotos nas tarefas
- ✅ Widget na tela inicial do Android
- ✅ Correção: o cronômetro só funcionava com a aba do Pomodoro aberta. Agora roda em qualquer tela, em segundo plano e com o app fechado

**Ideias para as próximas versões**
- Fotos no backup e na sincronização (hoje ficam só no aparelho)
- Widget que atualiza no instante em que uma tarefa muda (hoje: ao sair do app, a cada 15 min ou no botão ↻)
- Cronômetro com notificação fixa mostrando o tempo restante
- Anexar PDFs e outros arquivos, além de fotos

---

<div align="center">

Feito com 💖 para a **Madu**.

</div>
