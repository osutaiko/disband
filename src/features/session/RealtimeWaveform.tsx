import { useEffect, useRef } from 'react';

function RealtimeWaveform({
  audioBufferRef,
  className,
}: {
  audioBufferRef: React.MutableRefObject<Float32Array>;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    let animationId = 0;

    const resizeCanvas = () => {
      const width = Math.max(1, Math.floor(canvas.clientWidth));
      const height = Math.max(1, Math.floor(canvas.clientHeight));
      const nextWidth = Math.floor(width * dpr);
      const nextHeight = Math.floor(height * dpr);

      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
    };

    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });
    observer.observe(canvas);
    resizeCanvas();

    const draw = () => {
      const buffer = audioBufferRef.current;
      const displayWidth = Math.max(1, Math.floor(canvas.clientWidth));
      const displayHeight = Math.max(1, Math.floor(canvas.clientHeight));

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = dpr;
      ctx.beginPath();

      const step = Math.max(1, Math.floor(buffer.length / displayWidth));
      const mid = displayHeight / 2;

      for (let x = 0; x < displayWidth; x++) {
        const sample = buffer[x * step] || 0;
        const y = mid - sample * mid;
        const px = x * dpr;
        const py = y * dpr;

        if (x === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }

      ctx.stroke();
      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
    };
  }, [audioBufferRef]);

  return <canvas ref={canvasRef} className={className} />;
}

export default RealtimeWaveform;
