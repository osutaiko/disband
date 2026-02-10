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
    window.audio.stop();
  }, []);

  useEffect(() => {
    const unsubscribe = window.audio.onChunk((data: ArrayBuffer) => {
      if (!runningRef.current) return;

      const input = new Float32Array(data);

      const nonZero = input.some((v) => Math.abs(v) > 1e-4);
      console.log(
        "[audio chunk]",
        "len =", input.length,
        "nonZero =", nonZero,
        "first =", Array.from(input.slice(0, 8))
      );

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
