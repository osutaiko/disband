import { useEffect, useRef, useCallback } from "react";

const BUFFER_SIZE = 48000; // 1 second @ 48kHz

export function useRealtimeAudio() {
  const bufferRef = useRef<Float32Array>(new Float32Array(BUFFER_SIZE));
  const writeIndexRef = useRef(0);
  const runningRef = useRef(false);

  const start = useCallback(() => {
    if (runningRef.current) return;
    console.log("[audio] START recording");

    // Reset state for a clean recording
    runningRef.current = true;
    writeIndexRef.current = 0;
    bufferRef.current.fill(0);

    window.audio.start();
  }, []);

  const stop = useCallback(() => {
    if (!runningRef.current) return;
    console.log("[audio] STOP recording");

    runningRef.current = false;
    window.audio
      .stop()
      .then((result) => {
        console.log("[audio] file saved", result);
      })
      .catch((error) => {
        console.error("[audio] failed to save file", error);
      });
  }, []);

  useEffect(() => {
    const unsubscribe = window.audio.onChunk((data: ArrayBuffer) => {
      if (!runningRef.current) return;

      const view = new DataView(data);
      const sampleCount = Math.floor(view.byteLength / 4);
      const input = new Float32Array(sampleCount);
      for (let i = 0; i < sampleCount; i++) {
        const sample = view.getFloat32(i * 4, true);
        input[i] = Number.isFinite(sample) ? sample : 0;
      }

      const buffer = bufferRef.current;
      let writeIndex = writeIndexRef.current;

      for (let i = 0; i < input.length; i++) {
        buffer[writeIndex] = input[i];
        writeIndex = (writeIndex + 1) % buffer.length;
      }

      writeIndexRef.current = writeIndex;
    });

    return () => {
      unsubscribe();
    };
  }, [stop]);

  return {
    bufferRef,
    start,
    stop,
  };
}
