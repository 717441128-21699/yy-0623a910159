export function formatDate(
  date: string | Date | null | undefined,
  pattern: 'full' | 'date' | 'datetime' | 'time' = 'datetime',
): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';

  const pad = (n: number) => n.toString().padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  switch (pattern) {
    case 'full':
      return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
    case 'date':
      return `${y}-${m}-${day}`;
    case 'datetime':
      return `${y}-${m}-${day} ${hh}:${mm}`;
    case 'time':
      return `${hh}:${mm}`;
    default:
      return `${y}-${m}-${day} ${hh}:${mm}`;
  }
}

export function nowISO(): string {
  return new Date().toISOString();
}
