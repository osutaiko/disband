import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCssColor(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function midiToNoteName(midi: number | null | undefined) {
  if (midi == null || !Number.isFinite(midi) || midi < 0) return '-';
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const rounded = Math.round(midi);
  const pitchClass = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  return `${names[pitchClass]}${octave}`;
}


export function valsMean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function valsTruncatedMean(values: number[], threshold: number): number {
  if (values.length === 0) return 0;

  if (threshold === 0) {
    return valsMean(values);
  }

  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.floor(sorted.length * threshold);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  
  return valsMean(trimmed.length > 0 ? trimmed : sorted);
}

export function valsStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = valsMean(values);
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}
