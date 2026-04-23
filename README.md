# 🐍 Cyber-Snake Portfolio

A gamified personal portfolio website with a **Cyberpunk 2077** aesthetic. The homepage features a 3D Snake game built with Three.js where navigation is driven by both game mechanics and traditional UI interaction.

## 🎮 Features

- **3D Snake Game** — A glowing snake crawls in a serpentine pattern across a neon grid
- **Dual Navigation** — Steer the snake into section blocks OR click them directly
- **Auto-Crawl Toggle** — Switch between game mode and static browsing mode
- **Scoreboard** — Eat food to grow the snake and rack up points
- **Cyberpunk HUD** — Scanlines, bloom glow, glitch animations, and neon colors
- **5 Section Pages** — Resume, Background, Portfolio, Projects, CV

## 🎨 Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Background | Deep Void Black | `#050505` |
| Primary | Neon Fluorescent Cyan | `#00F0FF` |
| Secondary A | Lime Green (food/success) | `#ADFF00` |
| Secondary B | Neon Pink (nav blocks/hover) | `#FF0055` |

## 🛠 Tech Stack

- **React 18** + Vite
- **Three.js** via React Three Fiber (R3F)
- **@react-three/drei** — Helpers and abstractions
- **@react-three/postprocessing** — Bloom effect
- **Zustand** — Lightweight state management
- **React Router v6** — Client-side routing

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🕹 Controls

| Key | Action |
|-----|--------|
| `W` / `↑` | Move snake up |
| `S` / `↓` | Move snake down |
| `A` / `←` | Move snake left |
| `D` / `→` | Move snake right |
| Toggle Switch | Enable/disable auto-crawl |
| Click Block | Navigate to section page |

## 📁 Project Structure

```
src/
├── main.jsx                  # App entry point
├── App.jsx                   # React Router setup
├── index.css                 # Cyberpunk global styles
├── store/
│   └── gameStore.js          # Zustand game state
├── components/
│   ├── GameScene.jsx         # 3D snake, food, nav blocks, grid
│   └── HUD.jsx               # Scoreboard, toggle, instructions
└── pages/
    ├── HomePage.jsx           # R3F Canvas + post-processing
    ├── ResumePage.jsx
    ├── BackgroundPage.jsx
    ├── PortfolioPage.jsx
    ├── ProjectsPage.jsx
    └── CVPage.jsx
```

## 📝 License

MIT
