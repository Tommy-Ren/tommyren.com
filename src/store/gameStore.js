import { create } from 'zustand'

const SPHERE_RADIUS = 40
const GRID_DIVISIONS = 40
const IDLE_TIMEOUT = 3000
const COLLISION_DURATION = 500

// Speed constants — V_BASE is 25% of V_MAX
const V_BASE = 6.75  // default cruising speed (arc-distance/s)
const V_MAX = 27.0   // top speed when accelerating (3x base)
const V_MIN = 3.0    // minimum crawl speed when braking

const useGameStore = create((set, get) => ({
  // Core game state
  score: 0,
  autopilot: true,
  colliding: false,
  collidingBlock: null,
  gameRunning: true,

  // Overlay navigation (null = game view, string = overlay name)
  activeOverlay: null,
  setActiveOverlay: (overlay) => set({ activeOverlay: overlay }),

  // Snake state (spherical coords: theta = polar angle, phi = azimuthal)
  snakeHead: { theta: Math.PI / 2, phi: 0 },
  snakeHeading: 0,
  snakeSegments: [],
  segmentCount: 3,

  // Speed state
  currentSpeed: V_BASE,
  vBase: V_BASE,
  vMax: V_MAX,
  vMin: V_MIN,

  // Food
  food: { theta: Math.PI / 3, phi: Math.PI / 4 },

  // Autopilot / idle tracking
  lastInputTime: 0,
  aStarPath: [],

  // Sphere config
  sphereRadius: SPHERE_RADIUS,
  gridDivisions: GRID_DIVISIONS,
  idleTimeout: IDLE_TIMEOUT,
  collisionDuration: COLLISION_DURATION,

  // Actions
  incrementScore: () => set((s) => ({ score: s.score + 10 })),

  setAutopilot: (val) => set({ autopilot: val }),

  recordInput: () => set({ lastInputTime: Date.now(), autopilot: false }),

  checkIdleResume: () => {
    const s = get()
    if (!s.autopilot && !s.colliding && Date.now() - s.lastInputTime > IDLE_TIMEOUT) {
      set({ autopilot: true })
    }
  },

  setSnakeHead: (head) => set({ snakeHead: head }),
  setSnakeHeading: (heading) => set({ snakeHeading: heading }),
  setSnakeSegments: (segs) => set({ snakeSegments: segs }),
  addSegments: (count) => set((s) => ({ segmentCount: s.segmentCount + count })),

  setCurrentSpeed: (speed) => set({ currentSpeed: speed }),

  setFood: (food) => set({ food }),
  setAStarPath: (path) => set({ aStarPath: path }),

  triggerCollision: (block) => set({
    colliding: true,
    collidingBlock: block,
    gameRunning: false,
  }),

  clearCollision: () => set({
    colliding: false,
    collidingBlock: null,
    gameRunning: true,
  }),

  resetGame: () => set({
    score: 0,
    autopilot: true,
    colliding: false,
    collidingBlock: null,
    gameRunning: true,
    snakeHead: { theta: Math.PI / 2, phi: 0 },
    snakeHeading: 0,
    snakeSegments: [],
    segmentCount: 3,
    currentSpeed: V_BASE,
    food: { theta: Math.PI / 3, phi: Math.PI / 4 },
    lastInputTime: 0,
    aStarPath: [],
  }),
}))

export default useGameStore
