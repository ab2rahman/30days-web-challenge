"use client";

import { useEffect, useRef } from "react";

const COLS = 3;
const ROWS = 2;
const TOTAL_FRAMES = COLS * ROWS;

type SpriteConfig = {
  src: string;
  frameW: number;
  frameH: number;
};

const SPRITES: Record<string, SpriteConfig> = {
  run: { src: "/zoro_run.png", frameW: 445, frameH: 363 },
  slash: { src: "/zoro.png", frameW: 290, frameH: 349 },
};

export default function ZoroPixelLoader({ sprite = "run", fps = 14, scale = 0.5 }: {
  sprite?: "run" | "slash";
  fps?: number;
  scale?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const config = SPRITES[sprite];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = config.src;
    imgRef.current = img;

    img.onload = () => {
      ctx!.imageSmoothingEnabled = false;

      const animate = (time: number) => {
        const delta = time - lastTimeRef.current;
        if (delta >= 1000 / fps) {
          lastTimeRef.current = time;

          const frame = frameRef.current;
          const col = frame % COLS;
          const row = Math.floor(frame / COLS);

          ctx!.clearRect(0, 0, config.frameW, config.frameH);
          ctx!.drawImage(
            img,
            col * config.frameW,
            row * config.frameH,
            config.frameW,
            config.frameH,
            0,
            0,
            config.frameW,
            config.frameH
          );

          frameRef.current = (frameRef.current + 1) % TOTAL_FRAMES;
        }
        rafRef.current = requestAnimationFrame(animate);
      };

      rafRef.current = requestAnimationFrame(animate);
    };

    return () => cancelAnimationFrame(rafRef.current);
  }, [sprite, fps, config]);

  return (
    <canvas
      ref={canvasRef}
      width={config.frameW}
      height={config.frameH}
      style={{ imageRendering: "pixelated", width: config.frameW * scale, height: config.frameH * scale }}
    />
  );
}
