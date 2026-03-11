import fs from 'node:fs';
import path from 'node:path';

export const AUDIO_SAMPLE_RATE = 48_000;
export const AUDIO_CHANNEL_COUNT = 1;
export const AUDIO_BITS_PER_SAMPLE = 16;
export const AUDIO_FORMAT_PCM = 1;

function getAudioBinBasePath(appRoot: string) {
  const base = path.join(appRoot, 'native', 'audio-engine', 'bin', process.platform);
  return base;
}

export function getAudioCapturePath(appRoot: string) {
  const base = getAudioBinBasePath(appRoot);
  const exe = process.platform === 'win32' ? 'disband-audio-capture.exe' : 'disband-audio-capture';
  return path.join(base, exe);
}

export function getAudioAnalyzePath(appRoot: string) {
  const base = getAudioBinBasePath(appRoot);
  const exe = process.platform === 'win32' ? 'disband-audio-analyze.exe' : 'disband-audio-analyze';
  return path.join(base, exe);
}

export function isPathInside(basePath: string, targetPath: string): boolean {
  const relativePath = path.relative(basePath, targetPath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

export function resolveAndValidateRecordingPath(
  filePath: string,
  appRoot: string,
  allowedBasePaths: string[],
): string {
  if (!filePath) {
    throw new Error('Invalid recording path');
  }

  const resolvedPath = path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(appRoot, filePath);

  const isAllowedPath = allowedBasePaths.some((basePath) => isPathInside(basePath, resolvedPath));
  if (!isAllowedPath) {
    throw new Error('Invalid recording path');
  }

  return resolvedPath;
}

export function pad2(value: number) {
  return value.toString().padStart(2, '0');
}

export function makeRecordingFileName(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const min = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  return `capture-${yyyy}${mm}${dd}-${hh}${min}${ss}.wav`;
}

export function writePcm16WavFile(filePath: string, pcm16Data: Buffer) {
  const dataSize = pcm16Data.length;
  const blockAlign = AUDIO_CHANNEL_COUNT * (AUDIO_BITS_PER_SAMPLE / 8);
  const byteRate = AUDIO_SAMPLE_RATE * blockAlign;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM fmt chunk size
  header.writeUInt16LE(AUDIO_FORMAT_PCM, 20);
  header.writeUInt16LE(AUDIO_CHANNEL_COUNT, 22);
  header.writeUInt32LE(AUDIO_SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(AUDIO_BITS_PER_SAMPLE, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, Buffer.concat([header, pcm16Data], 44 + dataSize));
}
