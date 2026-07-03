// Formatação de datas em pt-BR sem depender de Intl/locale do aparelho.

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

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
