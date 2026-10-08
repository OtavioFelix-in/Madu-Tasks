// Paletas de cor (clara e escura), tipos de tarefa e cores de matéria.
// Os componentes pegam a paleta ativa via useTheme() (src/theme-context.js).

// Cores tiradas da logo (Promocional/Logo nova): rosa #E75480, vinho #5A2440,
// papel #FFF6F8, rosa-claro #FFD3DF; no escuro, fundo #190A11 e cartão #2B1220.
export const palettes = {
  light: {
    background: '#FFF6F8',
    card: '#FFFFFF',
    primary: '#E75480',
    primaryLight: '#FFE1EA',
    text: '#5A2440',
    textMuted: '#8E6479',
    border: '#F6DCE5',
    success: '#6BBF73',
    danger: '#E05B5B',
  },
  dark: {
    background: '#190A11',
    card: '#2B1220',
    primary: '#E75480',
    primaryLight: '#4A1D33',
    text: '#FFF6F8',
    textMuted: '#B48A9E',
    border: '#45233A',
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
