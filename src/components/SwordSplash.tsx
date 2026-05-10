"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ZoroPixelLoader from "./ZoroPixelLoader";

// ── Audio ──────────
const LOADING_MUSIC = "/zoroloading.mp3";
const SANTORYU_MUSIC = "/zorosantoryu.mp3";
const SLASH_SOUND = "/slashsound.mp3";

const SLASH_SOUND_DUR = 576;
const NUM_SLASHES = 3;
const SLASH_INTERVAL = SLASH_SOUND_DUR;
const TOTAL_SLASH_TIME = NUM_SLASHES * SLASH_INTERVAL;
const SANTORYU_DUR = 2736;

// ── 3 Slash lines ──────────
const SLASHES = [
  { angle: -30, delay: 0 },
  { angle: 15, delay: SLASH_INTERVAL },
  { angle: -50, delay: SLASH_INTERVAL * 2 },
];

// ── Pre-compute random values (no re-renders) ──────────
// biome-ignore lint: pre-computed random values for stable rendering
const SPARKS = SLASHES.flatMap((s, si) =>
  Array.from({ length: 4 }, (_, pi) => {
    const t = pi / 4;
    const rad = (s.angle * Math.PI) / 180;
    return {
      key: `s-${si}-${pi}`,
      left: `${50 + (t - 0.5) * 80 * Math.cos(rad)}%`,
      top: `${50 + (t - 0.5) * 80 * Math.sin(rad)}%`,
      w: 3 + Math.floor(Math.random() * 4),
      h: 3 + Math.floor(Math.random() * 4),
      bg: pi % 2 === 0 ? "#333" : "#888",
      dx: (Math.random() - 0.5) * 80,
      dy: (Math.random() - 0.5) * 80,
      delay: s.delay / 1000 + t * 0.15,
    };
  })
);

// biome-ignore lint: pre-computed debris positions
const DEBRIS = Array.from({ length: 15 }, (_, i) => ({
  key: `d-${i}`,
  left: `${10 + Math.floor(Math.random() * 80)}%`,
  top: `${10 + Math.floor(Math.random() * 80)}%`,
  w: 2 + Math.floor(Math.random() * 4),
  h: 2 + Math.floor(Math.random() * 4),
  dx: (Math.random() - 0.5) * 160,
  dy: (Math.random() - 0.5) * 160,
  dur: 0.4 + Math.random() * 0.3,
  del: Math.random() * 0.12,
}));

// ── Fragments ──────────
const FRAGMENTS = [
  { clipPath: "polygon(0 0, 33% 0, 33% 33%, 0 33%)", origin: "0% 0%", x: "-20%", y: "-30%", rot: -6, delay: 0 },
  { clipPath: "polygon(33% 0, 66% 0, 66% 33%, 33% 33%)", origin: "50% 16%", x: "0%", y: "-35%", rot: 3, delay: 0.05 },
  { clipPath: "polygon(66% 0, 100% 0, 100% 33%, 66% 33%)", origin: "100% 0%", x: "25%", y: "-25%", rot: 8, delay: 0.02 },
  { clipPath: "polygon(0 33%, 33% 33%, 33% 66%, 0 66%)", origin: "0% 50%", x: "-30%", y: "5%", rot: -4, delay: 0.08 },
  { clipPath: "polygon(33% 33%, 66% 33%, 66% 66%, 33% 66%)", origin: "50% 50%", x: "10%", y: "10%", rot: 2, delay: 0.03 },
  { clipPath: "polygon(66% 33%, 100% 33%, 100% 66%, 66% 66%)", origin: "100% 50%", x: "35%", y: "-5%", rot: -7, delay: 0.06 },
  { clipPath: "polygon(0 66%, 33% 66%, 33% 100%, 0 100%)", origin: "0% 100%", x: "-25%", y: "30%", rot: -10, delay: 0.1 },
  { clipPath: "polygon(33% 66%, 66% 66%, 66% 100%, 33% 100%)", origin: "50% 83%", x: "15%", y: "35%", rot: 5, delay: 0.04 },
  { clipPath: "polygon(66% 66%, 100% 66%, 100% 100%, 66% 100%)", origin: "100% 100%", x: "30%", y: "25%", rot: -8, delay: 0.07 },
];

// ── Main Component ──────────
export default function SwordSplash({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"tap" | "loading" | "santoryu" | "slash" | "shatter" | "done">("tap");
  const [progress, setProgress] = useState(0);
  const [shake, setShake] = useState(false);
  const loadingAudioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const startLoading = useCallback(() => {
    setPhase("loading");
    const audio = new Audio(LOADING_MUSIC);
    audio.loop = true;
    audio.volume = 0.6;
    loadingAudioRef.current = audio;
    audio.play().catch(() => {});
  }, []);

  const triggerSantoryu = useCallback(() => {
    const loadAudio = loadingAudioRef.current;
    if (loadAudio) {
      const fade = setInterval(() => {
        if (loadAudio.volume > 0.05) {
          loadAudio.volume = Math.max(0, loadAudio.volume - 0.05);
        } else {
          loadAudio.pause();
          loadAudio.currentTime = 0;
          clearInterval(fade);
        }
      }, 30);
    }

    setPhase("santoryu");

    const santoryu = new Audio(SANTORYU_MUSIC);
    santoryu.volume = 0.8;
    santoryu.play().catch(() => {});

    const startSlash = () => {
      setPhase("slash");
      setShake(true);

      for (let i = 0; i < NUM_SLASHES; i++) {
        setTimeout(() => {
          const s = new Audio(SLASH_SOUND);
          s.volume = 0.9;
          s.play().catch(() => {});
        }, i * SLASH_INTERVAL);
      }

      setTimeout(() => {
        setShake(false);
        setPhase("shatter");
        setTimeout(() => {
          setPhase("done");
          setTimeout(onComplete, 400);
        }, 800);
      }, TOTAL_SLASH_TIME + 200);
    };

    let slashStarted = false;
    const tryStart = () => {
      if (slashStarted) return;
      slashStarted = true;
      startSlash();
    };
    santoryu.onended = tryStart;
    setTimeout(tryStart, SANTORYU_DUR + 300);
  }, [onComplete]);

  // Progress bar via ref (no re-renders)
  useEffect(() => {
    if (phase !== "loading") return;
    const startTime = Date.now();
    const duration = 5000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(elapsed / duration, 1);
      if (progressRef.current) progressRef.current.style.width = `${p * 100}%`;
      if (p >= 1) { clearInterval(interval); triggerSantoryu(); }
    }, 50); // 50ms instead of 30ms
    return () => clearInterval(interval);
  }, [phase, triggerSantoryu]);

  if (phase === "done") return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
        style={{
          background: "#FFFFFF",
          animation: shake ? "splash-shake 0.06s infinite" : "none",
          willChange: "transform",
        }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
      >
        <style>{`
          @keyframes splash-shake {
            0% { transform: translate(0, 0); }
            25% { transform: translate(-3px, 2px); }
            50% { transform: translate(2px, -3px); }
            75% { transform: translate(-2px, 1px); }
            100% { transform: translate(3px, -2px); }
          }
        `}</style>

        {/* ── Tap to Start ── */}
        {phase === "tap" && (
          <motion.div
            className="flex flex-col items-center gap-8 cursor-pointer"
            onClick={startLoading}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <ZoroPixelLoader sprite="run" fps={14} scale={0.3} />
            <div className="flex flex-col items-center gap-3">
              <span className="text-2xl font-black tracking-tight text-gray-900">30 DAYS</span>
              <span className="text-xs font-medium tracking-[0.3em] text-gray-400">WEB CHALLENGE</span>
            </div>
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <span className="text-sm font-semibold text-gray-500 tracking-wider">TAP TO START</span>
            </motion.div>
          </motion.div>
        )}

        {/* ── Loading ── */}
        {phase === "loading" && (
          <div className="flex flex-col items-center gap-6">
            <ZoroPixelLoader sprite="run" fps={14} scale={0.3} />
            <motion.div className="flex flex-col items-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="text-2xl font-black tracking-tight text-gray-900">30 DAYS</span>
              <span className="text-xs font-medium tracking-[0.3em] text-gray-400 mt-1">WEB CHALLENGE</span>
            </motion.div>
            <div className="w-48 h-[2px] bg-gray-200 rounded-full overflow-hidden">
              <div ref={progressRef} className="h-full bg-gray-900 rounded-full" style={{ width: "0%", transition: "width 50ms linear" }} />
            </div>
          </div>
        )}

        {/* ── Santoryu ── */}
        {phase === "santoryu" && (
          <motion.div
            className="flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.img
              src="/zorosantoryu.png"
              alt="Santoryu"
              style={{ maxHeight: "70vh" }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.05, 1], opacity: [0, 1, 1] }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          </motion.div>
        )}

        {/* ── Slash Phase ── */}
        {phase === "slash" && (
          <div className="fixed inset-0">
            <div className="absolute inset-0 z-10 bg-white" />

            {/* Zoro slashing */}
            <motion.div
              className="absolute z-30 pointer-events-none"
              style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{
                scale: [0.5, 1.2, 1.0, 1.5, 1.3, 2.0],
                opacity: [0, 1, 1, 1, 1, 1],
                x: ["-50%", "-50%", "15%", "-50%", "-20%", "-50%"],
                y: ["-50%", "-50%", "-25%", "15%", "-10%", "-50%"],
                rotate: [0, -15, 25, -20, 30, 0],
              }}
              transition={{ duration: TOTAL_SLASH_TIME / 1000, ease: [0.16, 1, 0.3, 1] }}
            >
              <ZoroPixelLoader sprite="slash" fps={20} scale={1.2} />
            </motion.div>

            {/* Blade tips */}
            {SLASHES.map((s, i) => (
              <motion.div
                key={`tip-${i}`}
                className="absolute inset-0 z-20 pointer-events-none"
                style={{
                  width: "30%", height: "6px",
                  background: "linear-gradient(90deg, transparent, #444 20%, #000 50%, #444 80%, transparent)",
                  boxShadow: "0 0 12px 2px rgba(0,0,0,0.6)",
                  transformOrigin: "50% 50%",
                  transform: `rotate(${s.angle}deg)`,
                }}
                initial={{ x: "-150%", opacity: 0 }}
                animate={{ x: "500%", opacity: [0, 1, 1, 0] }}
                transition={{ duration: 0.35, delay: s.delay / 1000, ease: [0.16, 1, 0.3, 1] }}
              />
            ))}

            {/* Scar lines — no blur glow on mobile, just solid lines */}
            {SLASHES.map((s, i) => (
              <motion.div
                key={`scar-${i}`}
                className="absolute inset-0 z-[60] pointer-events-none"
                style={{
                  left: "-10%", top: "-10%",
                  width: "120%", height: "6px",
                  background: "#000",
                  boxShadow: "0 0 6px 2px rgba(0,0,0,0.8)",
                  transformOrigin: "50% 50%",
                  transform: `rotate(${s.angle}deg)`,
                }}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.25, delay: s.delay / 1000, ease: [0.16, 1, 0.3, 1] }}
              />
            ))}

            {/* Sparks — pre-computed, fewer particles */}
            {SPARKS.map((sp) => (
              <motion.div
                key={sp.key}
                className="absolute z-[70] rounded-full pointer-events-none"
                style={{
                  left: sp.left, top: sp.top,
                  width: sp.w, height: sp.h,
                  background: sp.bg,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0], x: sp.dx, y: sp.dy }}
                transition={{ duration: 0.4, delay: sp.delay, ease: "easeOut" }}
              />
            ))}

            {/* Flash per slash */}
            {SLASHES.map((s, i) => (
              <motion.div
                key={`flash-${i}`}
                className="absolute inset-0 z-[80] pointer-events-none bg-white"
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.15, delay: s.delay / 1000 }}
              />
            ))}
          </div>
        )}

        {/* ── Shatter Phase ── */}
        {phase === "shatter" && (
          <div className="fixed inset-0">
            <div className="absolute inset-0 z-0" style={{ background: "#050B18" }} />

            {/* Scar lines persist */}
            {SLASHES.map((s, i) => (
              <div
                key={`scar-${i}`}
                className="absolute inset-0 z-[60] pointer-events-none"
                style={{
                  left: "-10%", top: "-10%",
                  width: "120%", height: "6px",
                  background: "#000",
                  boxShadow: "0 0 6px 2px rgba(0,0,0,0.8)",
                  transformOrigin: "50% 50%",
                  transform: `rotate(${s.angle}deg)`,
                }}
              />
            ))}

            {/* Fragments */}
            <div className="absolute inset-0 z-10">
              {FRAGMENTS.map((f, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0"
                  style={{ background: "#FFFFFF", clipPath: f.clipPath, transformOrigin: f.origin }}
                  initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                  animate={{ x: f.x, y: f.y, rotate: f.rot, opacity: 0 }}
                  transition={{ duration: 0.7, delay: f.delay, ease: [0.22, 1, 0.36, 1] }}
                />
              ))}
            </div>

            {/* Debris — pre-computed, 15 instead of 30 */}
            {DEBRIS.map((d) => (
              <motion.div
                key={d.key}
                className="absolute z-20 rounded-full pointer-events-none"
                style={{
                  left: d.left, top: d.top,
                  width: d.w, height: d.h,
                  background: "#ddd",
                }}
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: [0, 1, 0], opacity: [1, 0.7, 0], x: d.dx, y: d.dy }}
                transition={{ duration: d.dur, delay: d.del, ease: "easeOut" }}
              />
            ))}

            {/* Final flash */}
            <motion.div className="absolute inset-0 z-[70] pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.8), transparent 60%)" }}
              initial={{ opacity: 0.8, scale: 0.5 }} animate={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
    </>
  );
}
