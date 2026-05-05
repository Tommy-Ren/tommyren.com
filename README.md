# Cyber-Sphere Portfolio

Interactive 3D portfolio/game built with React, Vite, Three.js, React Three Fiber, and Zustand. The app starts with a loading screen, drops the player onto a spherical world, and blends portfolio navigation with a snake-inspired arcade loop. After enough evolution, the experience expands from surface traversal into open-space flight and planetary landing.

## What Changed in the Current Build

- The experience is no longer surface-only; it now has both planet-surface and outer-space gameplay.
- Snake progression now includes size evolution, score multipliers, and a late-game space unlock.
- A loading screen lets the player choose between full and low-spec rendering profiles before assets finish preloading.
- Background music and button click sound effects are now wired into the app.
- Mobile controls now include swipe steering, pinch zoom, double-tap launch, and space-mode boosting.
- Overlay panels remain the active portfolio content system; legacy route pages still exist in the repository but are not mounted.

## Core Experience

1. Choose **Full Experience** or **Low-spec Version** on the loading screen.
2. Start on Earth in a spherical snake game with food collection and optional autopilot.
3. Grow longer, score points, and evolve into larger forms.
4. Unlock space travel at evolution level 3.
5. Launch off the planet, fly manually through space, collect floating food, and land on other planets.
6. Open portfolio content either from the top navigation or by colliding with glowing nav blocks on the planet surface.

## Features

### Gameplay

- Spherical snake movement on a planet-sized sphere (`radius = 40`) using custom tangent-plane and parallel-transport math.
- Two locomotion modes:
  - surface mode
  - space mode
- Dynamic speed profile that scales with snake size (`vMin`, `vBase`, `vMax`).
- Self-collision reset behavior in both modes.
- Food collection with weighted size variants:
  - small = 1 base point
  - medium = 5 base points
  - large = 10 base points
- Continuous food spawning with separate tuning for standard and low-spec rendering.

### Progression and Evolution

- Score increases through collected food and is multiplied by the current evolution level.
- Length growth is gated by score thresholds instead of a flat one-segment reward per pickup.
- When enough body segments are earned, the snake evolves:
  - size increases sharply
  - segment count compacts back down
  - future growth becomes more expensive
  - score multiplier increases
- Space travel unlocks at evolution level 3.

### Autopilot and Pathfinding

- Surface autopilot starts enabled by default.
- Manual input disables autopilot; it returns after 3 seconds of inactivity.
- Target selection prefers efficient food while avoiding:
  - nav blocks
  - the snake body
  - expensive U-turns
- A* pathfinding runs on a spherical grid with obstacle clearance.
- Extra emergency steering, lookahead probes, and stuck-target cooldowns help the snake recover from difficult paths.
- Autopilot is surface-only; space travel is manual.

### Space Mode

- Launch from the current planet with `Space` once unlocked.
- Free-flight steering uses snake-relative axes instead of camera-relative turning.
- Boosting increases speed in space.
- Space contains:
  - floating collectible food
  - procedural gameplay planets that can be landed on
  - a separate chase camera
- Landing on a planet returns the snake to surface mode using that planet's texture.

### Portfolio and UI

- Fixed top navigation with:
  - Home
  - About Me
  - Projects
  - Resume
  - Contact
- Mobile navigation drawer.
- Overlay panels are still the primary content system; sections do not use route transitions.
- Planet-surface nav blocks open overlays after collision feedback and reset the run.
- HUD shows:
  - speed gauge
  - contextual control instructions
  - launch prompt when space travel is unlocked
  - collision banner
- Top nav shows live score and autopilot status.
- Mouse wheel zoom and touch pinch zoom are supported.

### Audio and Presentation

- Loading screen with texture preload progress.
- Player-selectable render profile:
  - Full Experience
  - Low-spec Version
- Bloom and glitch post-processing in standard mode.
- Shuffled background music playlist from `public/music`.
- Button click sound effects from `public/sounds`.
- Vercel Analytics is included.

### Visual Worldbuilding

- Full mode renders:
  - starfield backdrop
  - distant procedural planet field
  - gameplay planets during space travel
- Earth has a special first-planet presentation with emissive night lighting.
- Low-spec mode reduces render cost through lower DPR, simpler textures, disabled post-processing, and smaller gameplay windows.

## Controls

### Keyboard

#### Surface Mode

- `A/D` or `←/→`: steer
- `W/S` or `↑/↓`: accelerate / brake
- `Space`: launch into space after unlock

#### Space Mode

- `A/D` or `←/→`: yaw left / right
- `W/S` or `↑/↓`: pitch up / down
- Hold `Space`: boost

### Touch and Mobile

- One-finger horizontal swipe: steer on the planet
- Two-finger pinch: zoom
- Double-tap on the planet: launch after unlock
- One-finger drag in space: steer flight
- Double-tap in space: boost while touching

### Debug Shortcut

- `` ` `` instantly unlocks the minimum evolution level needed for space travel.

## Project Structure

```text
src/
  App.jsx                    # Loading flow, render mode selection, texture preloading, analytics
  main.jsx                   # React entrypoint
  index.css                  # Global styles for loading UI, HUD, nav, overlays, and responsive layout
  components/
    GameScene.jsx            # Core gameplay loop, snake logic, autopilot, collisions, space mode, cameras
    HUD.jsx                  # Speed gauge, collision banner, launch instructions
    LoadingScreen.jsx        # Startup loader with low-spec/full-experience selection
    MusicToggle.jsx          # BGM shuffle, mute toggle, click SFX
    OverlayPanel.jsx         # About/Projects/Resume/Contact content overlays
    TopNav.jsx               # Desktop nav, mobile drawer, score/autopilot indicators
  store/
    gameStore.js             # Zustand game state, progression, evolution, locomotion mode, overlays
  utils/
    sphereMath.js            # Sphere math helpers, headings, great-circle motion, A* pathfinding
  pages/
    HomePage.jsx             # Active page containing the canvas and UI shell
    *.jsx                    # Legacy route-style pages that currently are not mounted
public/
  music/*.mp3                # Background music tracks used by MusicToggle
  sounds/*.mp3               # Button click sound effects
```

## Tech Stack

- React 18
- Vite 5
- Three.js
- @react-three/fiber
- @react-three/drei
- @react-three/postprocessing
- postprocessing
- Zustand
- @vercel/analytics

## Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Notes

- `react-router-dom` is installed, but the current app flow does not use route navigation in `src/App.jsx`.
- Portfolio overlay copy in `src/components/OverlayPanel.jsx` is still largely placeholder/demo content and should be replaced with final personal content.
- This README reflects the live codebase rather than the earlier surface-only implementation.
