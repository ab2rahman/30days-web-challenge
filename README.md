# 30 Days Web Challenge

**Live demo:** [abduarrahman.com/30days-web-challenge](https://abduarrahman.com/30days-web-challenge/)

Community-built website. 30 days. 30 features. Strangers decide what gets built. Open source.

## How It Works

1. Comment a feature idea on the reel
2. Most liked comment wins
3. The feature gets built and goes live
4. Repeat for 30 days

## Rules

- Must be **safe and legal**
- Must be **tech-related** (features, tools, pages)
- Must be **possible** to build
- I have **final say** if something breaks the rules

## Tech Stack

- **Framework:** Next.js 16 (App Router, Static Export)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Animations:** Framer Motion, GSAP
- **Audio:** Web Audio API (synthesized sounds)
- **Video:** HTML5 Video with autoplay handling
- **Package Manager:** Bun

## Getting Started

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
bun run build   # Production static export
```

## Day 1 — Magikarp Countdown Challenge

The first community challenge: a countdown timer game with dice rolling mechanics.

**Gameplay:**
- Catch a swimming Magikarp on the landing page to start
- Roll 4 dice to generate a 4-digit target number (1.000–9.999 seconds)
- Start a count-up timer and click to stop at the exact target
- Match decreases the 30-second countdown, miss increases it
- Reach 0.000 to reveal a Shiny Magikarp card
- **Easter egg:** Hit within ±100ms of the target to trigger a glitch crash and unlock the legendary Gyarados

**Features:**
- Animated dice with flying physics, tumbling, and landing sounds
- Real-time countdown ticker with requestAnimationFrame
- Beat-pulse count-up timer (visual + audio tick each second)
- Mythical card popup with holographic shimmer, vortex background, and sparkle particles
- Glitch phase with CRT scan lines, color channel split, screen shake, and synthesized digital sounds
- Dual victory themes: golden mystical (Magikarp) vs cyan/red glitch (Gyarados)

**Assets:** `public/day1/` — magikarp.png, shiny-magicarp.mp4, gyarados.mp4, comment.jpeg

## Links

- Website: [abduarrahman.com](https://abduarrahman.com)
- YouTube: [@abduarrahmanscode](https://www.youtube.com/@abduarrahmanscode)
- GitHub: [ab2rahman](https://github.com/ab2rahman)
- GitHub Repo: [30days-web-challenge](https://github.com/ab2rahman/30days-web-challenge)

---

*Day 1 built. Comment your next idea.*
