"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ZoroPixelLoader from "./ZoroPixelLoader";

// ── Audio ──────────
const LOADING_MUSIC = "/zoroloading.mp3";
const SANTORYU_MUSIC = "/zorosantoryu.mp3";
const SLASH_SOUND = "/slashsound.mp3";

const SLASH_SOUND_DUR = 576; // ms — one slash sound duration
const NUM_SLASHES = 3;
const SLASH_INTERVAL = SLASH_SOUND_DUR; // play next slash right after previous ends
const TOTAL_SLASH_TIME = NUM_SLASHES * SLASH_INTERVAL; // ~1728ms for 3 slashes

// ── 3 Slash lines — one per slash, different angles ──────────
const SLASHES = [
  { angle: -30, delay: 0, id: 1 },
  { angle: 15, delay: SLASH_INTERVAL, id: 2 },
  { angle: -50, delay: SLASH_INTERVAL * 2, id: 3 },
];

// ── Fragments for 3 slash cuts ──────────
const FRAGMENTS = [
  // Top section
  { clipPath: "polygon(0 0, 33% 0, 33% 33%, 0 33%)", origin: "0% 0%", x: "-20%", y: "-30%", rot: -6, delay: 0 },
  { clipPath: "polygon(33% 0, 66% 0, 66% 33%, 33% 33%)", origin: "50% 16%", x: "0%", y: "-35%", rot: 3, delay: 0.05 },
  { clipPath: "polygon(66% 0, 100% 0, 100% 33%, 66% 33%)", origin: "100% 0%", x: "25%", y: "-25%", rot: 8, delay: 0.02 },
  // Middle section
  { clipPath: "polygon(0 33%, 33% 33%, 33% 66%, 0 66%)", origin: "0% 50%", x: "-30%", y: "5%", rot: -4, delay: 0.08 },
  { clipPath: "polygon(33% 33%, 66% 33%, 66% 66%, 33% 66%)", origin: "50% 50%", x: "10%", y: "10%", rot: 2, delay: 0.03 },
  { clipPath: "polygon(66% 33%, 100% 33%, 100% 66%, 66% 66%)", origin: "100% 50%", x: "35%", y: "-5%", rot: -7, delay: 0.06 },
  // Bottom section
  { clipPath: "polygon(0 66%, 33% 66%, 33% 100%, 0 100%)", origin: "0% 100%", x: "-25%", y: "30%", rot: -10, delay: 0.1 },
  { clipPath: "polygon(33% 66%, 66% 66%, 66% 100%, 33% 100%)", origin: "50% 83%", x: "15%", y: "35%", rot: 5, delay: 0.04 },
  { clipPath: "polygon(66% 66%, 100% 66%, 100% 100%, 66% 100%)", origin: "100% 100%", x: "30%", y: "25%", rot: -8, delay: 0.07 },
];

// ── Main Component ──────────
export default function SwordSplash({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"loading" | "freeze" | "santoryu" | "slash" | "shatter" | "done">("loading");
  const [progress, setProgress] = useState(0);
  const [shake, setShake] = useState(false);
  const [showCuts, setShowCuts] = useState(false);
  const [fadeOutCuts, setFadeOutCuts] = useState(false);
  const loadingAudioRef = useRef<HTMLAudioElement | null>(null);

  // Start loading music on mount
  useEffect(() => {
    const audio = new Audio(LOADING_MUSIC);
    audio.loop = true;
    audio.volume = 0.6;
    loadingAudioRef.current = audio;
    audio.play().catch(() => {});
    return () => { audio.pause(); audio.currentTime = 0; };
  }, []);

  const triggerSantoryu = useCallback(() => {
    // Fade out loading music
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

    // Play Santoryu music + show image
    const santoryu = new Audio(SANTORYU_MUSIC);
    santoryu.volume = 0.8;
    santoryu.play().catch(() => {});

    // When santoryu ends → start slashing
    santoryu.onended = () => {
      setPhase("slash");
      setShake(true);
      setShowCuts(true);

      // Play 3 slash sounds spaced by SLASH_SOUND_DUR
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
          setFadeOutCuts(true);
          setPhase("done");
          setTimeout(onComplete, 400);
        }, 800);
      }, TOTAL_SLASH_TIME + 200);
    };
  }, [onComplete]);

  useEffect(() => {
    if (phase !== "loading") return;
    const startTime = Date.now();
    const duration = 5000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      if (p >= 1) { clearInterval(interval); triggerSantoryu(); }
    }, 30);
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
          @keyframes zoro-slash-glow {
            0% { filter: drop-shadow(0 0 0px transparent); }
            50% { filter: drop-shadow(0 0 30px rgba(0,150,255,0.7)) drop-shadow(0 0 60px rgba(0,150,255,0.3)); }
            100% { filter: drop-shadow(0 0 80px rgba(0,150,255,0.9)) drop-shadow(0 0 120px rgba(0,100,255,0.5)); }
          }
        `}</style>

        {/* ── Loading Phase ── */}
        {phase === "loading" && (
          <div className="flex flex-col items-center gap-6">
            <ZoroPixelLoader sprite="run" fps={14} scale={0.3} />
            <motion.div className="flex flex-col items-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="text-2xl font-black tracking-tight text-gray-900">30 DAYS</span>
              <span className="text-xs font-medium tracking-[0.3em] text-gray-400 mt-1">WEB CHALLENGE</span>
            </motion.div>
            <div className="w-48 h-[2px] bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gray-900 rounded-full transition-all duration-75" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}

        {/* ── Santoryu Phase — show image while music plays ── */}
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
              style={{ imageRendering: "auto", maxHeight: "70vh" }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.05, 1], opacity: [0, 1, 1] }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          </motion.div>
        )}

        {/* ── Slash Phase — 3 slashes ── */}
        {phase === "slash" && (
          <div className="fixed inset-0">
            {/* White base */}
            <div className="absolute inset-0 z-10 bg-white" />

            {/* Zoro — big, animated, slashing */}
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
              <div style={{
                animation: "zoro-slash-glow 0.3s ease-out forwards",
              }}>
                <ZoroPixelLoader sprite="slash" fps={20} scale={1.2} />
              </div>
            </motion.div>

            {/* Slash blade tips — dark streaks that sweep across */}
            {SLASHES.map((s, i) => (
              <div key={`tip-${i}`} className="absolute inset-0 z-20 pointer-events-none">
                <motion.div
                  style={{
                    position: "absolute",
                    left: 0, top: 0,
                    width: "30%", height: "8px",
                    background: "linear-gradient(90deg, transparent, #444 20%, #000 50%, #444 80%, transparent)",
                    boxShadow: "0 0 20px 4px rgba(0,0,0,0.8), 0 0 40px 8px rgba(100,180,255,0.4)",
                    transformOrigin: "50% 50%",
                    transform: `rotate(${s.angle}deg)`,
                  }}
                  initial={{ x: "-150%", y: 0, opacity: 0 }}
                  animate={{ x: "500%", y: 0, opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.35, delay: s.delay / 1000, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            ))}

            {/* PERSISTENT SCAR LINES — appear with each slash, stay forever */}
            {SLASHES.map((s, i) => (
              <div key={`scar-${i}`} className="absolute inset-0 z-[60] pointer-events-none">
                {/* Dark core line */}
                <motion.div
                  style={{
                    position: "absolute",
                    left: "-10%", top: "-10%",
                    width: "120%", height: "6px",
                    background: "#000",
                    boxShadow: "0 0 4px 2px rgba(0,0,0,1), 0 0 12px 4px rgba(0,0,0,0.5)",
                    transformOrigin: "50% 50%",
                    transform: `rotate(${s.angle}deg)`,
                  }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: 1 }}
                  transition={{ duration: 0.25, delay: s.delay / 1000, ease: [0.16, 1, 0.3, 1] }}
                />
                {/* Blue glow around scar */}
                <motion.div
                  style={{
                    position: "absolute",
                    left: "-10%", top: "-10%",
                    width: "120%", height: "28px",
                    background: "linear-gradient(90deg, transparent 0%, rgba(60,140,255,0.2) 10%, rgba(60,140,255,0.5) 50%, rgba(60,140,255,0.2) 90%, transparent 100%)",
                    transformOrigin: "50% 50%",
                    transform: `rotate(${s.angle}deg)`,
                    filter: "blur(6px)",
                  }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  animate={{ scaleX: 1, opacity: [0, 1, 0.7] }}
                  transition={{ duration: 0.4, delay: s.delay / 1000, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            ))}

            {/* Sparks per slash */}
            {SLASHES.map((s, si) =>
              Array.from({ length: 8 }).map((_, pi) => {
                const t = pi / 8;
                const rad = (s.angle * Math.PI) / 180;
                const cx = 50 + (t - 0.5) * 80 * Math.cos(rad);
                const cy = 50 + (t - 0.5) * 80 * Math.sin(rad);
                return (
                  <motion.div
                    key={`s-${si}-${pi}`}
                    className="absolute z-[70] rounded-full pointer-events-none"
                    style={{
                      left: `${cx}%`, top: `${cy}%`,
                      width: 3 + Math.random() * 5, height: 3 + Math.random() * 5,
                      background: pi % 2 === 0 ? "#333" : "#888",
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0], x: (Math.random() - 0.5) * 100, y: (Math.random() - 0.5) * 100 }}
                    transition={{ duration: 0.4, delay: (s.delay / 1000) + t * 0.15, ease: "easeOut" }}
                  />
                );
              })
            )}

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

            {/* Scar lines persist through shatter */}
            {SLASHES.map((s, i) => (
              <div key={`scar-${i}`} className="absolute inset-0 z-[60] pointer-events-none">
                <div style={{
                  position: "absolute",
                  left: "-10%", top: "-10%",
                  width: "120%", height: "6px",
                  background: "#000",
                  boxShadow: "0 0 4px 2px rgba(0,0,0,1), 0 0 12px 4px rgba(0,0,0,0.5)",
                  transformOrigin: "50% 50%",
                  transform: `rotate(${s.angle}deg)`,
                }} />
                <div style={{
                  position: "absolute",
                  left: "-10%", top: "-10%",
                  width: "120%", height: "28px",
                  background: "linear-gradient(90deg, transparent 0%, rgba(60,140,255,0.2) 10%, rgba(60,140,255,0.5) 50%, rgba(60,140,255,0.2) 90%, transparent 100%)",
                  transformOrigin: "50% 50%",
                  transform: `rotate(${s.angle}deg)`,
                  filter: "blur(6px)",
                }} />
              </div>
            ))}
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
            {/* Debris */}
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={`d-${i}`}
                className="absolute z-20 rounded-full pointer-events-none"
                style={{
                  left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 80}%`,
                  width: 2 + Math.random() * 5, height: 2 + Math.random() * 5,
                  background: "#ddd",
                }}
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: [0, 1, 0], opacity: [1, 0.7, 0], x: (Math.random() - 0.5) * 200, y: (Math.random() - 0.5) * 200 }}
                transition={{ duration: 0.5 + Math.random() * 0.4, delay: Math.random() * 0.15, ease: "easeOut" }}
              />
            ))}
            {/* Final flash */}
            <motion.div className="absolute inset-0 z-15 pointer-events-none"
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
