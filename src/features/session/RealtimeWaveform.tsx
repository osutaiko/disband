import { useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';

function RealtimeWaveform({
  audioPath,
  className,
}: {
  audioPath: string | null;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current || waveSurferRef.current) return;

    waveSurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      height: 'auto',
      waveColor: '#a855f7',
      progressColor: '#a855f7',
      cursorWidth: 0,
      interact: false,
      dragToSeek: false,
      normalize: true,
    });

    return () => {
      waveSurferRef.current?.destroy();
      waveSurferRef.current = null;
    };
  }, []);

  useEffect(() => {
    const waveSurfer = waveSurferRef.current;
    if (!waveSurfer) return;

    if (!audioPath) {
      waveSurfer.empty();
      return;
    }

    let cancelled = false;

    window.audio
      .readRecording(audioPath)
      .then((data) => {
        if (cancelled) return;
        const blob = new Blob([data], { type: 'audio/wav' });
        return waveSurfer.loadBlob(blob);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('[wavesurfer] failed to load recording', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [audioPath]);

  return <div ref={containerRef} className={className} />;
}

export default RealtimeWaveform;
