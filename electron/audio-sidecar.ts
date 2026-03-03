import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import type { SessionAnalysisResult } from '../shared/types';
import {
  getSidecarPath,
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
}: {
  state: AudioStateAccess;
  recordingsPath: string;
  appRoot: string;
}) {
  if (state.getAudioSidecar()) return;

  const exe = getSidecarPath(appRoot);
  const outputPath = path.join(recordingsPath, makeRecordingFileName());
  const outputUrl = pathToFileURL(outputPath).toString();

  const sidecar = spawn(exe, ['--output', outputPath], {
    stdio: ['pipe', 'ignore', 'pipe'],
  });

  state.setAudioSidecar(sidecar);
  state.setAudioRecordingPath(outputPath);
  state.setAudioRecordingUrl(outputUrl);

  sidecar.stderr?.on('data', (chunk: Buffer) => {
    console.info(chunk.toString('utf8'));
  });

  sidecar.on('exit', () => {
    state.setAudioSidecar(null);
  });
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

  const exitPromise = new Promise<'exit'>((resolve) => {
    sidecar.once('exit', () => resolve('exit'));
  });

  try {
    sidecar.stdin?.write('stop\n');
    sidecar.stdin?.end();
  } catch {
    // Ignore write failures for now
  }

  const exitResult = await Promise.race([
    exitPromise,
    new Promise<'timeout'>((resolve) => {
      setTimeout(() => resolve('timeout'), 1000);
    }),
  ]);

  if (exitResult === 'timeout') {
    sidecar.kill();
  }

  state.setAudioSidecar(null);

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
  const exe = getSidecarPath(appRoot);

  return new Promise((resolve, reject) => {
    const analyzer = spawn(exe, ['--analyze-wav', resolvedPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

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
    })
  })
}
