# Cyber-Sphere Portfolio

Interactive 3D portfolio built with React, Vite, Three.js, and React Three Fiber.
The main experience is a snake-style game wrapped around a sphere, with portfolio
content shown in overlays that can be opened either by collision in the scene or
from the top navigation.

## Current Project State

- Single app repository (Vite + React, not a monorepo).
- `src/App.jsx` currently renders only `HomePage`.
- Portfolio sections are overlay panels, not route transitions.
- Legacy route page components still exist in `src/pages`, but are not mounted.

## Features

- 3D spherical world (`radius = 40`) with custom spherical movement math.
- Snake movement with:
  - Steering: `A/D` or `Left/Right`
  - Throttle: `W/S` or `Up/Down`
  - Dynamic speed model (`vMin`, `vBase`, `vMax`) with accel/brake/friction curves
- Food collection:
  - Score increases by 10
  - Snake grows by 1 segment
  - Food respawns away from nav blocks and current head position
- Autopilot:
  - Enabled by default
  - Re-enables after 3 seconds of inactivity
  - Uses A* over a spherical grid with obstacle expansion around nav blocks
- Collision behavior:
  - Hitting a nav block triggers glitch feedback
  - Game state resets
  - Corresponding overlay opens (`about`, `projects`, `resume`, `contact`)
- HUD and UI:
  - Score display
  - Autopilot/manual indicator
  - Live speed gauge
  - Fixed top navigation with direct overlay access
  - Mouse wheel camera zoom

## Tech Stack

- React 18
- Vite 5
- Three.js + @react-three/fiber
- @react-three/postprocessing + postprocessing
- Zustand

## File Map

```text
src/
  App.jsx                    # Renders HomePage
  main.jsx                   # React entrypoint
  index.css                  # Global theme + HUD/nav/overlay styles
  components/
    GameScene.jsx            # Core game loop, snake, camera, collisions
    HUD.jsx                  # Score/autopilot/speed UI
    TopNav.jsx               # Accessible top nav for overlays
    OverlayPanel.jsx         # About/Projects/Resume/Contact content panel
  store/
    gameStore.js             # Zustand state and actions
  utils/
    sphereMath.js            # Spherical math + A* helpers
  pages/
    HomePage.jsx             # Main canvas page (active)
    *.jsx                    # Legacy route-style pages (currently unused)
public/
  music/*.mp3                # Audio assets (currently not wired in code)
  sounds/*.mp3               # Audio assets (currently not wired in code)
```

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Notes

- The historical wording "WebGPU" appears in docs, but this implementation runs on
  Three.js/WebGL through React Three Fiber.
- `react-router-dom` is installed, and legacy route pages exist, but routing is not
  currently used by `App.jsx`.

