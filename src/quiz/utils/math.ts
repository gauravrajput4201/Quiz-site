import { PERCENT, PERCENT_DECIMALS } from '../config/quiz.constants';

const ROUNDING_FACTOR = 10 ** PERCENT_DECIMALS;

/** Percentage rounded to one decimal; 0 when the denominator is 0. */
export function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * PERCENT * ROUNDING_FACTOR) / ROUNDING_FACTOR;
}

export function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function formatPercent(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(PERCENT_DECIMALS)}%`;
}

export function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
