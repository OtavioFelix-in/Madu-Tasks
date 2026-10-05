// Formatação de datas em pt-BR sem depender de Intl/locale do aparelho.

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTHS_FULL = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// Iniciais dos dias, para os chips de repetição e o cabeçalho do calendário.
export const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const WEEKDAYS_SHORT = WEEKDAYS;

function pad(n) {
  return String(n).padStart(2, '0');
}

export function formatDateTime(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${WEEKDAYS[d.getDay()]}, ${pad(d.getDate())} ${MONTHS[d.getMonth()]} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isOverdue(isoDate) {
  return new Date(isoDate) < new Date();
}

// Diferença em dias de calendário (ignora a hora) entre hoje e o prazo.
export function daysUntil(isoDate) {
  const now = new Date();
  const due = new Date(isoDate);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((startOfDue - startOfToday) / 86400000);
}

export function relativeLabel(isoDate) {
  const days = daysUntil(isoDate);
  if (isOverdue(isoDate)) return 'atrasada 😬';
  if (days === 0) return 'é hoje!';
  if (days === 1) return 'é amanhã';
  return `em ${days} dias`;
}

// ---- Repetição ----

// A regra fica em uma coluna de texto (repeat_days), em três formatos:
//   "1,3,5"  semanal: dias da semana (0=dom..6=sáb)  <- formato original, continua valendo
//   "m"      mensal: mesmo dia do mês
//   "i:15"   por intervalo: a cada 15 dias
export const MAX_REPEAT_INTERVAL = 365;

export function parseRepeat(rule) {
  if (!rule) return null;
  if (rule === 'm') return { kind: 'monthly' };
  if (rule.startsWith('i:')) {
    const n = parseInt(rule.slice(2), 10);
    return n >= 1 && n <= MAX_REPEAT_INTERVAL ? { kind: 'interval', n } : null;
  }
  const days = rule.split(',').map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return days.length > 0 ? { kind: 'weekly', days } : null;
}

export function serializeRepeat(repeat) {
  if (!repeat) return null;
  if (repeat.kind === 'monthly') return 'm';
  if (repeat.kind === 'interval') return `i:${repeat.n}`;
  return repeat.days.length > 0 ? repeat.days.join(',') : null;
}

// Próxima data (depois de fromDate) que cai num dos dias escolhidos (0=dom..6=sáb),
// mantendo o mesmo horário. Ex.: concluiu a de segunda, nasce a da próxima segunda.
export function nextOccurrence(fromDate, repeatDays) {
  if (!repeatDays || repeatDays.length === 0) return null;
  for (let i = 1; i <= 7; i++) {
    const candidate = new Date(fromDate);
    candidate.setDate(fromDate.getDate() + i);
    if (repeatDays.includes(candidate.getDay())) return candidate;
  }
  return null;
}

// Mesmo dia do mês seguinte; em meses mais curtos cai no último dia (31/01 -> 28/02).
function nextMonth(fromDate) {
  const next = new Date(fromDate);
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(fromDate.getDate(), lastDay));
  return next;
}

// Próxima ocorrência para qualquer tipo de regra, mantendo o horário.
export function nextRepeatDate(fromDate, rule) {
  const repeat = parseRepeat(rule);
  if (!repeat) return null;
  if (repeat.kind === 'weekly') return nextOccurrence(fromDate, repeat.days);
  if (repeat.kind === 'monthly') return nextMonth(fromDate);
  const next = new Date(fromDate);
  next.setDate(next.getDate() + repeat.n);
  return next;
}

// Texto curto para o card da tarefa.
export function repeatLabel(rule) {
  const repeat = parseRepeat(rule);
  if (!repeat) return '';
  if (repeat.kind === 'monthly') return 'todo mês';
  if (repeat.kind === 'interval') return repeat.n === 1 ? 'todo dia' : `a cada ${repeat.n} dias`;
  return 'toda semana';
}

// ---- Helpers do calendário ----

export function isSameDay(a, b) {
  return (
    a && b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function monthTitle(date) {
  return `${MONTHS_FULL[date.getMonth()]} de ${date.getFullYear()}`;
}

// Matriz do mês: array de semanas, cada semana com 7 posições (Date ou null
// nos espaços vazios do início/fim). Semana começa no domingo.
export function monthMatrix(year, month) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const weeks = [];
  let week = new Array(firstWeekday).fill(null);
  for (let day = 1; day <= totalDays; day++) {
    week.push(new Date(year, month, day));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    weeks.push([...week, ...new Array(7 - week.length).fill(null)]);
  }
  return weeks;
}
