import { create } from 'zustand'

const SPHERE_RADIUS = 8
const GRID_DIVISIONS = 40 // discretized sphere grid for A*
const SNAKE_SPEED = 0.6 // radians per second
const IDLE_TIMEOUT = 3000 // ms before autopilot re-engages
const COLLISION_DURATION = 500 // ms for collision feedback

const useGameStore = create((set, get) => ({
  // Core game state
  score: 0,
  autopilot: true,
  colliding: false,
  collidingBlock: null,
  gameRunning: true,

  // Snake state (spherical coords: theta = polar angle, phi = azimuthal)
  snakeHead: { theta: Math.PI / 2, phi: 0 },
  snakeHeading: 0, // heading angle in tangent plane (radians)
  snakeSegments: [], // array of {theta, phi}
  segmentCount: 5,

  // Food
  food: { theta: Math.PI / 3, phi: Math.PI / 4 },

  // Autopilot / idle tracking
  lastInputTime: 0,
  aStarPath: [], // waypoints for autopilot

  // Sphere config
  sphereRadius: SPHERE_RADIUS,
  gridDivisions: GRID_DIVISIONS,
  snakeSpeed: SNAKE_SPEED,
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
    segmentCount: 5,
    food: { theta: Math.PI / 3, phi: Math.PI / 4 },
    lastInputTime: 0,
    aStarPath: [],
  }),
}))

export default useGameStore
