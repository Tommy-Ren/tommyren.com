# 🌐 WebGPU Cyber-Sphere Portfolio

An ultra-modern, interactive 3D personal portfolio built with Three.js and React Three Fiber. The experience takes place on a continuously rotating, cyberpunk-styled **spherical world** — a neon snake crawls across the globe, collecting food and colliding with portfolio section blocks to navigate.

## 🎨 Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Background / Void | Deep Void Black | `#050505` |
| Primary (Snake) | Neon Fluorescent Cyan | `#00F0FF` |
| Highlight (Nav Blocks) | Neon Pink | `#FF0055` |
| Food / Secondary | Lime Green | `#ADFF00` |

## 🎮 Controls

- **A / ← Arrow** — Steer left
- **D / → Arrow** — Steer right
- The snake moves forward continuously — you can only steer, not stop
- **Autopilot** engages automatically after 3 seconds of no input (A* pathfinding to nearest food)
- **Manual override** — any key press instantly disables autopilot

## 🌍 Spherical World

The game takes place on a 3D sphere. Moving in any direction will eventually loop back to the starting point. Portfolio section blocks and food items are scattered across the globe surface using spherical coordinates.

## 💥 Collision Mechanics

When the snake hits a portfolio block:
1. Forward motion halts
2. 0.5-second visual feedback (glitch effect, screen shake, rapid flashing)
3. Page transitions to the corresponding section

## 🧠 A* Pathfinding

When autopilot is active, the snake uses A* pathfinding mapped over a discretized spherical grid to navigate toward the nearest food item, avoiding nav blocks.

## 🛠 Tech Stack

- **React 18** + React Router
- **Three.js** (r172) + React Three Fiber (R3F)
- **@react-three/postprocessing** — Bloom + Glitch passes
- **Zustand** — State management
- **Vite 5** — Build tooling
- Spherical coordinate math (Three.js `Spherical` / custom utils)

## 📁 Project Structure

```
src/
├── main.jsx              # Entry point with BrowserRouter
├── App.jsx               # React Router routes
├── index.css             # Cyberpunk CSS (scanlines, glitch, HUD)
├── store/
│   └── gameStore.js      # Zustand store (game state, autopilot, collision)
├── utils/
│   └── sphereMath.js     # Spherical math, A* pathfinding, movement
├── components/
│   ├── GameScene.jsx     # Core 3D scene (globe, snake, food, nav blocks)
│   └── HUD.jsx           # Overlay UI (score, autopilot indicator, instructions)
└── pages/
    ├── HomePage.jsx      # R3F Canvas with post-processing
    ├── ResumePage.jsx
    ├── BackgroundPage.jsx
    ├── PortfolioPage.jsx
    ├── ProjectsPage.jsx
    └── CVPage.jsx
```

## � Getting Started

```bash
npm install
npm run dev
```

## 📦 Build

```bash
npm run build
npm run preview
```

