"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

type GameState =
  | "rolling"
  | "waiting"
  | "counting"
  | "result"
  | "glitch"
  | "victory";

const INITIAL_COUNTDOWN = 30.0;

function formatTime(ms: number): string {
  return (ms / 1000).toFixed(3);
}

// Stable random values generated once (not during render)
function generateParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 1000,
    y: Math.random() * 800,
    duration: 3 + Math.random() * 4,
    delay: Math.random() * 5,
  }));
}

function generateSparkles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${10 + Math.random() * 80}%`,
    top: `${10 + Math.random() * 80}%`,
    duration: 1 + Math.random(),
    delay: Math.random() * 2,
  }));
}

// Random landing spots for dice (percentage of viewport)
function generateDiceLandingSpots() {
  return [0, 1, 2, 3].map(() => ({
    x: (Math.random() - 0.5) * 80, // -40% to +40% from center
    y: (Math.random() - 0.5) * 60, // -30% to +30% from center
    rotate: Math.floor(Math.random() * 90 - 45), // -45 to +45 degrees
  }));
}

export default function Day1Challenge({ onHome }: { onHome?: () => void }) {
  const [gameState, setGameState] = useState<GameState>("rolling");
  const [diceValues, setDiceValues] = useState<number[]>([]);
  const [currentDiceRoll, setCurrentDiceRoll] = useState(0);
  const [diceAnimating, setDiceAnimating] = useState(false);
  const [targetNumber, setTargetNumber] = useState(0);
  const [countdown, setCountdown] = useState(INITIAL_COUNTDOWN);
  const [liveCountdown, setLiveCountdown] = useState(INITIAL_COUNTDOWN);
  const [countUp, setCountUp] = useState(0);
  const [isCounting, setIsCounting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [matchResult, setMatchResult] = useState<"exact" | "miss" | null>(null);
  const [rollingDice, setRollingDice] = useState(-1);
  const [landingSpots, setLandingSpots] = useState(() => generateDiceLandingSpots());
  const [hasGapHit, setHasGapHit] = useState(false); // Easter egg: ±100ms hit // which dice index is actively rolling

  const countUpRef = useRef(0);
  const startTimeRef = useRef(0);
  const rafRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const gyaradosVideoRef = useRef<HTMLVideoElement>(null);
  const countdownRafRef = useRef(0);
  const countdownStartRef = useRef(INITIAL_COUNTDOWN);
  const countdownEpochRef = useRef(0);

  const particles = useMemo(() => generateParticles(20), []);
  const sparkles = useMemo(() => generateSparkles(12), []);

  // Dice rolling sound using Web Audio API
  const playDiceSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const duration = 0.15;
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Generate noise burst (sounds like dice clatter)
      for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        const envelope = Math.exp(-t * 30);
        data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      // Band-pass filter for dice-like tone
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 3000;
      filter.Q.value = 1;

      source.connect(filter);
      filter.connect(ctx.destination);
      source.start();
      source.stop(ctx.currentTime + duration);

      // Clean up
      setTimeout(() => ctx.close(), 500);
    } catch {
      // Audio not available, skip sound
    }
  }, []);

  // Final dice land sound
  const playDiceLandSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const duration = 0.1;
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        const envelope = Math.exp(-t * 50);
        data[i] = (Math.random() * 2 - 1) * envelope * 0.4;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1500;

      source.connect(filter);
      filter.connect(ctx.destination);
      source.start();
      source.stop(ctx.currentTime + duration);

      setTimeout(() => ctx.close(), 500);
    } catch {
      // Audio not available
    }
  }, []);

  // Glitch sound — harsh digital crash with oscillator sweeps + noise bursts
  const playGlitchSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const dur = 3.5;

      // Layer 1: Low rumbling oscillator sweep
      const osc1 = ctx.createOscillator();
      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(80, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.5);
      osc1.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 1);
      osc1.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 2);
      osc1.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 2.8);
      osc1.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + dur);

      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.setValueAtTime(0.25, ctx.currentTime + 0.5);
      gain1.gain.setValueAtTime(0.3, ctx.currentTime + 2);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + dur);

      // Layer 2: High-pitched digital screech
      const osc2 = ctx.createOscillator();
      osc2.type = "square";
      osc2.frequency.setValueAtTime(2000, ctx.currentTime);
      osc2.frequency.linearRampToValueAtTime(8000, ctx.currentTime + 0.3);
      osc2.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.8);
      osc2.frequency.linearRampToValueAtTime(12000, ctx.currentTime + 1.2);
      osc2.frequency.linearRampToValueAtTime(300, ctx.currentTime + 2);
      osc2.frequency.linearRampToValueAtTime(9000, ctx.currentTime + 2.5);
      osc2.frequency.linearRampToValueAtTime(100, ctx.currentTime + dur);

      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0.08, ctx.currentTime);
      gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.3);
      gain2.gain.setValueAtTime(0.15, ctx.currentTime + 2.5);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);

      const filter2 = ctx.createBiquadFilter();
      filter2.type = "bandpass";
      filter2.frequency.value = 4000;
      filter2.Q.value = 2;

      osc2.connect(filter2);
      filter2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + dur);

      // Layer 3: White noise bursts (static)
      const noiseDuration = dur;
      const noiseBufferSize = ctx.sampleRate * noiseDuration;
      const noiseBuffer = ctx.createBuffer(1, noiseBufferSize, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);

      for (let i = 0; i < noiseBufferSize; i++) {
        const t = i / ctx.sampleRate;
        // Intermittent bursts — gated noise with increasing intensity
        const gate = Math.sin(t * 30) > 0.3 ? 1 : 0.05;
        const intensity = t < 2 ? 0.25 : 0.4;
        noiseData[i] = (Math.random() * 2 - 1) * gate * intensity;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, ctx.currentTime);
      noiseGain.gain.setValueAtTime(0.4, ctx.currentTime + 2);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "lowpass";
      noiseFilter.frequency.setValueAtTime(6000, ctx.currentTime);
      noiseFilter.frequency.setValueAtTime(8000, ctx.currentTime + 2);
      noiseFilter.frequency.linearRampToValueAtTime(400, ctx.currentTime + dur);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSource.start(ctx.currentTime);
      noiseSource.stop(ctx.currentTime + dur);

      // Layer 4: Quick digital beeps (data corruption feel)
      const beepTimes = [0.1, 0.35, 0.6, 1.0, 1.3, 1.65, 2.1, 2.4, 2.7, 3.0, 3.2];
      beepTimes.forEach((time, idx) => {
        const beep = ctx.createOscillator();
        beep.type = "square";
        beep.frequency.value = 400 + idx * 500;

        const beepGain = ctx.createGain();
        beepGain.gain.setValueAtTime(0, ctx.currentTime + time);
        beepGain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + time + 0.02);
        beepGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time + 0.08);

        beep.connect(beepGain);
        beepGain.connect(ctx.destination);
        beep.start(ctx.currentTime + time);
        beep.stop(ctx.currentTime + time + 0.1);
      });

      // Clean up
      setTimeout(() => ctx.close(), 5000);
    } catch {
      // Audio not available
    }
  }, []);

  // Initialize countdown epoch on mount
  useEffect(() => {
    countdownEpochRef.current = performance.now();
  }, []);

  // Roll dice one by one
  const rollNextDice = useCallback(() => {
    if (currentDiceRoll >= 4 || diceAnimating) return;

    setDiceAnimating(true);
    setRollingDice(currentDiceRoll);
    const rollDuration = 600;
    const rollStart = Date.now();
    let soundCounter = 0;

    const animate = () => {
      const elapsed = Date.now() - rollStart;
      if (elapsed < rollDuration) {
        soundCounter++;
        if (soundCounter % 8 === 0) playDiceSound();
        const tempValue = Math.floor(Math.random() * 9) + 1;
        setDiceValues((prev) => {
          const next = [...prev];
          next[currentDiceRoll] = tempValue;
          return next;
        });
        rafRef.current = requestAnimationFrame(animate);
      } else {
        const finalValue = Math.floor(Math.random() * 9) + 1;
        setDiceValues((prev) => {
          const next = [...prev];
          next[currentDiceRoll] = finalValue;
          return next;
        });
        setDiceAnimating(false);
        setRollingDice(-1);
        setCurrentDiceRoll((prev) => prev + 1);
        playDiceLandSound();
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [currentDiceRoll, diceAnimating]);

  // Start rolling on mount and after restart
  useEffect(() => {
    if (gameState !== "rolling" || diceValues.length > 0 || currentDiceRoll > 0) return;
    const timer = setTimeout(() => rollNextDice(), 500);
    return () => clearTimeout(timer);
  }, [gameState, diceValues, currentDiceRoll, rollNextDice]);

  // Auto-roll next dice after one finishes, set target when all 4 done
  useEffect(() => {
    if (currentDiceRoll > 0 && currentDiceRoll < 4 && !diceAnimating) {
      const timer = setTimeout(() => rollNextDice(), 400);
      return () => clearTimeout(timer);
    }
    if (currentDiceRoll === 4 && diceValues.length === 4) {
      const num =
        diceValues[0] * 1000 +
        diceValues[1] * 100 +
        diceValues[2] * 10 +
        diceValues[3];
      setTargetNumber(num);
      setTimeout(() => setGameState("waiting"), 600);
    }
  }, [currentDiceRoll, diceAnimating, diceValues, rollNextDice]);

  // Live countdown ticker
  useEffect(() => {
    countdownEpochRef.current = performance.now();
    countdownStartRef.current = countdown;

    const tick = (now: number) => {
      const elapsed = (now - countdownEpochRef.current) / 1000;
      const current = countdownStartRef.current - elapsed;
      if (current <= 0) {
        setLiveCountdown(0);
        setCountdown(0);
        setGameState("victory");
        return;
      }
      setLiveCountdown(current);
      countdownRafRef.current = requestAnimationFrame(tick);
    };

    countdownRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(countdownRafRef.current);
  }, [countdown]);

  const [tickBeat, setTickBeat] = useState(0); // increments each second for visual pulse

  // Tick sound — soft click each second
  const playTickSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);

      setTimeout(() => ctx.close(), 300);
    } catch {}
  }, []);

  // Count-up animation with second beat
  useEffect(() => {
    if (!isCounting) return;

    startTimeRef.current = performance.now();
    countUpRef.current = 0;
    let lastSecond = -1;

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      countUpRef.current = elapsed;
      setCountUp(elapsed);

      // Check if a new whole second passed
      const currentSecond = Math.floor(elapsed / 1000);
      if (currentSecond > lastSecond) {
        lastSecond = currentSecond;
        setTickBeat(currentSecond);
        playTickSound();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isCounting, playTickSound]);

  const resetDice = useCallback(() => {
    setDiceValues([]);
    setCurrentDiceRoll(0);
    setTargetNumber(0);
    setDiceAnimating(false);
    setRollingDice(-1);
    setLandingSpots(generateDiceLandingSpots());
  }, []);

  // Full game restart — stays in the challenge, no reload
  const restartGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    cancelAnimationFrame(countdownRafRef.current);
    setGameState("rolling");
    setDiceValues([]);
    setCurrentDiceRoll(0);
    setDiceAnimating(false);
    setRollingDice(-1);
    setTargetNumber(0);
    setCountdown(INITIAL_COUNTDOWN);
    setLiveCountdown(INITIAL_COUNTDOWN);
    setCountUp(0);
    setIsCounting(false);
    setAttempts(0);
    setMatchResult(null);
    setHasGapHit(false);
    setLandingSpots(generateDiceLandingSpots());
    countUpRef.current = 0;
    countdownEpochRef.current = performance.now();
    countdownStartRef.current = INITIAL_COUNTDOWN;
    // Pause videos
    if (videoRef.current) videoRef.current.pause();
    if (gyaradosVideoRef.current) gyaradosVideoRef.current.pause();
  }, []);

  const handleStartCount = () => {
    if (gameState !== "waiting") return;
    setCountUp(0);
    setIsCounting(true);
    setGameState("counting");
    setMatchResult(null);
  };

  const handleClick = () => {
    if (gameState !== "counting") return;

    cancelAnimationFrame(rafRef.current);
    setIsCounting(false);
    setAttempts((prev) => prev + 1);

    const clickedMs = Math.round(countUpRef.current);
    setCountUp(clickedMs);

    if (clickedMs === targetNumber) {
      // Exact match
      setMatchResult("exact");
      const currentLive = Math.max(0, liveCountdown);
      const newCountdown = currentLive - targetNumber / 1000;
      setCountdown(Math.max(0, newCountdown));

      if (newCountdown <= 0) {
        setLiveCountdown(0);
        setTimeout(() => setGameState("victory"), 800);
      } else {
        setGameState("result");
        setTimeout(() => {
          setMatchResult(null);
          setGameState("rolling");
          setCountUp(0);
          resetDice();
        }, 1500);
      }
    } else {
      // Easter egg: gap hit (±100ms) → crash timer → glitch → Gyarados
      const gap = Math.abs(clickedMs - targetNumber);
      if (gap <= 100) {
        setHasGapHit(true);
        setMatchResult("exact"); // show as success
        setCountdown(0);
        setLiveCountdown(0);
        cancelAnimationFrame(countdownRafRef.current);
        // Glitch phase: crash → glitch → gyarados
        setTimeout(() => setGameState("glitch"), 500);
        setTimeout(() => setGameState("victory"), 4500);
      } else {
        setMatchResult("miss");
      const currentLive = Math.max(0, liveCountdown);
      const newCountdown = currentLive + targetNumber / 1000;
      setCountdown(newCountdown);
      setGameState("result");

      setTimeout(() => {
        setMatchResult(null);
        setGameState("rolling");
        setCountUp(0);
        resetDice();
      }, 1500);
      }
    }
  };

  // Play glitch sound when entering glitch phase
  useEffect(() => {
    if (gameState === "glitch") {
      playGlitchSound();
    }
  }, [gameState, playGlitchSound]);

  // Force play video with sound on victory
  useEffect(() => {
    if (gameState !== "victory") return;
    const ref = hasGapHit ? gyaradosVideoRef : videoRef;
    const tryPlay = () => {
      const v = ref.current;
      if (!v) { setTimeout(tryPlay, 100); return; }
      v.currentTime = 0;
      v.loop = true;
      v.muted = true;
      v.play().then(() => {
        v.muted = false;
      }).catch(() => {});
    };
    setTimeout(tryPlay, 500);
    return () => {
      if (ref.current) {
        ref.current.pause();
      }
    };
  }, [gameState, hasGapHit]);

  // Trigger dice rolling after a miss or exact (non-victory)
  useEffect(() => {
    if (
      gameState === "rolling" &&
      diceValues.length === 0 &&
      currentDiceRoll === 0 &&
      targetNumber === 0 &&
      attempts > 0
    ) {
      setTimeout(() => rollNextDice(), 300);
    }
  }, [gameState, diceValues, currentDiceRoll, targetNumber, attempts, rollNextDice]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4">
      {/* Animated background particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute h-1 w-1 rounded-full bg-blue-400/20"
            initial={{ x: p.x, y: p.y }}
            animate={{ y: [null, -100], opacity: [0, 1, 0] }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Title with live countdown */}
      <motion.div
        className="relative z-10 mb-8 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-white md:text-4xl">
          Wait for{" "}
          <span
            className={`text-3xl font-mono font-black md:text-5xl ${
              liveCountdown < 5
                ? "text-red-400"
                : liveCountdown < 15
                ? "text-yellow-400"
                : "text-blue-400"
            }`}
          >
            {formatTime(liveCountdown * 1000)}
          </span>{" "}
          seconds
        </h1>
        <p className="text-sm text-slate-400 md:text-base">
          to see the magic ✨
        </p>
      </motion.div>

      {/* Dice overlay — fly during rolling, slide to center when all set */}
      {(gameState === "rolling" || gameState === "waiting") && diceValues.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[0, 1, 2, 3].map((i) => {
            const isActive = rollingDice === i;
            const isSet = i < currentDiceRoll && !isActive;
            const spot = landingSpots[i];
            const dieSize = "h-14 w-14 text-xl md:h-16 md:w-16 md:text-2xl";
            const allSet = currentDiceRoll >= 4 && !diceAnimating;

            if (!isSet && !isActive) return null;

            // Active die — wild tumbling across screen
            if (isActive) {
              return (
                <motion.div
                  key={i}
                  className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-xl border-2 border-yellow-400 bg-yellow-400/15 font-mono font-bold text-yellow-300 shadow-lg backdrop-blur-sm ${dieSize}`}
                  style={{ zIndex: 61 }}
                  initial={{ x: 0, y: 0, rotate: 0 }}
                  animate={{
                    x: [spot.x * 4, -spot.x * 3, spot.x * 5, -spot.x * 2, spot.x * 1],
                    y: [-spot.y * 4, spot.y * 3, -spot.y * 2, spot.y * 4, spot.y * 0.8],
                    rotate: [0, 360, 720, 1080, 1440],
                    scale: [1.5, 1.8, 1.3, 1.6, 1],
                    boxShadow: [
                      "0 0 10px rgba(250,204,21,0.3)",
                      "0 0 50px rgba(250,204,21,0.8)",
                      "0 0 15px rgba(250,204,21,0.2)",
                      "0 0 50px rgba(250,204,21,0.8)",
                      "0 0 30px rgba(59,130,246,0.4)",
                    ],
                  }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                >
                  {diceValues[i] ?? "?"}
                </motion.div>
              );
            }

            // Set die — scattered while rolling, center row when all done
            return (
              <motion.div
                key={i}
                className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center rounded-xl border-2 border-blue-500/50 bg-blue-500/10 font-mono font-bold text-blue-400 shadow-md ${dieSize}`}
                animate={
                  allSet
                    ? { x: `${(i - 1.5) * 4.5}rem`, y: "-2rem", scale: 1, rotate: 0 }
                    : { x: `${spot.x}vw`, y: `${spot.y}vh`, scale: 1, rotate: spot.rotate }
                }
                initial={{ x: 0, y: 0, scale: 1.5, rotate: 0 }}
                transition={{ duration: allSet ? 0.5 : 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                {diceValues[i]}
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Rolling dice phase */}
        {gameState === "rolling" && (
          <motion.div
            key="rolling"
            className="relative z-10 flex flex-col items-center gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-sm text-slate-400 mb-2">
              Rolling dice...
            </p>
            {currentDiceRoll === 4 && diceValues.length === 4 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-center"
              >
                <p className="text-xs text-slate-400">Target</p>
                <p className="font-mono text-xl font-bold text-blue-400">
                  {formatTime(
                    diceValues[0] * 1000 +
                      diceValues[1] * 100 +
                      diceValues[2] * 10 +
                      diceValues[3]
                  )}{" "}
                  seconds
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Waiting phase */}
        {gameState === "waiting" && (
          <motion.div
            key="waiting"
            className="relative z-10 flex flex-col items-center gap-6 mt-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="text-center">
              <p className="text-xs text-slate-500">
                Match this exact time
              </p>
              <p className="font-mono text-2xl font-bold text-blue-400 md:text-3xl">
                {formatTime(targetNumber)}s
              </p>
            </div>
            <motion.button
              onClick={handleStartCount}
              className="rounded-full bg-blue-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25"
              whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(59,130,246,0.3)" }}
              whileTap={{ scale: 0.95 }}
            >
              Start timer
            </motion.button>
          </motion.div>
        )}

        {/* Counting phase */}
        {gameState === "counting" && (
          <motion.div
            key="counting"
            className="relative z-10 flex flex-col items-center gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <p className="text-xs text-slate-500">Click NOW at</p>
              <p className="font-mono text-3xl font-bold text-yellow-400 md:text-5xl">
                {formatTime(targetNumber)}s
              </p>
            </div>

            <motion.button
              onClick={handleClick}
              className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-yellow-400/50 bg-yellow-400/10 shadow-2xl shadow-yellow-400/20 md:h-40 md:w-40"
              whileHover={{ scale: 1.05 }}
              whileTap={{
                scale: 0.9,
                borderColor: "rgb(250,204,21)",
                backgroundColor: "rgba(250,204,21,0.2)",
              }}
              animate={{
                boxShadow: [
                  "0 0 20px rgba(250,204,21,0.1)",
                  "0 0 40px rgba(250,204,21,0.3)",
                  "0 0 20px rgba(250,204,21,0.1)",
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {/* Beat pulse ring */}
              <motion.div
                key={tickBeat}
                className="absolute inset-0 rounded-full border-2 border-yellow-400/60"
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 1.3, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              <div className="text-center">
                <motion.div
                  key={`num-${tickBeat}`}
                  className="font-mono text-2xl font-black text-yellow-400 md:text-3xl"
                  initial={{ scale: 1.15 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {formatTime(countUp)}
                </motion.div>
                <div className="text-xs text-yellow-400/60">seconds</div>
              </div>
            </motion.button>

            <p className="text-xs text-slate-500">
              Tap the button at exactly{" "}
              <span className="font-mono text-yellow-400">
                {formatTime(targetNumber)}s
              </span>
            </p>
          </motion.div>
        )}

        {/* Result phase */}
        {gameState === "result" && (
          <motion.div
            key="result"
            className="relative z-10 flex flex-col items-center gap-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            {matchResult === "exact" ? (
              <div className="text-center">
                <p className="text-3xl">🎯</p>
                <p className="text-xl font-bold text-green-400">
                  EXACT MATCH!
                </p>
                <p className="text-sm text-green-400/60">
                  Countdown decreased by {formatTime(targetNumber)}s
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-3xl">💨</p>
                <p className="text-xl font-bold text-red-400">
                  Miss! You hit {formatTime(countUp)}s
                </p>
                <p className="text-sm text-red-400/60">
                  Countdown increased by {formatTime(targetNumber)}s
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Glitch phase — timer crashed, screen distortion */}
        {gameState === "glitch" && (
          <motion.div
            key="glitch"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {/* Scan lines */}
            <div
              className="absolute inset-0 z-10"
              style={{
                backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.03) 2px, rgba(0,255,255,0.03) 4px)",
                backgroundSize: "100% 4px",
              }}
            />

            {/* Static noise overlay */}
            <motion.div
              className="absolute inset-0 z-20"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
                backgroundSize: "128px 128px",
              }}
              animate={{
                opacity: [0, 0.8, 0.3, 0.9, 0.5, 1, 0.4, 0.7, 0.2, 0.9, 0.6, 1, 0.3],
                scale: [1, 1.02, 0.98, 1.05, 0.97, 1.03, 0.99, 1.01, 1, 1.04, 0.97, 1.02, 1],
              }}
              transition={{ duration: 3.5, ease: "linear" }}
            />

            {/* Color channel split effect */}
            <motion.div
              className="absolute inset-0 z-30 flex items-center justify-center"
              animate={{
                x: [-10, 10, -8, 12, -6, 8, -4, 14, -12, 6, -8, 2, 0],
                filter: [
                  "hue-rotate(0deg) contrast(2) brightness(1.5)",
                  "hue-rotate(90deg) contrast(3) brightness(0.8)",
                  "hue-rotate(180deg) contrast(1.5) brightness(2)",
                  "hue-rotate(270deg) contrast(2.5) brightness(1)",
                  "hue-rotate(120deg) contrast(2) brightness(1.8)",
                  "hue-rotate(300deg) contrast(3) brightness(0.6)",
                  "hue-rotate(45deg) contrast(2) brightness(1.5)",
                  "hue-rotate(200deg) contrast(2.5) brightness(0.9)",
                  "hue-rotate(330deg) contrast(1.5) brightness(2.5)",
                  "hue-rotate(60deg) contrast(3) brightness(0.7)",
                  "hue-rotate(150deg) contrast(2) brightness(1.2)",
                  "hue-rotate(0deg) contrast(1.5) brightness(1)",
                  "hue-rotate(0deg) contrast(1) brightness(1)",
                ],
              }}
              transition={{ duration: 3.5, ease: "linear" }}
            >
              {/* Timer display going crazy */}
              <motion.div
                className="font-mono font-black text-white"
                animate={{
                  fontSize: ["3rem", "8rem", "2rem", "12rem", "4rem", "1rem", "20rem", "6rem", "15rem", "3rem", "25rem", "0.5rem", "8rem"],
                  color: ["#fff", "#f00", "#0ff", "#ff0", "#f0f", "#0f0", "#f00", "#ffd700", "#0ff", "#f00", "#ff0", "#fff", "#ffd700"],
                  textShadow: [
                    "0 0 10px #fff",
                    "0 0 60px #f00, 0 0 120px #0ff",
                    "0 0 20px #0ff",
                    "0 0 100px #ff0, 0 0 200px #f0f",
                    "0 0 30px #f0f",
                    "0 0 10px #0f0",
                    "0 0 200px #f00, 0 0 400px #ff0",
                    "0 0 50px #ffd700",
                    "0 0 80px #0ff, 0 0 160px #f00",
                    "0 0 40px #f0f",
                    "0 0 300px #ff0, 0 0 500px #f00",
                    "0 0 5px #fff",
                    "0 0 60px #ffd700",
                  ],
                }}
                transition={{ duration: 3.5, ease: "linear" }}
              >
                0.000
              </motion.div>
            </motion.div>

            {/* Random glitch text flashes */}
            {["SYS//ERR", "BREACH", "GAP//DET", "LEGEND", "???"].map((text, i) => (
              <motion.div
                key={i}
                className="absolute font-mono text-xs font-bold text-red-500/80 z-40"
                style={{
                  left: `${15 + i * 18}%`,
                  top: `${20 + (i % 3) * 25}%`,
                }}
                animate={{
                  opacity: [0, 1, 0, 1, 0],
                  y: [0, -20, 10, -5, 0],
                }}
                transition={{
                  duration: 0.4,
                  delay: i * 0.3,
                  ease: "linear",
                }}
              >
                {text}
              </motion.div>
            ))}

            {/* Screen shake container */}
            <motion.div
              className="absolute inset-0 z-40"
              animate={{
                x: [0, -8, 12, -6, 10, -4, 6, -2, 0, -14, 10, -6, 0],
                y: [0, 6, -10, 8, -4, 10, -6, 4, 0, -12, 8, -4, 0],
              }}
              transition={{ duration: 3.5, ease: "linear" }}
            />
          </motion.div>
        )}

        {/* Victory phase - mythical full screen overlay */}
        {gameState === "victory" && (
          <motion.div
            key="victory"
            className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Residual glitch flash — only for gap hit */}
            {hasGapHit && (
              <>
                {/* Scan lines that fade out */}
                <motion.div
                  className="absolute inset-0 z-[60] pointer-events-none"
                  style={{
                    backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.05) 2px, rgba(0,255,255,0.05) 4px)",
                    backgroundSize: "100% 4px",
                  }}
                  animate={{ opacity: [0.8, 0.5, 0.3, 0.1, 0] }}
                  transition={{ duration: 2, ease: "easeOut" }}
                />
                {/* Random color flash bars */}
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={`flash-${i}`}
                    className="absolute z-[61] pointer-events-none"
                    style={{
                      left: 0,
                      right: 0,
                      top: `${15 + i * 18}%`,
                      height: `${3 + (i % 3) * 2}px`,
                    }}
                    animate={{
                      opacity: [0, 1, 0, 0.8, 0],
                      backgroundColor: ["#f00", "#0ff", "#ff0", "#f0f", "#fff"],
                      skewX: ["0deg", "10deg", "-5deg", "3deg", "0deg"],
                    }}
                    transition={{
                      duration: 0.5,
                      delay: i * 0.15,
                      ease: "linear",
                    }}
                  />
                ))}
                {/* Final static burst */}
                <motion.div
                  className="absolute inset-0 z-[62] pointer-events-none bg-white"
                  animate={{ opacity: [0.6, 0, 0.3, 0, 0.1, 0] }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </>
            )}

            {hasGapHit ? (
              /* ═══ GLITCH BACKGROUND — Gyarados ═══ */
              <>
                {/* Dark corrupted background */}
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    background: [
                      "radial-gradient(ellipse at 50% 50%, #050008 0%, #000000 70%)",
                      "radial-gradient(ellipse at 50% 50%, #0a0005 0%, #000000 70%)",
                      "radial-gradient(ellipse at 50% 50%, #00050a 0%, #000000 70%)",
                      "radial-gradient(ellipse at 50% 50%, #050008 0%, #000000 70%)",
                    ],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />

                {/* Persistent CRT scan lines */}
                <div
                  className="absolute inset-0 z-10 pointer-events-none"
                  style={{
                    backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,255,255,0.015) 1px, rgba(0,255,255,0.015) 3px)",
                    backgroundSize: "100% 3px",
                  }}
                />

                {/* Glitch data rain */}
                {particles.map((p) => (
                  <motion.div
                    key={`data-${p.id}`}
                    className="absolute font-mono text-[10px] leading-tight text-cyan-400/20 select-none whitespace-pre"
                    style={{ left: `${(p.x / 1000) * 100}%` }}
                    initial={{ y: "-10%", opacity: 0 }}
                    animate={{
                      y: "110%",
                      opacity: [0, 0.5, 0.5, 0],
                    }}
                    transition={{
                      duration: p.duration + 2,
                      repeat: Infinity,
                      delay: p.delay,
                      ease: "linear",
                    }}
                  >
                    {["01100", "ERR//", "11010", "BRECH", "01010", "SYS//", "10110", "GAP//", "00101", "LEGND", "11100", "CRSH/", "10011", "OVRFL", "01101", "VOID//", "11001", "DLETE", "00110", "NULL/"][p.id % 20]}
                  </motion.div>
                ))}

                {/* Horizontal glitch slices */}
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={`slice-${i}`}
                    className="absolute left-0 right-0 pointer-events-none z-20"
                    style={{ top: `${10 + i * 15}%` }}
                    animate={{
                      height: ["1px", "3px", "1px", "5px", "0px", "2px", "0px"],
                      opacity: [0, 0.6, 0, 0.8, 0, 0.4, 0],
                      backgroundColor: ["#0ff", "#f00", "#0ff", "#ff0", "#0ff", "#f0f", "#0ff"],
                      x: ["0%", "5%", "-3%", "8%", "-5%", "2%", "0%"],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.5,
                      ease: "linear",
                    }}
                  />
                ))}

                {/* Pulsing glitch vortex */}
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: "120vmax",
                    height: "120vmax",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                  animate={{
                    background: [
                      "radial-gradient(circle, rgba(0,255,255,0.06) 0%, rgba(255,0,0,0.03) 30%, transparent 60%)",
                      "radial-gradient(circle, rgba(255,0,255,0.06) 0%, rgba(0,255,0,0.03) 30%, transparent 60%)",
                      "radial-gradient(circle, rgba(255,0,0,0.06) 0%, rgba(0,255,255,0.03) 30%, transparent 60%)",
                      "radial-gradient(circle, rgba(0,255,255,0.06) 0%, rgba(255,0,255,0.03) 30%, transparent 60%)",
                    ],
                    scale: [1, 1.15, 1],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Color channel split flashes */}
                {sparkles.map((s, i) => (
                  <motion.div
                    key={`glitch-spark-${i}`}
                    className="absolute pointer-events-none"
                    style={{ left: s.left, top: s.top }}
                    animate={{
                      opacity: [0, 0.8, 0, 0.6, 0],
                      scale: [0.5, 1.5, 0.3, 1.2, 0],
                      backgroundColor: ["#0ff", "#f00", "#ff0", "#f0f", "#0f0"],
                      width: ["2px", "40px", "1px", "20px", "2px"],
                      height: ["2px", "2px", "3px", "1px", "2px"],
                    }}
                    transition={{
                      duration: s.duration,
                      repeat: Infinity,
                      delay: s.delay,
                      ease: "linear",
                    }}
                  />
                ))}

                {/* Random full-width glitch bar that slides */}
                <motion.div
                  className="absolute left-0 right-0 pointer-events-none z-30"
                  animate={{
                    top: ["20%", "45%", "70%", "30%", "80%", "15%", "55%"],
                    height: ["0px", "3px", "0px", "5px", "0px", "2px", "0px"],
                    opacity: [0, 0.7, 0, 0.5, 0, 0.9, 0],
                    backgroundColor: ["transparent", "#0ff", "transparent", "#f0f", "transparent", "#ff0", "transparent"],
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                />
              </>
            ) : (
              /* ═══ MYSTICAL BACKGROUND — Shiny Magikarp ═══ */
              <>
                {/* Deep mystical background */}
                <motion.div
                  className="absolute inset-0"
                  animate={{
                    background: [
                      "radial-gradient(ellipse at 50% 50%, #0a0520 0%, #000000 70%)",
                      "radial-gradient(ellipse at 50% 50%, #0c0518 0%, #000000 70%)",
                      "radial-gradient(ellipse at 50% 50%, #080520 0%, #000000 70%)",
                      "radial-gradient(ellipse at 50% 50%, #0a0520 0%, #000000 70%)",
                    ],
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                />

                {/* Rotating light rays from center */}
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: `conic-gradient(from 0deg at 50% 50%,
                      transparent 0deg, rgba(250,204,21,0.06) 10deg, transparent 20deg,
                      transparent 60deg, rgba(168,85,247,0.06) 70deg, transparent 80deg,
                      transparent 120deg, rgba(96,165,250,0.06) 130deg, transparent 140deg,
                      transparent 180deg, rgba(250,204,21,0.06) 190deg, transparent 200deg,
                      transparent 240deg, rgba(168,85,247,0.06) 250deg, transparent 260deg,
                      transparent 300deg, rgba(96,165,250,0.06) 310deg, transparent 320deg,
                      transparent 360deg
                    )`,
                  }}
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />

                {/* Inner pulsing vortex */}
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: "120vmax",
                    height: "120vmax",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                  animate={{
                    background: [
                      "radial-gradient(circle, rgba(250,204,21,0.08) 0%, rgba(168,85,247,0.04) 30%, transparent 60%)",
                      "radial-gradient(circle, rgba(168,85,247,0.08) 0%, rgba(96,165,250,0.04) 30%, transparent 60%)",
                      "radial-gradient(circle, rgba(96,165,250,0.08) 0%, rgba(244,114,182,0.04) 30%, transparent 60%)",
                      "radial-gradient(circle, rgba(244,114,182,0.08) 0%, rgba(250,204,21,0.04) 30%, transparent 60%)",
                      "radial-gradient(circle, rgba(250,204,21,0.08) 0%, rgba(168,85,247,0.04) 30%, transparent 60%)",
                    ],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Floating rune particles */}
                {particles.map((p) => (
                  <motion.div
                    key={`rune-${p.id}`}
                    className="absolute text-yellow-400/30 text-xs font-mono select-none"
                    style={{ left: `${(p.x / 1000) * 100}%` }}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{
                      y: "-10%",
                      opacity: [0, 0.6, 0.6, 0],
                      rotate: [0, 360],
                    }}
                    transition={{
                      duration: p.duration + 4,
                      repeat: Infinity,
                      delay: p.delay,
                      ease: "linear",
                    }}
                  >
                    {["✧", "◈", "✦", "◇", "⟡", "✶", "❋", "⊛"][p.id % 8]}
                  </motion.div>
                ))}

                {/* Golden sparkles */}
                {sparkles.map((s) => (
                  <motion.div
                    key={s.id}
                    className="absolute text-yellow-300 text-xl"
                    style={{ left: s.left, top: s.top }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0, 2, 0],
                      rotate: [0, 180],
                    }}
                    transition={{
                      duration: s.duration,
                      repeat: Infinity,
                      delay: s.delay,
                    }}
                  >
                    ✦
                  </motion.div>
                ))}
              </>
            )}

            {/* Mythical card */}
            <motion.div
              className="relative z-10 w-full max-w-[300px] mx-4"
              initial={{ scale: 0, opacity: 0 }}
              animate={hasGapHit ? {
                scale: [0, 1.3, 0.9, 1.15, 0.95, 1.1, 0.85, 1.2, 0.9, 1.05, 1],
                opacity: [0, 0.3, 0.8, 0.2, 1, 0.4, 0.9, 0.1, 1, 0.6, 1],
                rotateY: [-180, -90, 30, -20, 10, -5, 15, -8, 3, -1, 0],
                rotateZ: [0, 15, -10, 8, -5, 3, -2, 1, 0, 0, 0],
                x: [0, 30, -20, 15, -10, 5, -3, 8, -5, 0, 0],
                filter: [
                  "brightness(0) blur(10px)",
                  "brightness(5) blur(0px) hue-rotate(180deg)",
                  "brightness(0.5) blur(2px) hue-rotate(90deg)",
                  "brightness(3) blur(0px) saturate(3)",
                  "brightness(0.8) blur(1px) hue-rotate(270deg)",
                  "brightness(2) blur(0px)",
                  "brightness(0.6) blur(3px) hue-rotate(45deg)",
                  "brightness(4) blur(0px) saturate(5) hue-rotate(200deg)",
                  "brightness(0.9) blur(0px)",
                  "brightness(1.2) blur(0px)",
                  "brightness(1) blur(0px)",
                ],
              } : {
                scale: 1,
                opacity: 1,
                rotateY: 0,
              }}
              transition={{ duration: 1.5, ease: "easeOut", delay: hasGapHit ? 0.1 : 0.3 }}
            >
              {/* Outer glow ring */}
              <motion.div
                className="absolute -inset-4 rounded-3xl blur-xl"
                animate={hasGapHit ? {
                  background: [
                    "radial-gradient(circle, rgba(0,255,255,0.5), rgba(255,0,0,0.4), transparent)",
                    "radial-gradient(circle, rgba(255,0,255,0.5), rgba(0,255,0,0.4), transparent)",
                    "radial-gradient(circle, rgba(255,0,0,0.5), rgba(0,255,255,0.4), transparent)",
                    "radial-gradient(circle, rgba(0,255,255,0.5), rgba(255,0,0,0.4), transparent)",
                  ],
                } : {
                  background: [
                    "radial-gradient(circle, rgba(250,204,21,0.4), rgba(168,85,247,0.3), transparent)",
                    "radial-gradient(circle, rgba(168,85,247,0.4), rgba(96,165,250,0.3), transparent)",
                    "radial-gradient(circle, rgba(96,165,250,0.4), rgba(250,204,21,0.3), transparent)",
                    "radial-gradient(circle, rgba(250,204,21,0.4), rgba(168,85,247,0.3), transparent)",
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />

              <motion.div
                className="relative overflow-hidden rounded-2xl shadow-2xl max-w-xs mx-auto"
                animate={{
                  rotateY: [0, 5, -5, 0],
                  rotateX: [0, -3, 3, 0],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              >
                {/* Card border frame */}
                <div className={hasGapHit ? "p-1 bg-gradient-to-br from-cyan-400 via-red-500 to-cyan-400" : "p-1 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600"}>
                  {/* Inner decorative border */}
                  <div className={hasGapHit ? "p-[2px] bg-gradient-to-br from-cyan-300/60 via-red-300/40 to-cyan-300/60" : "p-[2px] bg-gradient-to-br from-yellow-300/60 via-transparent to-yellow-300/60"}>
                    {/* Card body */}
                    <div className={hasGapHit ? "relative bg-gradient-to-b from-[#050a10] via-[#0a0510] to-[#050a10] p-3 md:p-4" : "relative bg-gradient-to-b from-[#1a1005] via-[#2a1a08] to-[#1a1005] p-3 md:p-4"}>
                      {/* Holographic shimmer overlay */}
                      <motion.div
                        className="absolute inset-0"
                        animate={hasGapHit ? {
                          background: [
                            "linear-gradient(135deg, rgba(0,255,255,0.2), rgba(255,0,0,0.2), rgba(0,255,0,0.15))",
                            "linear-gradient(225deg, rgba(255,0,255,0.2), rgba(0,255,255,0.2), rgba(255,0,0,0.15))",
                            "linear-gradient(45deg, rgba(255,0,0,0.2), rgba(0,255,255,0.2), rgba(255,0,255,0.15))",
                            "linear-gradient(315deg, rgba(0,255,255,0.2), rgba(255,0,0,0.2), rgba(0,255,0,0.15))",
                            "linear-gradient(135deg, rgba(0,255,255,0.2), rgba(255,0,0,0.2), rgba(0,255,0,0.15))",
                          ],
                        } : {
                          background: [
                            "linear-gradient(135deg, rgba(96,165,250,0.15), rgba(168,85,247,0.15), rgba(244,114,182,0.15))",
                            "linear-gradient(225deg, rgba(244,114,182,0.15), rgba(168,85,247,0.15), rgba(96,165,250,0.15))",
                            "linear-gradient(45deg, rgba(250,204,21,0.15), rgba(168,85,247,0.15), rgba(96,165,250,0.15))",
                            "linear-gradient(315deg, rgba(96,165,250,0.15), rgba(250,204,21,0.15), rgba(244,114,182,0.15))",
                            "linear-gradient(135deg, rgba(96,165,250,0.15), rgba(168,85,247,0.15), rgba(244,114,182,0.15))",
                          ],
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      />

                      {/* Corner ornaments */}
                      <div className={`absolute top-2 left-2 text-xs font-serif ${hasGapHit ? "text-cyan-500/40" : "text-yellow-500/40"}`}>✧</div>
                      <div className={`absolute top-2 right-2 text-xs font-serif ${hasGapHit ? "text-red-500/40" : "text-yellow-500/40"}`}>✧</div>
                      <div className={`absolute bottom-2 left-2 text-xs font-serif ${hasGapHit ? "text-red-500/40" : "text-yellow-500/40"}`}>✧</div>
                      <div className={`absolute bottom-2 right-2 text-xs font-serif ${hasGapHit ? "text-cyan-500/40" : "text-yellow-500/40"}`}>✧</div>

                      {/* Diamond separator top */}
                      <div className="relative z-10 flex items-center justify-center gap-3 mb-3">
                        <div className={`h-px flex-1 bg-gradient-to-r from-transparent ${hasGapHit ? "via-cyan-500/50" : "via-yellow-500/50"} to-transparent`} />
                        <span className={`text-[10px] ${hasGapHit ? "text-cyan-400" : "text-yellow-400"}`}>{hasGapHit ? "⚡" : "◆"}</span>
                        <div className={`h-px flex-1 bg-gradient-to-r from-transparent ${hasGapHit ? "via-cyan-500/50" : "via-yellow-500/50"} to-transparent`} />
                      </div>

                      {/* Rarity label */}
                      <motion.div
                        className="relative z-10 text-center mb-3"
                        animate={hasGapHit ? { opacity: [0.4, 1, 0.4, 1, 0.4] } : { opacity: [0.6, 1, 0.6] }}
                        transition={hasGapHit ? { duration: 1.5, repeat: Infinity } : { duration: 2, repeat: Infinity }}
                      >
                        <span className={`text-[10px] font-bold uppercase tracking-[0.3em] ${hasGapHit ? "text-cyan-400/90" : "text-yellow-400/90"}`}>
                          {hasGapHit ? "⚡ Legendary ⚡" : "✦ Mythical ✦"}
                        </span>
                      </motion.div>

                      {/* Video */}
                      <div className={`relative z-10 mx-auto mb-4 overflow-hidden rounded-lg border shadow-lg ${hasGapHit ? "border-cyan-500/30 shadow-cyan-500/10" : "border-yellow-500/30 shadow-yellow-500/10"}`}>
                        {hasGapHit ? (
                          <video
                            ref={gyaradosVideoRef}
                            src="/day1/gyarados.mp4"
                            loop
                            playsInline
                            className="w-full"
                          />
                        ) : (
                          <video
                            ref={videoRef}
                            src="/day1/shiny-magicarp.mp4"
                            loop
                            playsInline
                            className="w-full"
                          />
                        )}
                      </div>

                      {/* Name */}
                      <h2 className={`relative z-10 mb-1 text-center text-2xl font-black md:text-3xl ${hasGapHit ? "text-cyan-300 drop-shadow-[0_0_10px_rgba(0,255,255,0.4)]" : "text-yellow-300 drop-shadow-[0_0_10px_rgba(250,204,21,0.3)]"}`}>
                        {hasGapHit ? "Gyarados" : "Shiny Magikarp"}
                      </h2>
                      <p className={`relative z-10 text-center text-xs italic ${hasGapHit ? "text-cyan-400/50" : "text-yellow-400/50"}`}>
                        {hasGapHit ? '"You hit the gap... and unlocked the legend!"' : '"You waited... and the magic appeared!"'}
                      </p>

                      {/* Diamond separator bottom */}
                      <div className="relative z-10 flex items-center justify-center gap-3 mt-3">
                        <div className={`h-px flex-1 bg-gradient-to-r from-transparent ${hasGapHit ? "via-cyan-500/50" : "via-yellow-500/50"} to-transparent`} />
                        <span className={`text-[10px] ${hasGapHit ? "text-cyan-400" : "text-yellow-400"}`}>{hasGapHit ? "⚡" : "◆"}</span>
                        <div className={`h-px flex-1 bg-gradient-to-r from-transparent ${hasGapHit ? "via-cyan-500/50" : "via-yellow-500/50"} to-transparent`} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* <motion.p
              className="relative z-10 mt-6 text-center text-sm text-slate-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              Completed in {attempts} attempt{attempts !== 1 ? "s" : ""} 🎉
            </motion.p> */}

            {/* Retry button */}
            <motion.button
              onClick={restartGame}
              className={`relative z-10 mt-6 rounded-full border px-6 py-2.5 text-sm font-semibold backdrop-blur-sm ${hasGapHit ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-400" : "border-yellow-400/30 bg-yellow-400/10 text-yellow-400"}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2 }}
              whileHover={{ scale: 1.05, borderColor: hasGapHit ? "rgba(0,255,255,0.6)" : "rgba(250,204,21,0.6)" }}
              whileTap={{ scale: 0.95 }}
            >
              Play Again
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attempts counter */}
      {attempts > 0 && gameState !== "victory" && (
        <motion.div
          className="relative z-10 mt-6 text-xs text-slate-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Attempt #{attempts} • Target: {formatTime(targetNumber)}s
        </motion.div>
      )}

      {/* Day label */}
      <motion.div
        className="absolute bottom-6 text-xs tracking-widest text-slate-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        DAY 1 — 30 DAYS WEB CHALLENGE
      </motion.div>

      {/* Back to home — next to side menu */}
      {onHome && gameState !== "victory" && (
        <motion.button
          onClick={onHome}
          className="fixed top-5 left-[4.25rem] z-40 flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/60 shadow-lg shadow-black/20 backdrop-blur-md transition-all hover:bg-white/10 hover:text-white/90 hover:border-white/20"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <svg width="14" height="12" viewBox="0 0 14 12" fill="none" className="stroke-current">
            <path d="M7 1L1 6l6 5M1 6h13" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Home
        </motion.button>
      )}
    </div>
  );
}
