// Paletas de cor (clara e escura), tipos de tarefa e cores de matéria.
// Os componentes pegam a paleta ativa via useTheme() (src/theme-context.js).

export const palettes = {
  light: {
    background: '#FFF5F8',
    card: '#FFFFFF',
    primary: '#E75480',
    primaryLight: '#FBDDE8',
    text: '#3D2C35',
    textMuted: '#9B8A93',
    border: '#F3DCE4',
    success: '#6BBF73',
    danger: '#E05B5B',
  },
  dark: {
    background: '#1E1418',
    card: '#2B1E25',
    primary: '#F06292',
    primaryLight: '#4A2E3B',
    text: '#F5E9EE',
    textMuted: '#A78B97',
    border: '#3D2A33',
    success: '#7BC47F',
    danger: '#E57373',
  },
};

// Cores fixas por tipo (funcionam bem nos dois temas).
export const taskTypes = {
  prova: { label: 'Prova', emoji: '📝', color: '#E05B5B' },
  trabalho: { label: 'Trabalho', emoji: '📚', color: '#5B8DE0' },
  tarefa: { label: 'Tarefa', emoji: '✏️', color: '#E75480' },
};

// Paleta para a usuária escolher a cor de cada matéria.
export const SUBJECT_COLORS = [
  '#E75480', // rosa
  '#5B8DE0', // azul
  '#6BBF73', // verde
  '#F2A65A', // laranja
  '#9B6BD1', // roxo
  '#4FB8C7', // ciano
  '#E0575B', // vermelho
  '#8D6E63', // marrom
];
