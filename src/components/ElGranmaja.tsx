"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Direction = "down" | "up" | "left" | "right";

const SPRITE_SRC: Record<Direction, string> = {
  down: "/elgranmaja/elgranmaja-down.png",
  up: "/elgranmaja/elgranmaja-up.png",
  left: "/elgranmaja/elgranmaja-left.png",
  right: "/elgranmaja/elgranmaja-right.png",
};

const FRAMES = 4;
const SPRITE_SIZE = 96;
const TV_W = 360;
const TV_H = 280;
const ANIM_INTERVAL = 150;
const MAX_HP = 10000;

function randomSpeed() {
  return 1.0 + Math.random() * 4.0;
}

function randomDmg() {
  return 50 + Math.random() * 2950; // 50–3000
}

interface CharState {
  x: number; y: number;
  vx: number; vy: number;
  dir: Direction;
  frame: number;
  clashTimer: number;
  swimPhase: number;
  hp: number;
}

const NAMES = ["GRANMAJA", "MBAH JAYA"];
const COLORS = ["#00AFFF", "#00E676"];

function makeInitState(): [CharState, CharState] {
  return [
    { x: 20, y: 30, vx: 2.0, vy: 1.5, dir: "down", frame: 0, clashTimer: 0, swimPhase: 0, hp: MAX_HP },
    { x: TV_W - SPRITE_SIZE - 20, y: TV_H - SPRITE_SIZE - 30, vx: -1.8, vy: 2.5, dir: "left", frame: 0, clashTimer: 0, swimPhase: 2, hp: MAX_HP },
  ];
}

export default function ElGranmaja() {
  const [loaded, setLoaded] = useState(false);
  const [clashCount, setClashCount] = useState(0);
  const [winner, setWinner] = useState<number | null>(null); // 0 or 1
  const [collapsed, setCollapsed] = useState(false);

  // Drag state
  const [pos, setPos] = useState({ x: -1, y: -1 }); // -1 means "use default bottom-right"
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const tvRootRef = useRef<HTMLDivElement>(null);

  // DOM refs
  const char0Ref = useRef<HTMLDivElement>(null);
  const char1Ref = useRef<HTMLDivElement>(null);
  const sprite0Ref = useRef<HTMLDivElement>(null);
  const sprite1Ref = useRef<HTMLDivElement>(null);
  const clashFxRef = useRef<HTMLDivElement>(null);
  const hp0BarRef = useRef<HTMLDivElement>(null);
  const hp1BarRef = useRef<HTMLDivElement>(null);
  const hp0TextRef = useRef<HTMLSpanElement>(null);
  const hp1TextRef = useRef<HTMLSpanElement>(null);
  const dmg0Ref = useRef<HTMLDivElement>(null);
  const dmg1Ref = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);

  const clashCountRef = useRef(0);
  const stateRef = useRef<[CharState, CharState]>(makeInitState());
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const frameTimerRef = useRef(0);
  const gameOverRef = useRef(false);

  // Preload sprites
  useEffect(() => {
    let count = 0;
    Object.values(SPRITE_SRC).forEach((src) => {
      const img = new Image();
      img.onload = () => { count++; if (count === 4) setLoaded(true); };
      img.src = src;
    });
  }, []);

  const playClashSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const dur = 0.15;
      const buf = ctx.createBuffer(1, ~~(ctx.sampleRate * dur), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate;
        data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 25) * 0.3
          + Math.sin(t * 4000) * Math.exp(-t * 30) * 0.15;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = "bandpass";
      filt.frequency.value = 2000;
      src.connect(filt);
      filt.connect(ctx.destination);
      src.start();
      setTimeout(() => ctx.close(), 300);
    } catch {}
  }, []);

  const playKOSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const dur = 0.6;
      const buf = ctx.createBuffer(1, ~~(ctx.sampleRate * dur), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate;
        data[i] = Math.sin(t * 200) * Math.exp(-t * 5) * 0.5
          + Math.sin(t * 400) * Math.exp(-t * 7) * 0.3
          + (Math.random() * 2 - 1) * Math.exp(-t * 3) * 0.2;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.value = 0.5;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
      setTimeout(() => ctx.close(), 800);
    } catch {}
  }, []);

  // Show floating damage number
  const showDamage = useCallback((idx: number, dmg: number) => {
    const el = idx === 0 ? dmg0Ref.current : dmg1Ref.current;
    if (!el) return;
    el.textContent = `-${Math.round(dmg)}`;
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(-20px)";
    }, 50);
  }, []);

  // Rematch
  const handleRematch = useCallback(() => {
    stateRef.current = makeInitState();
    gameOverRef.current = false;
    clashCountRef.current = 0;
    setClashCount(0);
    setWinner(null);
    lastTimeRef.current = 0;
    frameTimerRef.current = 0;

    // Reset HP bars
    if (hp0BarRef.current) hp0BarRef.current.style.width = "100%";
    if (hp1BarRef.current) hp1BarRef.current.style.width = "100%";
    if (hp0TextRef.current) hp0TextRef.current.textContent = MAX_HP.toLocaleString();
    if (hp1TextRef.current) hp1TextRef.current.textContent = MAX_HP.toLocaleString();
  }, []);

  // Drag handlers
  const onDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const curX = pos.x === -1 ? (tvRootRef.current?.offsetLeft ?? window.innerWidth - (TV_W + 48)) : pos.x;
    const curY = pos.y === -1 ? (tvRootRef.current?.offsetTop ?? window.innerHeight - (TV_H + 120)) : pos.y;
    dragRef.current = { startX: clientX, startY: clientY, origX: curX, origY: curY };
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - dragRef.current.startX;
      const dy = clientY - dragRef.current.startY;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 60, dragRef.current.origX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 60, dragRef.current.origY + dy)),
      });
    };
    const onUp = () => { dragRef.current = null; };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  // Game loop
  useEffect(() => {
    if (!loaded) return;

    const arenaW = TV_W - SPRITE_SIZE;
    const arenaH = TV_H - SPRITE_SIZE;
    const charEls = [char0Ref.current, char1Ref.current] as [HTMLDivElement | null, HTMLDivElement | null];
    const spriteEls = [sprite0Ref.current, sprite1Ref.current] as [HTMLDivElement | null, HTMLDivElement | null];
    const hpBars = [hp0BarRef.current, hp1BarRef.current] as [HTMLDivElement | null, HTMLDivElement | null];
    const hpTexts = [hp0TextRef.current, hp1TextRef.current] as [HTMLSpanElement | null, HTMLSpanElement | null];
    const clashEl = clashFxRef.current;

    const tick = (time: number) => {
      if (gameOverRef.current) {
        animRef.current = requestAnimationFrame(tick);
        return;
      }

      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = Math.min((time - lastTimeRef.current) / 16, 3);
      lastTimeRef.current = time;

      const c = stateRef.current;

      for (let i = 0; i < 2; i++) {
        const ch = c[i];
        ch.x += ch.vx * delta;
        ch.y += ch.vy * delta;

        let bounced = false;
        if (ch.x < 0) { ch.x = 0; ch.vx = Math.abs(ch.vx); bounced = true; }
        if (ch.x > arenaW) { ch.x = arenaW; ch.vx = -Math.abs(ch.vx); bounced = true; }
        if (ch.y < 0) { ch.y = 0; ch.vy = Math.abs(ch.vy); bounced = true; }
        if (ch.y > arenaH) { ch.y = arenaH; ch.vy = -Math.abs(ch.vy); bounced = true; }

        if (bounced) {
          const ns = randomSpeed();
          const spd = Math.sqrt(ch.vx ** 2 + ch.vy ** 2);
          if (spd > 0) { ch.vx = (ch.vx / spd) * ns; ch.vy = (ch.vy / spd) * ns; }
        }

        const absVx = Math.abs(ch.vx), absVy = Math.abs(ch.vy);
        ch.dir = absVy > absVx ? (ch.vy < 0 ? "up" : "down") : (ch.vx < 0 ? "left" : "right");

        const spd = Math.sqrt(ch.vx ** 2 + ch.vy ** 2);
        ch.swimPhase += 0.08 * delta * (spd / 2.0);
        if (ch.clashTimer > 0) ch.clashTimer -= delta * 0.05;

        if (ch.clashTimer <= 0 && spd < 2.5 && spd > 0) {
          ch.vx *= 1.008;
          ch.vy *= 1.008;
        }

        // Direct DOM
        const wrapper = charEls[i];
        const sprite = spriteEls[i];
        if (!wrapper || !sprite) continue;

        const clashing = ch.clashTimer > 0;
        const shakeX = clashing ? (Math.random() - 0.5) * 6 : 0;
        const shakeY = clashing ? (Math.random() - 0.5) * 6 : 0;
        const bobY = Math.sin(ch.swimPhase) * 3;

        wrapper.style.left = (ch.x + shakeX) + "px";
        wrapper.style.top = (ch.y + shakeY + bobY) + "px";

        sprite.style.backgroundImage = `url(${SPRITE_SRC[ch.dir]})`;
        sprite.style.backgroundPosition = `${-ch.frame * SPRITE_SIZE}px 0`;
        sprite.style.filter = clashing
          ? "brightness(2) saturate(0) drop-shadow(0 0 6px #fff)"
          : "drop-shadow(0 0 3px rgba(80,180,255,0.3))";
      }

      // Collision
      const dx = c[0].x - c[1].x;
      const dy = c[0].y - c[1].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const collisionDist = SPRITE_SIZE * 0.7;

      if (dist < collisionDist && c[0].clashTimer <= 0 && c[1].clashTimer <= 0) {
        const midX = (c[0].x + c[1].x) / 2 + SPRITE_SIZE / 2;
        const midY = (c[0].y + c[1].y) / 2 + SPRITE_SIZE / 2;

        // Push apart
        if (dist > 0) {
          const overlap = collisionDist - dist;
          const pushX = (dx / dist) * overlap * 0.6;
          const pushY = (dy / dist) * overlap * 0.6;
          c[0].x += pushX; c[0].y += pushY;
          c[1].x -= pushX; c[1].y -= pushY;
        }

        // Reflect
        if (dist > 0) {
          const nx = dx / dist, ny = dy / dist;
          const relVx = c[0].vx - c[1].vx;
          const relVy = c[0].vy - c[1].vy;
          const dot = relVx * nx + relVy * ny;
          c[0].vx -= dot * nx; c[0].vy -= dot * ny;
          c[1].vx += dot * nx; c[1].vy += dot * ny;
        } else {
          c[0].vx = -c[0].vx; c[1].vx = -c[1].vx;
        }

        // Reduce speeds
        for (let i = 0; i < 2; i++) {
          const ns = randomSpeed() * 0.3;
          const s = Math.sqrt(c[i].vx ** 2 + c[i].vy ** 2);
          if (s > 0) { c[i].vx = (c[i].vx / s) * ns; c[i].vy = (c[i].vy / s) * ns; }
        }

        c[0].clashTimer = 1;
        c[1].clashTimer = 1;

        // Damage!
        const dmg0 = randomDmg();
        const dmg1 = randomDmg();
        c[0].hp = Math.max(0, c[0].hp - dmg0);
        c[1].hp = Math.max(0, c[1].hp - dmg1);

        // Update HP bars via direct DOM
        for (let i = 0; i < 2; i++) {
          const pct = (c[i].hp / MAX_HP) * 100;
          const bar = hpBars[i];
          const txt = hpTexts[i];
          if (bar) {
            bar.style.width = pct + "%";
            bar.style.background = pct > 50 ? COLORS[i]
              : pct > 25 ? "#f59e0b"
              : "#ef4444";
          }
          if (txt) txt.textContent = Math.round(c[i].hp).toLocaleString();
        }

        showDamage(0, dmg0);
        showDamage(1, dmg1);

        // Clash FX
        if (clashEl) {
          clashEl.style.left = (midX - 20) + "px";
          clashEl.style.top = (midY - 20) + "px";
          clashEl.style.display = "block";
          clashEl.style.opacity = "1";
          setTimeout(() => { clashEl.style.display = "none"; clashEl.style.opacity = "0"; }, 300);
        }

        clashCountRef.current++;
        setClashCount(clashCountRef.current);
        playClashSound();

        // Check KO
        if (c[0].hp <= 0 || c[1].hp <= 0) {
          gameOverRef.current = true;
          let w: number;
          if (c[0].hp <= 0 && c[1].hp <= 0) w = -1; // draw
          else if (c[0].hp <= 0) w = 1;
          else w = 0;
          setWinner(w);
          playKOSound();
        }
      }

      // Advance frame
      frameTimerRef.current += delta * 16;
      if (frameTimerRef.current >= ANIM_INTERVAL) {
        frameTimerRef.current = 0;
        c[0].frame = (c[0].frame + 1) % FRAMES;
        c[1].frame = (c[1].frame + 1) % FRAMES;
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [loaded, playClashSound, playKOSound, showDamage]);

  const posStyle = pos.x === -1
    ? { bottom: 16, right: 16 }
    : { left: pos.x, top: pos.y };

  return (
    <div
      ref={tvRootRef}
      className="fixed z-50 select-none"
      style={{
        ...posStyle,
        width: collapsed ? 200 : TV_W + 24,
        fontFamily: "var(--font-geist-mono), monospace",
        transition: "width 0.3s ease",
      }}
    >
      {/* TV Outer frame */}
      <div
        style={{
          background: "linear-gradient(145deg, #1a1a2e, #0f0f1a)",
          borderRadius: 16,
          padding: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,175,255,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* TV Header — draggable */}
        <div
          className="flex items-center justify-between mb-2 px-1 cursor-grab active:cursor-grabbing"
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
        >
          <div className="flex items-center gap-2">
            <div
              style={{
                width: 6, height: 6, borderRadius: "50%",
                background: loaded ? "#00E676" : "#ff3333",
                boxShadow: loaded ? "0 0 6px #00E676" : "0 0 4px #ff3333",
              }}
            />
            <span className="text-[10px] font-bold tracking-wider" style={{ color: "rgba(0,175,255,0.6)" }}>
              GRANMAJA ARENA
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: "#FFD700" }}>
              {"💥 " + clashCount}
            </span>
            {/* Collapse toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
              style={{
                width: 18, height: 18,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 4,
                border: "1px solid rgba(0,175,255,0.2)",
                background: "rgba(0,175,255,0.05)",
                color: "rgba(0,175,255,0.6)",
                fontSize: 10, cursor: "pointer",
                transition: "all 0.2s",
                lineHeight: 1,
              }}
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? "▸" : "▾"}
            </button>
          </div>
        </div>

        {/* Collapsible content — hidden via CSS, NOT unmounted so refs stay valid */}
        <div style={{ display: collapsed ? "none" : "block" }}>
            {/* HP Bars */}
            <div className="flex gap-2 mb-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[8px] font-bold" style={{ color: COLORS[i] }}>
                  {NAMES[i]}
                </span>
                <span
                  ref={i === 0 ? hp0TextRef : hp1TextRef}
                  className="text-[8px] font-bold"
                  style={{ color: COLORS[i] }}
                >
                  {MAX_HP.toLocaleString()}
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.08)",
                  overflow: "hidden",
                }}
              >
                <div
                  ref={i === 0 ? hp0BarRef : hp1BarRef}
                  style={{
                    height: "100%",
                    width: "100%",
                    borderRadius: 4,
                    background: COLORS[i],
                    transition: "width 0.3s ease, background 0.3s ease",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Screen bezel */}
        <div
          style={{
            borderRadius: 8,
            overflow: "hidden",
            border: "2px solid rgba(0,175,255,0.15)",
            boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)",
          }}
        >
          {/* Screen */}
          <div
            ref={screenRef}
            style={{
              width: TV_W,
              height: TV_H,
              background: "linear-gradient(180deg, #061a2e 0%, #0a2844 40%, #0d3256 100%)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Water caustics */}
            <div style={{
              position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
              backgroundImage: `
                radial-gradient(ellipse 80px 40px at 20% 15%, rgba(80,180,255,0.06) 0%, transparent 100%),
                radial-gradient(ellipse 60px 30px at 60% 10%, rgba(80,180,255,0.05) 0%, transparent 100%),
                radial-gradient(ellipse 90px 35px at 80% 20%, rgba(80,180,255,0.04) 0%, transparent 100%)
              `,
              animation: "caustics 6s ease-in-out infinite alternate",
            }} />
            {/* Water wave */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 30, zIndex: 2, pointerEvents: "none" }}>
              <svg width="100%" height="12" style={{ position: "absolute", top: 0 }}>
                <path d="M0,6 Q40,0 80,6 T160,6 T240,6 T320,6 T400,6 V12 H0 Z" fill="rgba(60,160,255,0.08)" style={{ animation: "wave-top 3s ease-in-out infinite" }} />
              </svg>
            </div>
            {/* Scanlines */}
            <div style={{
              position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none",
              background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)",
            }} />
            {/* Ambient bubbles */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`ab-${i}`} style={{
                position: "absolute",
                left: `${10 + i * 11}%`,
                bottom: `${5 + (i % 3) * 10}%`,
                width: 3 + (i % 3) * 2,
                height: 3 + (i % 3) * 2,
                borderRadius: "50%",
                background: "rgba(120,200,255,0.25)",
                border: "1px solid rgba(150,220,255,0.15)",
                animation: `ambient-bubble ${3 + i * 0.7}s ease-in-out infinite`,
                animationDelay: `${i * 0.8}s`,
                pointerEvents: "none",
                zIndex: 5,
              }} />
            ))}
            {/* Grid floor */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: "40%",
              background: "linear-gradient(180deg, transparent, rgba(0,175,255,0.03))",
              borderTop: "1px solid rgba(0,175,255,0.05)",
              pointerEvents: "none",
            }} />

            {/* Character 0 */}
            <div ref={char0Ref} style={{ position: "absolute", width: SPRITE_SIZE, height: SPRITE_SIZE, zIndex: 8 }}>
              <div style={{
                position: "absolute", inset: -4, borderRadius: "50%",
                background: "radial-gradient(ellipse, rgba(0,175,255,0.1), transparent 70%)",
                pointerEvents: "none",
              }} />
              <div ref={sprite0Ref} style={{
                position: "absolute", inset: 0,
                backgroundImage: `url(${SPRITE_SRC.down})`,
                backgroundSize: `${SPRITE_SIZE * FRAMES}px ${SPRITE_SIZE}px`,
                backgroundRepeat: "no-repeat",
                imageRendering: "pixelated",
              }} />
              {/* Floating damage */}
              <div ref={dmg0Ref} style={{
                position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                fontSize: 11, fontWeight: 900, color: "#ff4444",
                textShadow: "0 0 4px rgba(255,0,0,0.6)",
                opacity: 0, transition: "opacity 0.5s, transform 0.5s",
                pointerEvents: "none", whiteSpace: "nowrap",
              }} />
            </div>

            {/* Character 1 */}
            <div ref={char1Ref} style={{ position: "absolute", width: SPRITE_SIZE, height: SPRITE_SIZE, zIndex: 8 }}>
              <div style={{
                position: "absolute", inset: -4, borderRadius: "50%",
                background: "radial-gradient(ellipse, rgba(0,230,118,0.1), transparent 70%)",
                pointerEvents: "none",
              }} />
              <div ref={sprite1Ref} style={{
                position: "absolute", inset: 0,
                backgroundImage: `url(${SPRITE_SRC.left})`,
                backgroundSize: `${SPRITE_SIZE * FRAMES}px ${SPRITE_SIZE}px`,
                backgroundRepeat: "no-repeat",
                imageRendering: "pixelated",
              }} />
              {/* Floating damage */}
              <div ref={dmg1Ref} style={{
                position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                fontSize: 11, fontWeight: 900, color: "#ff4444",
                textShadow: "0 0 4px rgba(255,0,0,0.6)",
                opacity: 0, transition: "opacity 0.5s, transform 0.5s",
                pointerEvents: "none", whiteSpace: "nowrap",
              }} />
            </div>

            {/* Clash FX */}
            <div ref={clashFxRef} style={{
              position: "absolute", width: 40, height: 40, zIndex: 20,
              pointerEvents: "none", display: "none",
            }}>
              <div style={{
                width: "100%", height: "100%", borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255,255,100,0.9), rgba(255,150,50,0.5), transparent 70%)",
                animation: "clash-burst 0.3s ease-out forwards",
              }} />
            </div>

            {/* KO Overlay */}
            {winner !== null && (
              <div style={{
                position: "absolute", inset: 0, zIndex: 30,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.7)",
                backdropFilter: "blur(2px)",
              }}>
                <div style={{
                  fontSize: 28, fontWeight: 900,
                  color: "#FFD700",
                  textShadow: "0 0 20px rgba(255,215,0,0.6), 0 2px 8px rgba(0,0,0,0.8)",
                  letterSpacing: 4,
                  animation: "ko-pulse 0.8s ease-in-out infinite alternate",
                }}>
                  K.O.!
                </div>
                <div style={{
                  fontSize: 12, fontWeight: 700,
                  color: winner === -1 ? "#9AA4B2" : COLORS[winner],
                  textShadow: `0 0 10px ${winner === -1 ? "rgba(154,164,178,0.5)" : COLORS[winner]}44`,
                  marginTop: 4,
                }}>
                  {winner === -1 ? "DRAW!" : `${NAMES[winner]} WINS!`}
                </div>
                <button
                  onClick={handleRematch}
                  style={{
                    marginTop: 10,
                    padding: "4px 16px",
                    borderRadius: 6,
                    border: "1px solid rgba(255,215,0,0.3)",
                    background: "rgba(255,215,0,0.1)",
                    color: "#FFD700",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 1,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,215,0,0.2)";
                    e.currentTarget.style.transform = "scale(1.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,215,0,0.1)";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  REMATCH
                </button>
              </div>
            )}
          </div>
        </div>

          {/* Speaker grille */}
          <div className="flex items-center justify-center gap-1 mt-2">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} style={{ width: 2, height: 8, borderRadius: 1, background: "rgba(0,175,255,0.08)" }} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes clash-burst {
          0% { transform: scale(0.3); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes caustics {
          0% { transform: translateX(-10px) translateY(3px); }
          100% { transform: translateX(10px) translateY(-3px); }
        }
        @keyframes wave-top {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(-8px); }
        }
        @keyframes ambient-bubble {
          0% { transform: translateY(0) translateX(0); opacity: 0.5; }
          50% { transform: translateY(-50%) translateX(3px); opacity: 0.3; }
          100% { transform: translateY(-100%) translateX(-2px); opacity: 0; }
        }
        @keyframes ko-pulse {
          0% { transform: scale(1); }
          100% { transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
