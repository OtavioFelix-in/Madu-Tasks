# MaduTasks 💖

App de tarefas de estudo feito para a Madu — provas, trabalhos e entregas com lembretes automáticos.

Feito com **React Native + Expo (SDK 57)**, 100% offline: os dados ficam num banco SQLite no próprio aparelho, sem servidor.

## Como funciona

O app tem 4 abas: **✅ Tarefas**, **📅 Calendário**, **🍅 Pomodoro** e **📊 Resumo**.

- Cada tarefa tem título, tipo (📝 prova, 📚 trabalho, ✏️ tarefa), matéria opcional, prazo
  e **quando lembrar** (na hora, 1h, 1 dia ou 3 dias antes).
- Toque no card para **editar**; toque no círculo para concluir; toque longo para apagar.
- O calendário mostra bolinhas nos dias com tarefa — toque num dia para ver a lista.
- O Pomodoro alterna 25 min de foco e 5 de pausa, com notificação ao fim de cada ciclo.
- O Resumo conta tarefas concluídas no mês, pendentes, atrasadas e pomodoros feitos.

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

## Ideias para a v3

- Matérias com cores próprias e filtro por matéria
- Repetição de tarefas (ex.: "toda segunda")
- Sincronização entre celular e tablet (Supabase)
- Tema escuro
