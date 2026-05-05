"use client";

import { useEffect, useRef } from "react";

export default function DonutAnimation({
  width = 40,
  height = 20,
  className = "",
}: {
  width?: number;
  height?: number;
  className?: string;
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

      for (let j = 0; j < 6.283185; j += 0.07) {
        const st = Math.sin(j),
          ct = Math.cos(j);
        for (let i = 0; i < 6.283185; i += 0.02) {
          const sp = Math.sin(i),
            cp = Math.cos(i);
          const h = ct + 2;
          const D = 1 / (sp * h * sA + st * cA + 5);
          const t = sp * h * cA - st * sA;

          const x = ~~(cx + kx * D * (cp * h * cB - t * sB));
          const y = ~~(cy + ky * D * (cp * h * sB + t * cB));

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
            b[o] = N > 0 ? N : -1;
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
  }, [width, height]);

  return (
    <pre
      ref={preRef}
      className={`font-mono m-0 p-0 leading-none inline-block align-middle ${className}`}
      style={{ fontSize: "5.5px", lineHeight: "6px", letterSpacing: "0.5px" }}
    />
  );
}
