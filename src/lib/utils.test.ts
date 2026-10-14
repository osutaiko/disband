import { describe, expect, it } from 'vitest';
import { hzToCentsDiff, midiToHz, midiToNoteName } from '@/lib/utils';

describe('midiToNoteName', () => {
  it.each([
    [0, 'C-1'],
    [127, 'G9'],
    [38, 'D2'],
    [94, 'A#6'],
    [59.25, 'B3'],
    [83.75, 'C6'],
  ])('converts MIDI note %s to %s', (midi, name) => {
    expect(midiToNoteName(midi)).toBe(name);
  });
});

describe('midiToHz', () => {
  it.each([
    [69, 440],
    [57, 220],
    [81, 880],
    [0, 8.176],
    [127, 12543.854],
    [38, 73.416],
    [94, 1864.655],
    [59.25, 246.942 * (2 ** (1 / 48))],
    [83.75, 1046.502 * (2 ** (-1 / 48))],
  ])('converts MIDI %s to %s Hz', (midi, hz) => {
    expect(midiToHz(midi)).toBeCloseTo(hz, 3);
  });
  
  it.each([null, undefined, -1, NaN, Infinity])('rejects invalid MIDI value %s', (midi) => {
    expect(midiToHz(midi)).toBeNull();
  });
});

describe('hzToCentsDiff', () => {
  it.each([
    [440, 440, 0],
    [880, 440, 1200],
    [391.995, 440, -200],
    [466.164, 440, 100],
  ])('compares %s Hz with %s Hz as %s cents', (played, reference, cents) => {
    expect(hzToCentsDiff(played, reference)).toBeCloseTo(cents, 1);
  });

  it.each([null, undefined, 0, -1, NaN, Infinity])('rejects invalid %s', (hz) => {
    expect(hzToCentsDiff(hz, 440)).toBeNull();
    expect(hzToCentsDiff(440, hz)).toBeNull();
  });
});
