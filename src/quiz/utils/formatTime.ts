import { SECONDS_PER_MINUTE } from '../config/quiz.constants';

const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * 60;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Exam clock in total minutes: "60:00", "59:58", "120:00". */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  return `${pad(Math.floor(safe / SECONDS_PER_MINUTE))}:${pad(safe % SECONDS_PER_MINUTE)}`;
}

/** Test length label: "60 Minutes". */
export function formatMinutes(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / SECONDS_PER_MINUTE);
  return `${minutes} ${minutes === 1 ? 'Minute' : 'Minutes'}`;
}

/** Human duration: "42m 10s", "1h 5m", "35s". */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(safe / SECONDS_PER_HOUR);
  const minutes = Math.floor((safe % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const seconds = safe % SECONDS_PER_MINUTE;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${pad(seconds)}s`;
  return `${seconds}s`;
}

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
}
