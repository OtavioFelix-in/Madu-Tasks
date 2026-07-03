# MaduTasks 💖

App de tarefas de estudo feito para a Madu — provas, trabalhos e entregas com lembretes automáticos.

Feito com **React Native + Expo (SDK 57)**, 100% offline: os dados ficam num banco SQLite no próprio aparelho, sem servidor.

## Como funciona

- Cada tarefa tem título, tipo (📝 prova, 📚 trabalho, ✏️ tarefa), matéria opcional e prazo.
- Ao criar, o app agenda uma notificação **1 dia antes** do prazo (ou 1 hora antes, se já faltar menos de um dia).
- Toque na tarefa para marcar como concluída; toque longo para apagar.

## Estrutura

```
madu-tasks/
├── App.js                      # ponto de entrada, aplica tema e safe area
└── src/
    ├── theme.js                # cores e tipos de tarefa
    ├── db/database.js          # banco SQLite local (expo-sqlite)
    ├── notifications/          # agendamento de lembretes (expo-notifications)
    ├── utils/date.js           # formatação de datas em pt-BR
    ├── components/
    │   ├── TaskItem.js         # card de tarefa na lista
    │   └── TaskForm.js         # formulário de nova tarefa (bottom sheet)
    └── screens/HomeScreen.js   # tela principal
```

## Rodar em desenvolvimento

1. Instale o app **Expo Go** no celular (Play Store).
2. No PC, dentro desta pasta:

   ```bash
   npx expo start
   ```

3. Escaneie o QR code com o Expo Go (celular e PC na mesma rede Wi-Fi).

> Nota: no Expo Go (Android) os **lembretes ficam desativados** — o módulo de
> notificações não funciona dentro do Expo Go desde o SDK 53. No APK final
> (ou num build de desenvolvimento) eles funcionam normalmente.

## Gerar o APK para instalar no celular dela

1. Crie uma conta gratuita em [expo.dev](https://expo.dev).
2. Rode:

   ```bash
   npx eas-cli build -p android --profile preview
   ```

   Na primeira vez ele configura o projeto e cria o arquivo `eas.json`.
3. Ao final, o site do Expo dá um link para baixar o `.apk`.
4. Mande o APK para o celular (WhatsApp/Drive), toque nele e aceite "instalar de fontes desconhecidas".

## Ideias para a v2

- Visão de calendário/semana
- Editar tarefa existente
- Escolher quando ser lembrada (ex.: 3 dias antes)
- Timer Pomodoro para sessões de estudo
- Estatísticas ("você concluiu 12 tarefas este mês! 🎉")
