"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Direction = "down" | "up" | "left" | "right";

interface SpriteConfig {
  right: string; up: string; down: string;
  rightCols: number; rightRows: number;
  upDownFrames: number;
}

const GM: SpriteConfig = {
  right: "/ganbloop/granmaja_right.png", up: "/ganbloop/granmaja_up.png", down: "/ganbloop/granmaja_down.png",
  rightCols: 4, rightRows: 2, upDownFrames: 2,
};
const BL: SpriteConfig = {
  right: "/ganbloop/bloop_right.png", up: "/ganbloop/bloop_up.png", down: "/ganbloop/bloop_down.png",
  rightCols: 4, rightRows: 2, upDownFrames: 2,
};

const SZ = 64;
const TV_W = 420;
const TV_H = 320;
const ANIM_MS = 120;
const MAX_HP = 10000;

// 0,1 = Granmaja team; 2,3 = Bloop team
const TEAM = [0, 0, 1, 1];
const CFGS = [GM, GM, BL, BL];
const NAMES = ["GRANMAJA 1", "GRANMAJA 2", "BLOOP 1", "BLOOP 2"];
const TC = ["#FF8C42", "#FF8C42", "#A855F7", "#A855F7"]; // individual colors

function rSpd() { return 1.0 + Math.random() * 4.0; }
function rDmg() { return 50 + Math.random() * 2950; }

interface Ch {
  x: number; y: number; vx: number; vy: number;
  dir: Direction; frame: number; ct: number; sp: number; hp: number;
}

function initChars(): Ch[] {
  return [
    { x: 30, y: 30, vx: 2, vy: 1.5, dir: "down", frame: 0, ct: 0, sp: 0, hp: MAX_HP },
    { x: TV_W - SZ - 30, y: 30, vx: -1.5, vy: 2, dir: "down", frame: 0, ct: 0, sp: 1.5, hp: MAX_HP },
    { x: 30, y: TV_H - SZ - 30, vx: 1.8, vy: -1.2, dir: "up", frame: 0, ct: 0, sp: 3, hp: MAX_HP },
    { x: TV_W - SZ - 30, y: TV_H - SZ - 30, vx: -2, vy: -1.8, dir: "up", frame: 0, ct: 0, sp: 4.5, hp: MAX_HP },
  ];
}

function bgSz(d: Direction, c: SpriteConfig): string {
  if (d === "right" || d === "left") return `${c.rightCols * SZ}px ${c.rightRows * SZ}px`;
  return `${SZ}px ${c.upDownFrames * SZ}px`;
}
function bgPos(d: Direction, f: number, c: SpriteConfig): string {
  if (d === "right" || d === "left") {
    const tf = c.rightCols * c.rightRows, fr = f % tf, col = fr % c.rightCols, row = Math.floor(fr / c.rightCols);
    return `${-(col * SZ)}px ${-(row * SZ)}px`;
  }
  return `0px ${-(f % c.upDownFrames) * SZ}px`;
}
function fCnt(d: Direction, c: SpriteConfig): number {
  return (d === "right" || d === "left") ? c.rightCols * c.rightRows : c.upDownFrames;
}

export default function GanBloop() {
  const [loaded, setLoaded] = useState(false);
  const [clashCount, setClashCount] = useState(0);
  const [winner, setWinner] = useState<number | null>(null); // team 0 or 1, -1 draw
  const [collapsed, setCollapsed] = useState(true);
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const wrapR = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const sprR = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const dmgR = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const hpBarR = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);
  const hpTxtR = useRef<(HTMLSpanElement | null)[]>([null, null, null, null]);
  const clashFxR = useRef<(HTMLDivElement | null)[]>([null, null, null, null]);

  const stateR = useRef(initChars());
  const animR = useRef(0);
  const lastT = useRef(0);
  const ftR = useRef(0);
  const ccR = useRef(0);
  const overR = useRef(false);
  const collapsedR = useRef(true);
  const winnerSpriteRef = useRef<HTMLDivElement>(null);
  const winnerSprite2Ref = useRef<HTMLDivElement>(null);
  const winnerFrameRef = useRef(0);

  useEffect(() => {
    let n = 0;
    [GM, BL].forEach(c => [c.right, c.up, c.down].forEach(s => {
      const img = new Image(); img.onload = () => { n++; if (n === 6) setLoaded(true); }; img.src = s;
    }));
  }, []);

  const playClash = useCallback(() => {
    try {
      const ctx = new AudioContext(), dur = 0.15;
      const buf = ctx.createBuffer(1, ~~(ctx.sampleRate * dur), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) { const t = i / ctx.sampleRate; d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 25) * 0.3 + Math.sin(t * 4000) * Math.exp(-t * 30) * 0.15; }
      const s = ctx.createBufferSource(); s.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2000;
      s.connect(f); f.connect(ctx.destination); s.start();
      setTimeout(() => ctx.close(), 300);
    } catch {}
  }, []);

  const playKO = useCallback(() => {
    try {
      const ctx = new AudioContext(), dur = 0.6;
      const buf = ctx.createBuffer(1, ~~(ctx.sampleRate * dur), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) { const t = i / ctx.sampleRate; d[i] = Math.sin(t * 200) * Math.exp(-t * 5) * 0.5 + Math.sin(t * 400) * Math.exp(-t * 7) * 0.3 + (Math.random() * 2 - 1) * Math.exp(-t * 3) * 0.2; }
      const s = ctx.createBufferSource(); s.buffer = buf;
      const g = ctx.createGain(); g.gain.value = 0.5; s.connect(g); g.connect(ctx.destination); s.start();
      setTimeout(() => ctx.close(), 800);
    } catch {}
  }, []);

  const showDmg = useCallback((i: number, dmg: number) => {
    const el = dmgR.current[i]; if (!el) return;
    el.textContent = `-${Math.round(dmg)}`;
    el.style.opacity = "1"; el.style.transform = "translateX(-50%) translateY(0)";
    setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateX(-50%) translateY(-20px)"; }, 50);
  }, []);

  const showClashFx = useCallback((idx: number, x: number, y: number) => {
    const el = clashFxR.current[idx]; if (!el) return;
    el.style.left = (x + SZ / 2 - 20) + "px"; el.style.top = (y + SZ / 2 - 20) + "px";
    el.style.display = "block"; el.style.opacity = "1";
    setTimeout(() => { el.style.display = "none"; el.style.opacity = "0"; }, 300);
  }, []);

  const rematch = useCallback(() => {
    stateR.current = initChars(); overR.current = false; ccR.current = 0;
    setClashCount(0); setWinner(null); lastT.current = 0; ftR.current = 0;
    winnerFrameRef.current = 0;
    if (winnerSpriteRef.current) winnerSpriteRef.current.style.backgroundPosition = "0px 0px";
    if (winnerSprite2Ref.current) winnerSprite2Ref.current.style.backgroundPosition = "0px 0px";
    for (let i = 0; i < 4; i++) {
      const bar = hpBarR.current[i], txt = hpTxtR.current[i];
      if (bar) { bar.style.width = "100%"; bar.style.background = TC[i]; }
      if (txt) txt.textContent = MAX_HP.toLocaleString();
    }
  }, []);

  const onDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    const ox = pos.x === -1 ? (rootRef.current?.offsetLeft ?? 16) : pos.x;
    const oy = pos.y === -1 ? (rootRef.current?.offsetTop ?? window.innerHeight - (TV_H + 160)) : pos.y;
    dragRef.current = { sx: cx, sy: cy, ox, oy };
  }, [pos]);

  useEffect(() => {
    const mv = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current) return;
      const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
      const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 60, dragRef.current.ox + cx - dragRef.current.sx)),
        y: Math.max(0, Math.min(window.innerHeight - 60, dragRef.current.oy + cy - dragRef.current.sy)),
      });
    };
    const up = () => { dragRef.current = null; };
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", mv); window.addEventListener("touchend", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); window.removeEventListener("touchmove", mv); window.removeEventListener("touchend", up); };
  }, []);

  // Game loop
  useEffect(() => {
    if (!loaded) return;
    const aW = TV_W - SZ, aH = TV_H - SZ;

    const tick = (time: number) => {
      if (overR.current || collapsedR.current) { lastT.current = 0; animR.current = requestAnimationFrame(tick); return; }
      if (!lastT.current) lastT.current = time;
      const dt = Math.min((time - lastT.current) / 16, 3);
      lastT.current = time;
      const c = stateR.current;

      // Move all 4
      for (let i = 0; i < 4; i++) {
        const ch = c[i];
        if (ch.hp <= 0) { // dead chars stop moving, go invisible
          const w = wrapR.current[i];
          if (w) w.style.opacity = "0.2";
          continue;
        }
        ch.x += ch.vx * dt; ch.y += ch.vy * dt;
        let b = false;
        if (ch.x < 0) { ch.x = 0; ch.vx = Math.abs(ch.vx); b = true; }
        if (ch.x > aW) { ch.x = aW; ch.vx = -Math.abs(ch.vx); b = true; }
        if (ch.y < 0) { ch.y = 0; ch.vy = Math.abs(ch.vy); b = true; }
        if (ch.y > aH) { ch.y = aH; ch.vy = -Math.abs(ch.vy); b = true; }
        if (b) { const ns = rSpd(), sp = Math.sqrt(ch.vx ** 2 + ch.vy ** 2); if (sp > 0) { ch.vx = (ch.vx / sp) * ns; ch.vy = (ch.vy / sp) * ns; } }
        const ax = Math.abs(ch.vx), ay = Math.abs(ch.vy);
        ch.dir = ay > ax ? (ch.vy < 0 ? "up" : "down") : (ch.vx < 0 ? "left" : "right");
        const sp = Math.sqrt(ch.vx ** 2 + ch.vy ** 2);
        ch.sp += 0.08 * dt * (sp / 2);
        if (ch.ct > 0) ch.ct -= dt * 0.05;
        if (ch.ct <= 0 && sp < 2.5 && sp > 0) { ch.vx *= 1.008; ch.vy *= 1.008; }

        // DOM
        const w = wrapR.current[i], s = sprR.current[i];
        if (!w || !s) continue;
        const cl = ch.ct > 0;
        w.style.left = (ch.x + (cl ? (Math.random() - 0.5) * 6 : 0)) + "px";
        w.style.top = (ch.y + (cl ? (Math.random() - 0.5) * 6 : 0) + Math.sin(ch.sp) * 3) + "px";

        const cfg = CFGS[i], useL = ch.dir === "left";
        const rd: Direction = useL ? "right" : ch.dir;
        const src = rd === "right" ? cfg.right : rd === "up" ? cfg.up : cfg.down;
        s.style.backgroundImage = `url(${src})`;
        s.style.backgroundSize = bgSz(rd, cfg);
        s.style.backgroundPosition = bgPos(rd, ch.frame, cfg);
        s.style.transform = useL ? "scaleX(-1)" : "scaleX(1)";
        s.style.filter = cl ? "brightness(2) saturate(0) drop-shadow(0 0 6px #fff)" : `drop-shadow(0 0 3px ${TC[i]}44)`;
      }

      // Collisions: all pairs
      const colD = SZ * 0.65;
      for (let i = 0; i < 4; i++) {
        if (c[i].hp <= 0) continue;
        for (let j = i + 1; j < 4; j++) {
          if (c[j].hp <= 0) continue;
          const dx = c[i].x - c[j].x, dy = c[i].y - c[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist >= colD || c[i].ct > 0 || c[j].ct > 0) continue;

          // Always bounce
          if (dist > 0) {
            const overlap = colD - dist;
            const px = (dx / dist) * overlap * 0.6, py = (dy / dist) * overlap * 0.6;
            c[i].x += px; c[i].y += py; c[j].x -= px; c[j].y -= py;
            const nx = dx / dist, ny = dy / dist;
            const dot = (c[i].vx - c[j].vx) * nx + (c[i].vy - c[j].vy) * ny;
            c[i].vx -= dot * nx; c[i].vy -= dot * ny;
            c[j].vx += dot * nx; c[j].vy += dot * ny;
          } else { c[i].vx = -c[i].vx; c[j].vx = -c[j].vx; }

          // Slow down
          for (const k of [i, j]) {
            const ns = rSpd() * 0.3, s = Math.sqrt(c[k].vx ** 2 + c[k].vy ** 2);
            if (s > 0) { c[k].vx = (c[k].vx / s) * ns; c[k].vy = (c[k].vy / s) * ns; }
          }
          c[i].ct = 1; c[j].ct = 1;

          // Damage ONLY if cross-team
          if (TEAM[i] !== TEAM[j]) {
            const di = rDmg(), dj = rDmg();
            c[i].hp = Math.max(0, c[i].hp - di);
            c[j].hp = Math.max(0, c[j].hp - dj);
            showDmg(i, di); showDmg(j, dj);

            // Update individual HP bars
            for (const k of [i, j]) {
              const pct = (c[k].hp / MAX_HP) * 100;
              const bar = hpBarR.current[k], txt = hpTxtR.current[k];
              if (bar) { bar.style.width = pct + "%"; bar.style.background = pct > 50 ? TC[k] : pct > 25 ? "#f59e0b" : "#ef4444"; }
              if (txt) txt.textContent = Math.round(c[k].hp).toLocaleString();
            }

            showClashFx(i, c[i].x, c[i].y);
            ccR.current++; setClashCount(ccR.current); playClash();

            // Check KO: both members of a team dead?
            const t0alive = c[0].hp > 0 || c[1].hp > 0;
            const t1alive = c[2].hp > 0 || c[3].hp > 0;
            if (!t0alive || !t1alive) {
              overR.current = true;
              const w = !t0alive && !t1alive ? -1 : !t0alive ? 1 : 0;
              setWinner(w); playKO();
            }
          }
        }
      }

      // Advance frames
      ftR.current += dt * 16;
      if (ftR.current >= ANIM_MS) {
        ftR.current = 0;
        for (let i = 0; i < 4; i++) if (c[i].hp > 0) c[i].frame = (c[i].frame + 1) % fCnt(c[i].dir, CFGS[i]);
      }

      animR.current = requestAnimationFrame(tick);
    };

    animR.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animR.current);
  }, [loaded, playClash, playKO, showDmg, showClashFx]);

  // Winner sprite animation — JS-driven for smooth frame cycling
  useEffect(() => {
    if (winner === null) return;
    const dispSz = winner === -1 ? 72 : 96;
    const totalFrames = GM.rightCols * GM.rightRows;
    winnerFrameRef.current = 0;

    const id = setInterval(() => {
      const f = winnerFrameRef.current;
      const col = f % GM.rightCols;
      const row = Math.floor(f / GM.rightCols);
      const gmPos = `${-(col * dispSz)}px ${-(row * dispSz)}px`;
      const bCol = f % BL.rightCols;
      const bRow = Math.floor(f / BL.rightCols);
      const blPos = `${-(bCol * dispSz)}px ${-(bRow * dispSz)}px`;

      // Animate Granmaja sprite (ref1) on draw or granmaja win
      if (winner === -1 || winner === 0) {
        const el = winnerSpriteRef.current;
        if (el) el.style.backgroundPosition = gmPos;
      }
      // Animate Bloop sprite (ref2) on draw or bloop win
      if (winner === -1 || winner === 1) {
        const el2 = winnerSprite2Ref.current;
        if (el2) el2.style.backgroundPosition = blPos;
      }

      winnerFrameRef.current = (f + 1) % totalFrames;
    }, ANIM_MS);

    return () => clearInterval(id);
  }, [winner]);

  const posStyle = pos.x === -1 ? { bottom: 16, left: 16 } : { left: pos.x, top: pos.y };
  const teamLabel = (t: number) => t === 0 ? "GRANMAJA" : "BLOOP";

  return (
    <div ref={rootRef} className="fixed z-50 select-none" style={{
      ...posStyle, width: collapsed ? 200 : TV_W + 24,
      fontFamily: "var(--font-geist-mono), monospace", transition: "width 0.3s ease",
    }}>
      <div style={{
        background: "linear-gradient(145deg, #1a1a2e, #0f0f1a)", borderRadius: 16, padding: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(168,85,247,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2 px-1 cursor-grab active:cursor-grabbing"
          onMouseDown={onDragStart} onTouchStart={onDragStart}>
          <div className="flex items-center gap-2">
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: loaded ? "#00E676" : "#ff3333", boxShadow: loaded ? "0 0 6px #00E676" : "0 0 4px #ff3333" }} />
            <span className="text-[10px] font-bold tracking-wider" style={{ color: "rgba(168,85,247,0.7)" }}>GRANLOOP ARENA</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: "#FFD700" }}>{"💥 " + clashCount}</span>
            <button onClick={(e) => { e.stopPropagation(); const nv = !collapsed; collapsedR.current = nv; setCollapsed(nv); }}
              style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4, border: "1px solid rgba(168,85,247,0.2)", background: "rgba(168,85,247,0.05)", color: "rgba(168,85,247,0.6)", fontSize: 10, cursor: "pointer", lineHeight: 1 }}>
              {collapsed ? "▸" : "▾"}
            </button>
          </div>
        </div>

        <div style={{ display: collapsed ? "none" : "block" }}>
          {/* Individual HP Bars — 4 bars in 2x2 grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 6 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[7px] font-bold" style={{ color: TC[i] }}>{NAMES[i]}</span>
                  <span ref={(el) => { hpTxtR.current[i] = el; }} className="text-[7px] font-bold" style={{ color: TC[i] }}>
                    {MAX_HP.toLocaleString()}
                  </span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div ref={(el) => { hpBarR.current[i] = el; }}
                    style={{ height: "100%", width: "100%", borderRadius: 3, background: TC[i], transition: "width 0.3s ease, background 0.3s ease" }} />
                </div>
              </div>
            ))}
          </div>

          {/* Screen */}
          <div style={{ borderRadius: 8, overflow: "hidden", border: "2px solid rgba(168,85,247,0.15)", boxShadow: "inset 0 0 20px rgba(0,0,0,0.5)" }}>
            <div style={{ width: TV_W, height: TV_H, background: "linear-gradient(180deg, #061a2e 0%, #0a2844 40%, #0d3256 100%)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
                backgroundImage: "radial-gradient(ellipse 80px 40px at 20% 15%, rgba(168,85,247,0.05) 0%, transparent 100%), radial-gradient(ellipse 60px 30px at 60% 10%, rgba(168,85,247,0.04) 0%, transparent 100%)",
                animation: "caustics 6s ease-in-out infinite alternate" }} />
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 30, zIndex: 2, pointerEvents: "none" }}>
                <svg width="100%" height="12" style={{ position: "absolute", top: 0 }}>
                  <path d="M0,6 Q40,0 80,6 T160,6 T240,6 T320,6 T400,6 V12 H0 Z" fill="rgba(168,85,247,0.06)" style={{ animation: "wave-top 3s ease-in-out infinite" }} />
                </svg>
              </div>
              <div style={{ position: "absolute", inset: 0, zIndex: 10, pointerEvents: "none",
                background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)" }} />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`b${i}`} style={{ position: "absolute", left: `${12 + i * 14}%`, bottom: `${5 + (i % 3) * 10}%`,
                  width: 3 + (i % 3) * 2, height: 3 + (i % 3) * 2, borderRadius: "50%",
                  background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.1)",
                  animation: `ambient-bubble ${3 + i * 0.8}s ease-in-out infinite`, animationDelay: `${i * 0.9}s`,
                  pointerEvents: "none", zIndex: 5 }} />
              ))}

              {/* 4 Characters */}
              {[0, 1, 2, 3].map((i) => (
                <div key={i} ref={(el) => { wrapR.current[i] = el; }}
                  style={{ position: "absolute", width: SZ, height: SZ, zIndex: 8, transition: "opacity 0.5s" }}>
                  <div style={{ position: "absolute", inset: -4, borderRadius: "50%",
                    background: `radial-gradient(ellipse, ${TC[i]}18, transparent 70%)`, pointerEvents: "none" }} />
                  <div ref={(el) => { sprR.current[i] = el; }}
                    style={{ position: "absolute", inset: 0,
                      backgroundImage: `url(${CFGS[i].down})`, backgroundSize: bgSz("down", CFGS[i]),
                      backgroundPosition: "0px 0px", backgroundRepeat: "no-repeat", imageRendering: "pixelated" }} />
                  <div ref={(el) => { dmgR.current[i] = el; }}
                    style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                      fontSize: 9, fontWeight: 900, color: "#ff4444", textShadow: "0 0 4px rgba(255,0,0,0.6)",
                      opacity: 0, transition: "opacity 0.5s, transform 0.5s", pointerEvents: "none", whiteSpace: "nowrap" }} />
                  {/* Per-char clash FX */}
                  <div ref={(el) => { clashFxR.current[i] = el; }}
                    style={{ position: "absolute", width: 40, height: 40, zIndex: 20, pointerEvents: "none", display: "none" }}>
                    <div style={{ width: "100%", height: "100%", borderRadius: "50%",
                      background: "radial-gradient(circle, rgba(255,255,100,0.9), rgba(255,150,50,0.5), transparent 70%)",
                      animation: "clash-burst 0.3s ease-out forwards" }} />
                  </div>
                </div>
              ))}

              {/* KO Overlay with winner sprite */}
              {winner !== null && (() => {
                const wCfg = winner === 1 ? BL : GM;
                const wColor = winner === 1 ? "#A855F7" : "#FF8C42";
                const wName = teamLabel(winner);
                const spriteSrc = wCfg.right;
                const dispSz = winner === -1 ? 72 : 96;
                return (
                  <div style={{ position: "absolute", inset: 0, zIndex: 30, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(3px)" }}>
                    {/* Sprite(s) — JS-driven smooth frame cycling */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {/* Granmaja sprite (shown on granmaja win or draw) */}
                      {(winner === -1 || winner === 0) && (
                        <div ref={winnerSpriteRef} style={{
                          width: dispSz, height: dispSz, imageRendering: "pixelated",
                          backgroundImage: `url(${GM.right})`,
                          backgroundSize: `${dispSz * GM.rightCols}px ${dispSz * GM.rightRows}px`,
                          backgroundPosition: "0px 0px",
                          backgroundRepeat: "no-repeat",
                          animation: "winner-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, winner-drift 0.6s ease-in-out 0.6s infinite alternate",
                          filter: `drop-shadow(0 0 15px #FF8C42) drop-shadow(0 0 30px #FF8C4244)`,
                        }} />
                      )}
                      {/* Bloop sprite (shown on bloop win or draw) */}
                      {(winner === -1 || winner === 1) && (
                        <div ref={winnerSprite2Ref} style={{
                          width: dispSz, height: dispSz, imageRendering: "pixelated",
                          backgroundImage: `url(${BL.right})`,
                          backgroundSize: `${dispSz * BL.rightCols}px ${dispSz * BL.rightRows}px`,
                          backgroundPosition: "0px 0px",
                          backgroundRepeat: "no-repeat",
                          animation: "winner-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s forwards, winner-drift 0.6s ease-in-out 0.6s infinite alternate",
                          opacity: 0,
                          filter: `drop-shadow(0 0 15px #A855F7) drop-shadow(0 0 30px #A855F744)`,
                        }} />
                      )}
                    </div>
                    {/* Sparkles around winner */}
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} style={{
                        position: "absolute",
                        width: 4, height: 4, borderRadius: "50%",
                        background: i % 3 === 0 ? "#FF8C42" : i % 3 === 1 ? "#A855F7" : "#FFD700",
                        boxShadow: `0 0 6px ${i % 3 === 0 ? "#FF8C42" : i % 3 === 1 ? "#A855F7" : "#FFD700"}`,
                        animation: `winner-sparkle ${1 + i * 0.2}s ease-in-out infinite`,
                        animationDelay: `${i * 0.15}s`,
                        left: "50%", top: "50%",
                        transform: `rotate(${i * 45}deg) translateX(${50 + (i % 3) * 15}px)`,
                      }} />
                    ))}
                    <div style={{
                      fontSize: 22, fontWeight: 900, color: "#FFD700",
                      textShadow: "0 0 20px rgba(255,215,0,0.6), 0 2px 8px rgba(0,0,0,0.8)",
                      letterSpacing: 3, marginTop: 8,
                      animation: "ko-pulse 0.8s ease-in-out infinite alternate",
                    }}>K.O.!</div>
                    <div style={{
                      fontSize: 14, fontWeight: 700, color: winner === -1 ? "#FFD700" : wColor,
                      textShadow: `0 0 10px ${winner === -1 ? "#FFD70066" : wColor + "66"}`, marginTop: 2,
                      animation: "winner-text 0.5s ease-out 0.3s both",
                    }}>
                      {winner === -1 ? "DRAW!" : `${wName} WINS!`}
                    </div>
                    <button onClick={rematch} style={{
                      marginTop: 12, padding: "5px 20px", borderRadius: 6,
                      border: winner === -1 ? "1px solid #FFD70044" : `1px solid ${wColor}44`,
                      background: winner === -1 ? "#FFD70015" : `${wColor}15`,
                      color: "#FFD700", fontSize: 10, fontWeight: 700, letterSpacing: 1,
                      cursor: "pointer", animation: "winner-text 0.5s ease-out 0.6s both",
                    }}>REMATCH</button>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="flex items-center justify-center gap-1 mt-2">
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} style={{ width: 2, height: 8, borderRadius: 1, background: "rgba(168,85,247,0.08)" }} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes clash-burst { 0% { transform: scale(0.3); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes caustics { 0% { transform: translateX(-10px) translateY(3px); } 100% { transform: translateX(10px) translateY(-3px); } }
        @keyframes wave-top { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-8px); } }
        @keyframes ambient-bubble { 0% { transform: translateY(0); opacity: 0.5; } 50% { transform: translateY(-50%) translateX(3px); opacity: 0.3; } 100% { transform: translateY(-100%) translateX(-2px); opacity: 0; } }
        @keyframes ko-pulse { 0% { transform: scale(1); } 100% { transform: scale(1.08); } }
        @keyframes winner-pop { 0% { transform: scale(0) rotate(-20deg); opacity: 0; } 60% { transform: scale(1.2) rotate(5deg); } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
        @keyframes winner-sparkle { 0%, 100% { opacity: 0; transform: var(--base-transform, rotate(0deg) translateX(50px)) scale(0.5); } 50% { opacity: 1; transform: var(--base-transform, rotate(0deg) translateX(60px)) scale(1.2); } }
        @keyframes winner-text { 0% { transform: translateY(10px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes winner-drift { 0% { translate: -10px 0; } 100% { translate: 10px 0; } }
      `}</style>
    </div>
  );
}
