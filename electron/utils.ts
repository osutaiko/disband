import path from 'node:path';

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
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `capture-${yyyy}${mm}${dd}-${hh}${min}${ss}-${ms}.wav`;
}
