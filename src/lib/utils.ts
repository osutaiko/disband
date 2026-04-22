import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { NoteJudgment, NoteJudgmentKind } from '../../shared/types';

export type CriterionName = keyof NoteJudgment['criteria'];
export type CriterionJudgmentStatus = 'ok' | 'inaccurate' | 'miss' | 'unjudged';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCssColor(name: string, fallback: string="black") {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function parseMs(ms: number) {
  return {
    minutes: Math.floor(ms / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
    milliseconds: Math.floor(ms % 1000),
  };
}

export function formatMs(ms: number | null) {
  if (ms === null) return '';
  const parsed = parseMs(ms);
  return `${parsed.minutes}:${parsed.seconds.toString().padStart(2, '0')}.${parsed.milliseconds.toString().padStart(3, '0')}`;
}

export function formatNumber(
  value: number | null,
  sign = false,
  unit = '',
  digits = 1,
) {
  if (value === null) return '-';
  const safeValue = Number.isFinite(value) ? value : 0;
  const formatted = safeValue.toFixed(digits);
  const signed = sign && safeValue > 0 ? `+${formatted}` : formatted;
  return `${signed}${unit ? ` ${unit}` : ''}`;
}

export function midiToNoteName(midi: number | null | undefined) {
  if (midi == null || !Number.isFinite(midi) || midi < 0) return '-';
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const rounded = Math.round(midi);
  const pitchClass = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  return `${names[pitchClass]}${octave}`;
}

// Consult judger.cpp in native/audio-engine/src for overall note judgment logic
export function getCriterionJudgmentStatus({
  criterion,
  noteJudgmentKind,
  pass,
}: {
  criterion: CriterionName;
  noteJudgmentKind: NoteJudgmentKind;
  pass: boolean | null;
}): CriterionJudgmentStatus {
  if (criterion === 'attack') return noteJudgmentKind;
  if (pass === true) return 'ok';
  if (pass === false) return 'miss';
  return 'unjudged';
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
