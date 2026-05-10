"use client";

import { useEffect, useRef } from "react";

export default function DonutAnimation({
  width = 40,
  height = 20,
  className = "",
  glitching = false,
  onClick,
}: {
  width?: number;
  height?: number;
  className?: string;
  glitching?: boolean;
  onClick?: () => void;
}) {
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    let A = 0;
    let B = 0;
    let frameId: number;

    const lum = ".,-~:;=!*#$@";
    const cx = width / 2;
    const cy = height / 2;
    const kx = width * 0.4;
    const ky = height * 0.55;

    const render = () => {
      const b = new Int8Array(width * height).fill(-1);
      const z = new Float32Array(width * height);

      const sA = Math.sin(A),
        cA = Math.cos(A);
      const sB = Math.sin(B),
        cB = Math.cos(B);

      // Glitch: add random rotation offset
      const glitchA = glitching ? (Math.random() - 0.5) * 0.5 : 0;
      const glitchB = glitching ? (Math.random() - 0.5) * 0.3 : 0;

      for (let j = 0; j < 6.283185; j += 0.07) {
        const st = Math.sin(j),
          ct = Math.cos(j);
        for (let i = 0; i < 6.283185; i += 0.02) {
          const sp = Math.sin(i),
            cp = Math.cos(i);
          const h = ct + 2;
          const D = 1 / (sp * h * (sA + glitchA) + st * (cA + glitchA * 0.5) + 5);
          const t = sp * h * cA - st * sA;

          const x = ~~(cx + kx * D * (cp * h * (cB + glitchB) - t * (sB + glitchB * 0.5)));
          const y = ~~(cy + ky * D * (cp * h * (sB + glitchB) + t * (cB + glitchB * 0.3)));

          const o = x + width * y;
          const N = ~~(
            8 *
            ((st * sA - sp * ct * cA) * cB -
              sp * ct * sA -
              st * cA -
              cp * ct * sB)
          );

          if (y > 0 && y < height && x > 0 && x < width && D > z[o]) {
            z[o] = D;
            // During glitch, randomly scramble luminance
            if (glitching && Math.random() < 0.15) {
              b[o] = ~~(Math.random() * 12);
            } else {
              b[o] = N > 0 ? N : -1;
            }
          }
        }
      }

      if (preRef.current) {
        let s = "";
        for (let k = 0; k < width * height; k++) {
          if (k > 0 && k % width === 0) s += "\n";
          s += b[k] >= 0 ? lum[b[k]] : " ";
        }
        preRef.current.textContent = s;
      }

      A += 0.015;
      B += 0.008;
      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, [width, height, glitching]);

  return (
    <div
      onClick={onClick}
      className={`inline-block align-middle scale-[1.5] md:scale-[2] origin-center select-none cursor-pointer ${className}`}
      style={{
        filter: glitching
          ? "drop-shadow(0 0 30px rgba(255,0,100,0.6)) drop-shadow(0 0 60px rgba(255,100,0,0.3))"
          : "drop-shadow(0 0 20px rgba(0,175,255,0.3)) drop-shadow(0 0 60px rgba(0,119,255,0.15))",
        transform: glitching
          ? `translate(${(Math.random() - 0.5) * 20}px, ${(Math.random() - 0.5) * 10}px) skewX(${(Math.random() - 0.5) * 10}deg)`
          : undefined,
        transition: "filter 0.1s",
      }}
    >
      <pre
        ref={preRef}
        className="font-mono m-0 p-0 leading-none"
        style={{
          fontSize: "5.5px",
          lineHeight: "6px",
          letterSpacing: "0.5px",
          color: glitching ? `hsl(${Math.random() * 360}, 100%, 70%)` : "#00AFFF",
          textShadow: glitching
            ? "0 0 8px #ff0066, 0 0 20px #ff6600"
            : "0 0 6px #00AFFF, 0 0 20px #0077ff",
        }}
      />
    </div>
  );
}
