"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DonutAnimation from "./DonutAnimation";
import GanBloop from "./GanBloop";

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  drift2: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

// ── Sound Synthesis ──────────────────────────────────────────

function playGlitchSound() {
  try {
    const ctx = new AudioContext();
    const duration = 0.15;
    const bufferSize = ~~(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 30) * 0.4
        + Math.sin(t * 3000) * Math.exp(-t * 20) * 0.2;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1000;
    source.connect(filter);
    filter.connect(ctx.destination);
    source.start();
    setTimeout(() => ctx.close(), 300);
  } catch {}
}

function playExplosionSound() {
  try {
    const ctx = new AudioContext();
    const duration = 1.2;
    const bufferSize = ~~(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      // Low rumble + noise burst
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 3) * 0.6
        + Math.sin(t * 60) * Math.exp(-t * 4) * 0.5
        + Math.sin(t * 120) * Math.exp(-t * 6) * 0.3;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 800;
    const gain = ctx.createGain();
    gain.gain.value = 0.8;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    setTimeout(() => ctx.close(), 1500);
  } catch {}
}

function playSplashSound() {
  try {
    const ctx = new AudioContext();
    const duration = 0.3;
    const bufferSize = ~~(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 12) * 0.3;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2000;
    source.connect(filter);
    filter.connect(ctx.destination);
    source.start();
    setTimeout(() => ctx.close(), 500);
  } catch {}
}

function startAmbientDrone(): { stop: () => void } {
  let ctx: AudioContext | null = null;
  let gain: GainNode | null = null;
  let running = true;

  const start = async () => {
    // Wait for user gesture context
    ctx = new AudioContext();
    gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);

    // Low drone oscillator
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = 55;
    const g1 = ctx.createGain();
    g1.gain.value = 0.08;
    osc1.connect(g1);
    g1.connect(gain);

    // Sub harmonics
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 82.5;
    const g2 = ctx.createGain();
    g2.gain.value = 0.04;
    osc2.connect(g2);
    g2.connect(gain);

    // LFO for subtle movement
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.1;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 3;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    osc1.start();
    osc2.start();
    lfo.start();

    // Fade in
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 2);

    // Keep checking if we should stop
    const check = setInterval(() => {
      if (!running && gain && ctx) {
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
        setTimeout(() => {
          osc1.stop();
          osc2.stop();
          lfo.stop();
          ctx?.close();
          clearInterval(check);
        }, 1100);
      }
    }, 200);
  };

  // Start on first user interaction
  const handler = () => {
    start();
    document.removeEventListener("click", handler);
    document.removeEventListener("touchstart", handler);
  };
  document.addEventListener("click", handler, { once: true });
  document.addEventListener("touchstart", handler, { once: true });

  return {
    stop: () => { running = false; },
  };
}

// ── Component ────────────────────────────────────────────────

export default function MagikarpLanding({ onStart }: { onStart: () => void }) {
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [velocity, setVelocity] = useState({ vx: 0.25, vy: 0.2 });
  const [rotation, setRotation] = useState(0);
  const [caught, setCaught] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [bubbleTrail, setBubbleTrail] = useState<{ id: number; x: number; y: number }[]>([]);
  const animRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rippleId = useRef(0);
  const bubbleId = useRef(1000);

  // Donut interaction state
  const [donutClicks, setDonutClicks] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);
  const [isExploding, setIsExploding] = useState(false);
  const [explosionParticles, setExplosionParticles] = useState<{ id: number; x: number; y: number; angle: number; speed: number; color: string }[]>([]);
  const [showDonutPopup, setShowDonutPopup] = useState(false);
  const explosionId = useRef(0);

  // Use refs for physics so we don't nest setState calls
  const posRef = useRef({ x: 50, y: 50 });
  const velRef = useRef({ vx: 0.25, vy: 0.2 });


  const bubbles = useMemo<Bubble[]>(() => {
    const seed = (i: number, offset: number) => {
      const x = Math.sin(i * 9301 + offset * 49297) * 49297;
      return x - Math.floor(x);
    };
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: seed(i, 1) * 100,
      y: seed(i, 2) * 100,
      size: 4 + seed(i, 3) * 12,
      duration: 3 + seed(i, 4) * 5,
      delay: seed(i, 5) * 4,
      drift: seed(i, 6) * 20 - 10,
      drift2: seed(i, 7) * 10 - 5,
    }));
  }, []);

  // Splash particles on click
  const [splashParticles, setSplashParticles] = useState<{ id: number; x: number; y: number; angle: number; speed: number }[]>([]);
  const splashId = useRef(0);

  const handleCatch = useCallback(() => {
    if (caught) return;
    setCaught(true);

    const { x: cx, y: cy } = posRef.current;

    // Splash particles
    const particles = Array.from({ length: 12 }, (_, i) => ({
      id: splashId.current++,
      x: cx,
      y: cy,
      angle: (i / 12) * Math.PI * 2,
      speed: 3 + Math.random() * 5,
    }));
    setSplashParticles(particles);

    // Ripple
    rippleId.current++;
    setRipples((prev) => [...prev.slice(-3), { id: rippleId.current, x: cx, y: cy }]);

    playSplashSound();

    // Transition to challenge after splash
    setTimeout(() => onStart(), 800);
  }, [caught, onStart]);

  // ── Donut Click Handler ──────────────────────────────────
  const handleDonutClick = useCallback(() => {
    if (isGlitching || isExploding || showDonutPopup) return;

    const newCount = donutClicks + 1;

    if (newCount >= 5) {
      // BOOM!
      setDonutClicks(0);
      setIsExploding(true);
      playExplosionSound();

      // Spawn explosion particles from center of screen
      const colors = ["#00AFFF", "#00E676", "#ff0066", "#ff6600", "#6C5CE7", "#FFD700"];
      const particles = Array.from({ length: 30 }, (_, i) => ({
        id: explosionId.current++,
        x: 50,
        y: 40,
        angle: (i / 30) * Math.PI * 2 + Math.random() * 0.5,
        speed: 5 + Math.random() * 15,
        color: colors[i % colors.length],
      }));
      setExplosionParticles(particles);

      // After 2 seconds, open popup and reset
      setTimeout(() => {
        setIsExploding(false);
        setExplosionParticles([]);
        setShowDonutPopup(true);
      }, 2000);
    } else {
      // Glitch for 1 second
      setDonutClicks(newCount);
      setIsGlitching(true);
      playGlitchSound();

      setTimeout(() => {
        setIsGlitching(false);
      }, 1000);
    }
  }, [donutClicks, isGlitching, isExploding, showDonutPopup]);

  // Bouncing magikarp physics
  useEffect(() => {
    if (caught) return;

    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = Math.min((time - lastTimeRef.current) / 16, 3);
      lastTimeRef.current = time;

      const { vx, vy } = velRef.current;
      const { x, y } = posRef.current;
      let nx = x + vx * delta;
      let ny = y + vy * delta;

      const marginX = 8;
      const marginY = 10;
      let bvx = vx;
      let bvy = vy;

      if (nx < marginX) { nx = marginX; bvx = Math.abs(bvx); }
      if (nx > 100 - marginX) { nx = 100 - marginX; bvx = -Math.abs(bvx); }
      if (ny < marginY) { ny = marginY; bvy = Math.abs(bvy); }
      if (ny > 90 - marginY) { ny = 90 - marginY; bvy = -Math.abs(bvy); }

      const bounced = bvx !== vx || bvy !== vy;
      if (bounced) {
        bvx += (Math.random() - 0.5) * 0.3;
        bvy += (Math.random() - 0.5) * 0.3;
        const speed = Math.sqrt(bvx * bvx + bvy * bvy);
        const targetSpeed = 0.2 + Math.random() * 0.15;
        if (speed > 0) {
          bvx = (bvx / speed) * targetSpeed;
          bvy = (bvy / speed) * targetSpeed;
        }
      }

      posRef.current = { x: nx, y: ny };
      velRef.current = { vx: bvx, vy: bvy };

      setPos({ x: nx, y: ny });
      if (bounced) setVelocity({ vx: bvx, vy: bvy });
      setRotation((prev) => prev + 0.15 * delta);

      if (Math.random() < 0.08) {
        bubbleId.current++;
        const newId = bubbleId.current;
        const bx = nx;
        const by = ny;
        setBubbleTrail((prev) => [...prev.slice(-8), { id: newId, x: bx, y: by }]);
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [caught]);

  // Clean up old bubbles
  useEffect(() => {
    const interval = setInterval(() => {
      setBubbleTrail((prev) => prev.slice(-6));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden" style={{ background: "#050B18" }}>
      {/* Ambient glow effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              radial-gradient(ellipse at 30% 20%, rgba(0,175,255,0.08) 0%, transparent 50%),
              radial-gradient(ellipse at 70% 80%, rgba(0,230,118,0.06) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 50%, rgba(108,92,231,0.04) 0%, transparent 60%)
            `,
          }}
        />
      </div>

      {/* Explosion flash */}
      <AnimatePresence>
        {isExploding && (
          <motion.div
            className="fixed inset-0 z-40 pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(0,175,255,0.6), transparent 70%)" }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 0.5, 0], scale: [0.5, 2, 3] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* Explosion particles */}
      <AnimatePresence>
        {explosionParticles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute z-45 rounded-full pointer-events-none"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: 8,
              height: 8,
              background: p.color,
              boxShadow: `0 0 10px ${p.color}, 0 0 20px ${p.color}`,
            }}
            initial={{ scale: 1, opacity: 1 }}
            animate={{
              x: Math.cos(p.angle) * p.speed * 25,
              y: Math.sin(p.angle) * p.speed * 25,
              scale: 0,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>

      {/* Background particles */}
      {bubbles.map((b) => (
        <motion.div
          key={b.id}
          className="absolute rounded-full"
          style={{
            left: `${b.x}%`,
            width: b.size,
            height: b.size,
            background: `rgba(0,175,255,${0.08 + b.id * 0.005})`,
          }}
          animate={{
            y: ["100vh", "-10vh"],
            opacity: [0, 0.5, 0.2, 0],
            x: [0, b.drift, b.drift2],
          }}
          transition={{
            duration: b.duration,
            repeat: Infinity,
            delay: b.delay,
            ease: "linear",
          }}
        />
      ))}

      {/* Bubble trail from magikarp */}
      <AnimatePresence>
        {bubbleTrail.map((b) => (
          <motion.div
            key={b.id}
            className="absolute rounded-full"
            style={{ left: `${b.x}%`, top: `${b.y}%`, width: 6, height: 6, background: "rgba(0,175,255,0.3)" }}
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 0, y: -40, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>

      {/* Title */}
      <motion.div
        className="relative z-10 mb-8 text-center px-4"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <motion.div
          className="flex flex-col items-center justify-center mb-3"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <div className="flex items-center justify-center">
            <span className="text-[10rem] md:text-[18rem] leading-none font-black text-white drop-shadow-[0_0_30px_rgba(0,175,255,0.15)]">
              3
            </span>
            {isExploding ? (
              <DonutAnimation
                glitching={true}
                onClick={() => {}}
              />
            ) : (
              <DonutAnimation
                glitching={isGlitching}
                onClick={handleDonutClick}
              />
            )}
          </div>
          <span
            className="text-2xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg, #00E676, #00AFFF)" }}
          >
            Days Web Challenge
          </span>
        </motion.div>
        <p className="text-sm md:text-base" style={{ color: "#9AA4B2" }}>
          Community-built. 30 days. 30 features.
        </p>
      </motion.div>

      {/* Donut click hint */}
      {donutClicks > 0 && !isGlitching && !isExploding && (
        <motion.div
          className="relative z-10 text-xs mb-2"
          style={{ color: donutClicks >= 4 ? "#ff0066" : "rgba(0,175,255,0.4)" }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {donutClicks >= 4 ? "One more click... 💥" : `${donutClicks}/5 clicks`}
        </motion.div>
      )}

      {/* Instruction */}
      <motion.p
        className="relative z-10 text-xs md:text-sm mb-4"
        style={{ color: "rgba(0,175,255,0.5)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 1.5 }}
      >
        {caught ? "Gotcha!" : "Click the Donut!! or Catch the Magikarp to begin!"}
      </motion.p>

      {/* THE MAGIKARP */}
      <motion.div
        className="absolute z-20 cursor-pointer select-none"
        style={{
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          transform: "translate(-50%, -50%)",
        }}
        onClick={handleCatch}
        animate={caught ? {
          scale: [1, 1.5, 0],
          rotate: [0, 720],
          opacity: [1, 1, 0],
        } : {
          rotate: [rotation, rotation + 3, rotation - 2, rotation],
          scale: [1, 1.03, 0.97, 1],
          y: [0, -5, 2, 0],
        }}
        transition={caught ? { duration: 0.7, ease: "easeIn" } : {
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        whileHover={!caught ? {
          scale: 1.15,
          filter: "brightness(1.3) drop-shadow(0 0 20px rgba(0,230,118,0.6))",
        } : {}}
      >
        <motion.img
          src="/day1/magikarp.webp"
          alt="Magikarp"
          className="w-24 h-24 md:w-32 md:h-32 object-contain pointer-events-none"
          style={{
            filter: "drop-shadow(0 0 15px rgba(0,175,255,0.4))",
            transform: velocity.vx < 0 ? "scaleX(-1)" : "scaleX(1)",
          }}
          animate={!caught ? {
            filter: [
              "drop-shadow(0 0 15px rgba(0,175,255,0.4))",
              "drop-shadow(0 0 25px rgba(0,230,118,0.6))",
              "drop-shadow(0 0 15px rgba(0,175,255,0.4))",
            ],
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          draggable={false}
        />
      </motion.div>

      {/* Splash particles */}
      <AnimatePresence>
        {splashParticles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute z-30 w-2 h-2 rounded-full"
            style={{ background: "#00AFFF", left: `${p.x}%`, top: `${p.y}%` }}
            initial={{ scale: 1, opacity: 1 }}
            animate={{
              x: Math.cos(p.angle) * p.speed * 30,
              y: Math.sin(p.angle) * p.speed * 30,
              scale: 0,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>

      {/* Click ripples */}
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.div
            key={r.id}
            className="absolute z-15 pointer-events-none rounded-full border-2"
            style={{ borderColor: "rgba(0,175,255,0.4)", left: `${r.x}%`, top: `${r.y}%`, transform: "translate(-50%, -50%)" }}
            initial={{ width: 20, height: 20, opacity: 1 }}
            animate={{ width: 200, height: 200, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>

      {/* El Granmaja walking around */}
      <GanBloop />

      {/* Day label */}
      <motion.div
        className="absolute bottom-6 text-xs tracking-widest"
        style={{ color: "#9AA4B2" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
      >
        DAY 4 — 30 DAYS WEB CHALLENGE
      </motion.div>

      {/* Donut click popup */}
      <AnimatePresence>
        {showDonutPopup && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowDonutPopup(false)}
            />
            <motion.div
              className="relative z-10 max-w-sm mx-4 rounded-2xl border p-6 text-center shadow-2xl"
              style={{
                background: "rgba(11,15,20,0.95)",
                borderColor: "rgba(0,175,255,0.2)",
                boxShadow: "0 0 20px rgba(0,175,255,0.08), 0 8px 32px rgba(0,0,0,0.3)",
              }}
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="text-4xl mb-3">🍩</div>
              <h3 className="text-lg font-bold text-white mb-1">
                You found the secret donut!
              </h3>
              <p className="text-sm mb-4" style={{ color: "#9AA4B2" }}>
                Day 4 Challenge — Pixel art Zoro slashes the screen with Santoryu.
                Running sprite, cinematic music, and 3 sword slashes that shatter the page.
                The year was 2006. The donut was eternal. 🍩
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDonutPopup(false)}
                  className="px-4 py-2 rounded-xl text-sm border hover:bg-white/5 transition-colors"
                  style={{ color: "#9AA4B2", borderColor: "rgba(255,255,255,0.1)" }}
                >
                  Close
                </button>
                <a
                  href="https://github.com/ab2rahman/30days-web-challenge/blob/main/src/components/DonutAnimation.tsx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
                  style={{ background: "#00AFFF" }}
                >
                  See the Math 🧮
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
