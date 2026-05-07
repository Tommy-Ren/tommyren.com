# Cyber-Sphere Portfolio

Interactive 3D portfolio/game built with React, Vite, Three.js, React Three Fiber, and Zustand. The current build combines a playable snake-inspired home planet, late-game space flight, and a camera-driven portfolio navigation system that jumps to dedicated cosmic destinations for About, Projects, Resume, and Contact.

## Current Build Summary

- The app starts with a loading screen and lets the user choose between **Full Experience** and **Low-spec Version** before the main scene loads.
- **Home** remains the playable hub: a spherical snake game with food collection, score, evolution, zoom, and surface autopilot.
- At evolution level 3, the player can launch into **space mode**, collect floating food, and land on other planets.
- The portfolio no longer relies on mounted route pages or the old overlay-first flow in the active UI shell.
- The top nav now acts as a **cosmic destination selector**:
  - Home
  - About Me
  - Projects
  - Resume
  - Contact
- Clicking a section in the nav freezes gameplay and starts a **cinematic camera transition** that travels to a dedicated 3D destination.
- Each portfolio section is represented as an in-world scene with its own anchor point, orbit camera, and focus targets.

## Core Experience

1. Choose **Full Experience** or **Low-spec Version** on the loading screen.
2. Start on Earth in a spherical snake game with food collection, zoom, and optional surface autopilot.
3. Grow longer, score points, and evolve into larger forms.
4. Unlock space travel at evolution level 3.
5. Launch into space, fly manually, collect floating food, and land on other planets.
6. Use the top navigation to jump into cinematic portfolio travel for:
   - About Me
   - Projects
   - Resume
   - Contact
7. Return to **Home** to resume the active run without resetting progress.

## Features

### Cinematic Portfolio Navigation

- Fixed top navigation remains visible and recruiter-friendly.
- Nav clicks no longer depend on colliding with page portals on the Earth surface.
- Section travel is driven by an explicit universe-navigation state model:
  - `currentSection`
  - `targetSection`
  - `gameplayState`
  - `cameraMode`
  - `transitionPhase`
- Section travel uses a multi-phase camera flow:
  - cinematic pullback
  - warp travel
  - arrival
  - orbit / focus viewing
- Section switching preserves the active game run and returns Home without resetting score, length, or evolution.

### In-World Portfolio Sections

The portfolio is organized as four dedicated destinations:

- **About Me — Memory Orbit**
  - identity core
  - orbiting memory nodes
  - in-world biography text
- **Projects — Project Dockyard**
  - project modules
  - project selection nodes
  - in-world action links
- **Resume — Archive Monolith**
  - layered archive nodes
  - resume summary copy
  - download node
- **Contact — Signal Beacon**
  - contact channel nodes
  - in-world link actions

These scenes are rendered through dedicated section components rather than mounted route pages.

### Home Gameplay

- Spherical snake movement on a planet-sized sphere (`radius = 40`) using custom tangent-plane and parallel-transport math.
- Surface gameplay remains active only while `currentSection === 'home'` and `gameplayState === 'playing'`.
- Mouse-wheel and touch-pinch zoom are supported on the home planet.
- Food spawns directly on the sphere using custom avoidance rules.
- Score, length, snake scale, and evolution are preserved while moving in and out of section travel.

### Progression and Evolution

- Weighted surface and space food rewards.
- Score increases through collected food and scales with evolution.
- Growth is gated through score accumulation and segment thresholds.
- Evolution increases snake size and adjusts movement profile.
- Space travel unlocks at **evolution level 3**.

### Autopilot and Pathfinding

- Surface autopilot exists in the active codebase and resumes after inactivity.
- Manual input disables autopilot and updates `lastInputTime`.
- Surface movement/pathing relies on custom spherical math and A* routing utilities in `src/utils/sphereMath.js`.
- Navigation-to-section no longer depends on physical section obstacles placed on Earth.

### Space Mode

- Launch from the current planet with `Space` after unlock.
- Space mode supports manual free-flight steering and zoom.
- Floating food spawns in open space.
- Landing on a planet returns the experience to surface mode using that planet's texture.
- Space flight keeps the same score/evolution loop active instead of switching to a separate mode outside the main run.

### State and Camera Systems

- Zustand store now manages both game state and cinematic section navigation.
- The active app uses these major camera modes:
  - `followSnake`
  - `cinematicPullback`
  - `warpTravel`
  - `sectionArrival`
  - `sectionOrbit`
  - `sectionFocus`
- Section transitions are configured in `src/data/sectionTransitions.js`.
- Section destinations and content metadata are defined in `src/data/contentZones.js`.

### Audio and Presentation

- Loading screen with preload progress.
- Standard and low-spec render profiles.
- Bloom and glitch post-processing in standard mode.
- Background music toggle.
- Vercel Analytics is included.
- Reduced-motion preference is detected and wired into the live scene state.

## Controls

### Keyboard

#### Surface Mode

- `A/D` or `←/→`: steer
- `W/S` or `↑/↓`: accelerate / brake
- `Space`: launch into space after unlock

#### Space Mode

- `A/D` or `←/→`: steer left / right
- `W/S` or `↑/↓`: steer up / down and control speed

### Mouse / Touch

- Mouse wheel: zoom
- Two-finger pinch: zoom
- One-finger horizontal swipe on the planet: steer
- One-finger drag in space: steer flight

### Section Interaction

- Use the top nav to jump directly to a portfolio destination.
- In section orbit view, click nodes or modules to enter a closer focus view.
- Use **Home** in the top nav to return to the playable hub.

## Project Structure

```text
src/
  App.jsx                          # Loading flow, render mode selection, texture preloading, analytics
  main.jsx                         # React entrypoint
  index.css                        # Global styles for loading UI, HUD, nav, and section presentation
  data/
    contentZones.js                # Section metadata, anchors, content payloads, nav items
    sectionTransitions.js          # Transition timing/intensity between sections
  components/
    GameScene.jsx                  # Main runtime orchestrator for gameplay, transitions, sections, and cameras
    HUD.jsx                        # Speed gauge and contextual control text for Home gameplay
    LoadingScreen.jsx              # Startup loader with low-spec/full-experience selection
    MusicToggle.jsx                # Music toggle UI
    TopNav.jsx                     # Persistent desktop/mobile navigation and section status
    OverlayPanel.jsx               # Legacy overlay component kept in the repo, not part of the active shell
    content/
      FocusPanel.jsx               # Legacy content component kept in the repo, not mounted in HomePage
    scene/
      CameraRig.jsx                # Camera-mode controller for gameplay and section travel
      TransitionEffects.jsx        # Warp / pullback / arrival visual treatment
      HomeWorldPrimitives.jsx      # Shared scene primitives, textures, stars, planets, snake meshes, helpers
    sections/
      AboutDestination.jsx         # Memory Orbit scene
      ProjectsDestination.jsx      # Project Dockyard scene
      ResumeDestination.jsx        # Archive Monolith scene
      ContactDestination.jsx       # Signal Beacon scene
  pages/
    HomePage.jsx                   # Active page containing the canvas and mounted UI shell
    BackgroundPage.jsx             # Legacy route-style page
    ContactPage.jsx                # Legacy route-style page
    CVPage.jsx                     # Legacy route-style page
    PortfolioPage.jsx              # Legacy route-style page
    ProjectsPage.jsx               # Legacy route-style page
    ResumePage.jsx                 # Legacy route-style page
  store/
    gameStore.js                   # Zustand game state + cinematic section/navigation state
  utils/
    sphereMath.js                  # Sphere math helpers, headings, movement, great-circle distance, A*
public/
  music/*.mp3                      # Background music tracks
  sounds/*.mp3                     # UI / click sound effects
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

- `react-router-dom` is installed, but the active app shell is a single mounted scene driven by `App.jsx` and `HomePage.jsx`.
- The repository still contains legacy route-style pages and older overlay components, but the live experience is centered on the cinematic section-navigation build.
- This README reflects the current codebase and mounted runtime rather than the earlier overlay-first implementation.
