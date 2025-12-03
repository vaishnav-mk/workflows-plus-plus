'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [textureUrl, setTextureUrl] = useState<string>('');

  const cellSize = 16;
  const borderPx = 2;

  const driftSpeed = 16;
  const easing = 0.12;

  const colorGrid = useRef<Map<string, string>>(new Map());
  const lastTextureUpdate = useRef<number>(0);

  function pickColor() {
    const r = Math.random();

    if (r < 0.75) {
      const grays = ['#F2F2F2', '#EAEAEA', '#E0E0E0', '#D7D7D7'];
      return grays[Math.floor(Math.random() * grays.length)];
    }

    if (r < 0.9) return '#FFFFFF';
    return '#1447E6';
  }

  function getCellColor(x: number, y: number) {
    const key = `${x},${y}`;
    if (!colorGrid.current.has(key)) {
      colorGrid.current.set(key, pickColor());
    }
    return colorGrid.current.get(key)!;
  }

  function drawGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    offsetX: number,
    offsetY: number
  ) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = borderPx;
    ctx.strokeStyle = '#d1d5db';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const baseX = Math.floor(offsetX / cellSize) * cellSize;
    const baseY = Math.floor(offsetY / cellSize) * cellSize;

    for (let y = -cellSize; y < height + cellSize; y += cellSize) {
      for (let x = -cellSize; x < width + cellSize; x += cellSize) {
        const worldX = baseX + x;
        const worldY = baseY + y;

        const screenX = x - (offsetX % cellSize);
        const screenY = y - (offsetY % cellSize);

        const color = getCellColor(worldX, worldY);

        const padding = borderPx / 2;
        const size = cellSize - borderPx;

        ctx.fillStyle = color;
        ctx.fillRect(
          screenX + padding,
          screenY + padding,
          size,
          size
        );

        ctx.strokeRect(
          screenX + padding,
          screenY + padding,
          size,
          size
        );

        // Add "4" to grey boxes and "0" to white boxes
        const isGrey = color !== '#FFFFFF' && color !== '#1447E6';
        const isWhite = color === '#FFFFFF';
        
        if (isGrey || isWhite) {
          ctx.fillStyle = '#000000';
          ctx.fillText(
            isGrey ? '4' : '0',
            screenX + padding + size / 2,
            screenY + padding + size / 2
          );
        }
      }
    }
  }

  useEffect(() => {
    let raf = 0;
    let lastTime = performance.now();

    let targetX = 0;
    let targetY = 0;
    let smoothX = 0;
    let smoothY = 0;

    function animate(time: number) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const delta = (time - lastTime) / 1000;
      lastTime = time;

      targetX += driftSpeed * delta;
      targetY += driftSpeed * 0.5 * delta;

      smoothX += (targetX - smoothX) * easing;
      smoothY += (targetY - smoothY) * easing;

      drawGrid(ctx, width, height, smoothX, smoothY);

      if (time - lastTextureUpdate.current > 200) {
        lastTextureUpdate.current = time;
        try {
          setTextureUrl(canvas.toDataURL());
        } catch {}
      }

      raf = requestAnimationFrame(animate);
    }

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden bg-white">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        aria-hidden
      />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center">
        <h1
          className="font-black leading-none select-none"
          style={{
            fontSize: 'clamp(6rem, 20vw, 16rem)',
            backgroundImage: textureUrl ? `url(${textureUrl})` : undefined,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            WebkitTextFillColor: 'transparent',
            backgroundRepeat: 'repeat',
            backgroundSize: `${cellSize}px ${cellSize}px`,
          } as React.CSSProperties}
        >
          404
        </h1>

        <div className="flex gap-4 mt-10">
          <Link href="/" className="no-underline">
            <Button variant="primary">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </Link>

          <Button variant="secondary" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
