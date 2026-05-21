# Cyber-Sphere Portfolio

Interactive 3D portfolio built with React, Vite, Three.js, React Three Fiber, Zustand, and Vercel Analytics. It combines a playable spherical snake game with cinematic section travel so visitors can move between Home, About Me, Projects, Resume, and Contact inside one continuous world.

## Current Features

- Loading screen with **Full Experience** and **Low-spec Version** modes.
- Persistent top navigation plus a mobile drawer for quick section switching.
- Cinematic section travel with pullback, warp, arrival, orbit, and focus states.
- Playable Home hub with spherical movement, food collection, score, growth, evolution, autopilot, and space launch.
- Space mode unlocks at evolution level 3 and supports free flight, zoom, planet landings, and floating food.
- Four in-world portfolio destinations:
  - About Me — Memory Orbit
  - Projects — Project Dockyard
  - Resume — Archive Monolith
  - Contact — Signal Beacon
- Project Dockyard includes live project cards, template nodes, keyboard/touch navigation, and external links.
- Resume section includes a downloadable snapshot.
- Contact section exposes website, GitHub, and other contact channels.
- Background music toggle, HUD, collision glitch effect, touch gestures, and reduced-motion support.

## Controls

### Surface

- `A/D` or `←/→`: steer
- `W/S` or `↑/↓`: accelerate / brake
- `Space`: launch into space after unlock

### Space

- `A/D` or `←/→`: steer left / right
- `W/S` or `↑/↓`: steer up / down and control speed
- Hold `Space`: boost

### Navigation

- Top nav: jump between destinations
- Mouse wheel / pinch: zoom
- One-finger swipe: steer on the planet
- One-finger drag: steer in space

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

## Tech Stack

- React 18
- Vite 5
- Three.js
- @react-three/fiber
- @react-three/drei
- @react-three/postprocessing
- Zustand
- @vercel/analytics

## Notes

- The active app shell is mounted from `src/App.jsx` and `src/pages/HomePage.jsx`.
- Legacy route-style pages remain in `src/pages/`, but they are not part of the live experience.
