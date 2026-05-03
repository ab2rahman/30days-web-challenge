"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

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

  // Use refs for physics so we don't nest setState calls
  const posRef = useRef({ x: 50, y: 50 });
  const velRef = useRef({ vx: 0.25, vy: 0.2 });

  const bubbles = useMemo<Bubble[]>(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 4 + Math.random() * 12,
      duration: 3 + Math.random() * 5,
      delay: Math.random() * 4,
      drift: Math.random() * 20 - 10,
      drift2: Math.random() * 10 - 5,
    })), []);

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

    // Play splash sound
    try {
      const ctx = new AudioContext();
      const duration = 0.3;
      const bufferSize = ctx.sampleRate * duration;
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

    // Transition to challenge after splash
    setTimeout(() => onStart(), 800);
  }, [caught, onStart]);

  // Bouncing magikarp physics
  useEffect(() => {
    if (caught) return;

    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = Math.min((time - lastTimeRef.current) / 16, 3);
      lastTimeRef.current = time;

      // Calculate new position using refs (no nested setState)
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

      // Add slight randomness on bounce
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

      // Update refs
      posRef.current = { x: nx, y: ny };
      velRef.current = { vx: bvx, vy: bvy };

      // Sync to React state (top-level only, no nesting)
      setPos({ x: nx, y: ny });
      if (bounced) setVelocity({ vx: bvx, vy: bvy });
      setRotation((prev) => prev + 0.15 * delta);

      // Bubble trail
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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-950 via-blue-950/80 to-slate-950">
      {/* Water surface effect */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(ellipse at 50% 0%, rgba(56,189,248,0.15) 0%, transparent 60%)`,
          }}
        />
        {/* Wave lines */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute left-0 right-0"
            style={{ top: `${30 + i * 20}%` }}
            animate={{
              y: [0, 8, -4, 6, 0],
              opacity: [0.05, 0.1, 0.05, 0.08, 0.05],
            }}
            transition={{ duration: 6 + i, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg width="100%" height="40" viewBox="0 0 1200 40" preserveAspectRatio="none">
              <path
                d={`M0 ${20 + i * 5} Q300 ${5 + i * 3} 600 ${20 + i * 5} T1200 ${20 + i * 5}`}
                fill="none"
                stroke="rgba(56,189,248,0.1)"
                strokeWidth="1"
              />
            </svg>
          </motion.div>
        ))}
      </div>

      {/* Background bubbles */}
      {bubbles.map((b) => (
        <motion.div
          key={b.id}
          className="absolute rounded-full border border-cyan-400/20"
          style={{
            left: `${b.x}%`,
            width: b.size,
            height: b.size,
          }}
          animate={{
            y: ["100vh", "-10vh"],
            opacity: [0, 0.4, 0.2, 0],
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
            className="absolute rounded-full bg-cyan-300/30"
            style={{ left: `${b.x}%`, top: `${b.y}%`, width: 6, height: 6 }}
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
        <motion.h1
          className="text-3xl md:text-5xl font-black text-white mb-3"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          30 Days Web Challenge
        </motion.h1>
        <p className="text-sm md:text-base text-cyan-300/60">
          Community-built. 30 days. 30 features.
        </p>
      </motion.div>

      {/* Instruction */}
      <motion.p
        className="relative z-10 text-xs md:text-sm text-cyan-400/50 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 1.5 }}
      >
        {caught ? "Gotcha!" : "Catch the Magikarp to begin!"}
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
          filter: "brightness(1.3) drop-shadow(0 0 20px rgba(250,204,21,0.6))",
        } : {}}
      >
        <motion.img
          src="/day1/magikarp.png"
          alt="Magikarp"
          className="w-24 h-24 md:w-32 md:h-32 object-contain pointer-events-none"
          style={{
            filter: "drop-shadow(0 0 15px rgba(56,189,248,0.4))",
            transform: velocity.vx < 0 ? "scaleX(-1)" : "scaleX(1)",
          }}
          animate={!caught ? {
            filter: [
              "drop-shadow(0 0 15px rgba(56,189,248,0.4))",
              "drop-shadow(0 0 25px rgba(250,204,21,0.6))",
              "drop-shadow(0 0 15px rgba(56,189,248,0.4))",
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
            className="absolute z-30 w-2 h-2 rounded-full bg-cyan-300"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
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
            className="absolute z-15 pointer-events-none rounded-full border-2 border-cyan-400/50"
            style={{ left: `${r.x}%`, top: `${r.y}%`, transform: "translate(-50%, -50%)" }}
            initial={{ width: 20, height: 20, opacity: 1 }}
            animate={{ width: 200, height: 200, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>

      {/* Day label */}
      <motion.div
        className="absolute bottom-6 text-xs tracking-widest text-slate-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
      >
        DAY 1 — 30 DAYS WEB CHALLENGE
      </motion.div>
    </div>
  );
}
