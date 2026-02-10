import { useEffect, useRef } from "react";

export const RealtimeWaveform = ({
  audioBufferRef,
}: {
  audioBufferRef: React.MutableRefObject<Float32Array>;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const buffer = audioBufferRef.current;
    console.log(buffer)

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#a855f7";
      ctx.beginPath();

      const step = Math.floor(buffer.length / canvas.width);
      const mid = canvas.height / 2;

      for (let x = 0; x < canvas.width; x++) {
        const sample = buffer[x * step] || 0;
        const y = mid - sample * mid;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }

      ctx.stroke();
      requestAnimationFrame(draw);
    };

    draw();
  }, []);

  return <canvas ref={canvasRef} width={1200} height={120} />;
};

export default RealtimeWaveform;
