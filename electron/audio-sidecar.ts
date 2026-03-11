import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import type { SessionAnalysisResult } from '../shared/types';
import {
  getAudioAnalyzePath,
  getAudioCapturePath,
  makeRecordingFileName,
} from './utils';

type SidecarProcess = ReturnType<typeof spawn> | null;

export type AudioStateAccess = {
  getAudioSidecar: () => SidecarProcess;
  setAudioSidecar: (value: SidecarProcess) => void;
  getAudioRecordingPath: () => string | null;
  setAudioRecordingPath: (value: string | null) => void;
  getAudioRecordingUrl: () => string | null;
  setAudioRecordingUrl: (value: string | null) => void;
};

export function startAudioSidecar({
  state,
  recordingsPath,
  appRoot,
  startRecording = true,
}: {
  state: AudioStateAccess;
  recordingsPath: string;
  appRoot: string;
  startRecording?: boolean;
}) {
  const exe = getAudioCapturePath(appRoot);
  let sidecar = state.getAudioSidecar();

  if (!sidecar) {
    sidecar = spawn(exe, ['--record-stdio'], {
      stdio: ['pipe', 'ignore', 'pipe'],
    });

    state.setAudioSidecar(sidecar);

    sidecar.stderr?.on('data', (chunk: Buffer) => {
      console.info(chunk.toString('utf8'));
    });

    sidecar.on('exit', () => {
      state.setAudioSidecar(null);
    });
  }

  if (startRecording) {
    const outputPath = path.join(recordingsPath, makeRecordingFileName());
    const outputUrl = pathToFileURL(outputPath).toString();
    state.setAudioRecordingPath(outputPath);
    state.setAudioRecordingUrl(outputUrl);

    try {
      sidecar.stdin?.write(`start ${outputPath}\n`);
    } catch (error) {
      throw new Error(`[audio-sidecar] failed to start recording: ${String(error)}`);
    }
  }
}

export async function stopAudioSidecar({
  state,
}: {
  state: AudioStateAccess;
}) {
  const current = state.getAudioSidecar();
  if (!current) {
    return { ok: true, alreadyStopped: true };
  }

  const sidecar = current;
  const outputPath = state.getAudioRecordingPath();
  const outputUrl = state.getAudioRecordingUrl();

  try {
    sidecar.stdin?.write('stop\n');
  } catch {
    // Ignore write failures for now
  }

  // Wait without killing standby sidecar
  await new Promise((resolve) => { setTimeout(resolve, 250); });

  let fileSize: number | null = null;
  if (outputPath) {
    try {
      fileSize = fs.statSync(outputPath).size;
    } catch {
      fileSize = null;
    }
  }

  return {
    ok: true,
    path: outputPath ?? undefined,
    url: outputUrl ?? undefined,
    saved: fileSize !== null && fileSize > 44,
    fileSize,
  };
}

export async function disposeAudioSidecar({
  state,
}: {
  state: AudioStateAccess;
}) {
  const current = state.getAudioSidecar();
  if (!current) return;

  const sidecar = current;
  const exitPromise = new Promise<'exit'>((resolve) => {
    sidecar.once('exit', () => resolve('exit'));
  });

  try {
    sidecar.stdin?.write('quit\n');
    sidecar.stdin?.end();
  } catch {
    // Ignore write failures for now
  }

  const exitResult = await Promise.race([
    exitPromise,
    new Promise<'timeout'>((resolve) => {
      setTimeout(() => resolve('timeout'), 3000);
    }),
  ]);

  if (exitResult === 'timeout') {
    sidecar.kill('SIGTERM');
  }
}

export function analyzeRecordingFile({
  filePath,
  referenceNotes,
  appRoot,
  resolveRecordingPath,
}: {
  filePath: string
  referenceNotes?: Array<{
    id: number;
    timestamp: number;
    length: number;
    midi: number;
  }>
  appRoot: string
  resolveRecordingPath: (filePath: string) => string
}): Promise<SessionAnalysisResult> {
  const resolvedPath = resolveRecordingPath(filePath);
  const exe = getAudioAnalyzePath(appRoot);

  return new Promise((resolve, reject) => {
    const analyzer = spawn(exe, ['--analyze-wav', resolvedPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (referenceNotes?.length) {
      analyzer.stdin?.write(JSON.stringify(referenceNotes));
    }
    analyzer.stdin?.end();

    let stdoutOutput = '';
    let stderrOutput = '';

    analyzer.stdout?.on('data', (chunk: Buffer) => {
      stdoutOutput += chunk.toString('utf8');
    });

    analyzer.stderr?.on('data', (chunk: Buffer) => {
      stderrOutput += chunk.toString('utf8');
    });

    analyzer.once('exit', (code) => {
      if (code !== 0) {
        reject(new Error(stderrOutput || `audio analyzer exited with code ${code}`));
        return;
      }

      resolve(JSON.parse(stdoutOutput));
    });
  });
}
