import { create } from 'zustand'

const SPHERE_RADIUS = 40
const GRID_DIVISIONS = 40
const IDLE_TIMEOUT = 3000
const COLLISION_DURATION = 500

// Speed constants — tuned slower for smoother control
const V_BASE = 5.0625 // default cruising speed (3/4 of previous)
const V_MAX = 20.25   // top speed when accelerating
const V_MIN = 2.25    // minimum crawl speed when braking
const INITIAL_SEGMENT_COUNT = 3
const SEGMENTS_TO_GROWTH = 15
const COMPACT_SEGMENT_COUNT = 3
const SCORE_PER_SEGMENT = 10
const SEGMENT_COST_GROWTH_FACTOR = 5
const FIRST_EVOLUTION_SCALE = 6
const EVOLUTION_SCALE_RATIO = 10 / 3
const SPACE_UNLOCK_EVOLUTION_LEVEL = 3

function computeSnakeScaleAfterEvolution(currentScale, nextLevel) {
  if (nextLevel <= 0) return 1
  if (nextLevel === 1) return FIRST_EVOLUTION_SCALE
  return currentScale * EVOLUTION_SCALE_RATIO
}

function computeFoodScoreMultiplier(level) {
  if (level <= 0) return 1
  return level * 3
}

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
  segmentCount: INITIAL_SEGMENT_COUNT,
  snakeScale: 1,
  evolutionLevel: 0,
  scoreMultiplier: 1,
  lengthProgress: 0,
  segmentScoreCost: SCORE_PER_SEGMENT,
  locomotionMode: 'surface',
  hasLeftEarth: false,
  launchPromptActive: false,
  activePlanetName: 'Earth',

  // Speed state
  currentSpeed: V_BASE,
  vBase: V_BASE,
  vMax: V_MAX,
  vMin: V_MIN,

  // Food
  foods: [],

  // Autopilot / idle tracking
  lastInputTime: 0,
  aStarPath: [],

  // Sphere config
  sphereRadius: SPHERE_RADIUS,
  gridDivisions: GRID_DIVISIONS,
  idleTimeout: IDLE_TIMEOUT,
  collisionDuration: COLLISION_DURATION,

  // Actions
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
  setSpeedProfile: ({ vMin, vBase, vMax }) => set({
    vMin,
    vBase,
    vMax,
  }),

  setFoods: (foods) => set({ foods }),
  addFood: (food) => set((s) => ({ foods: [...s.foods, food] })),
  setLocomotionMode: (mode) => set({ locomotionMode: mode }),
  setHasLeftEarth: (val) => set({ hasLeftEarth: !!val }),
  setLaunchPromptActive: (val) => set({ launchPromptActive: !!val }),
  setActivePlanetName: (name) => set({ activePlanetName: name || 'Earth' }),

  consumeFood: (foodId, basePoints) => {
    const rewardBase = Math.max(1, Number(basePoints) || 1)
    const outcome = {
      scoreDelta: 0,
      evolved: false,
      evolutionCount: 0,
      lengthGains: 0,
      currentScale: get().snakeScale,
      currentSegmentCount: get().segmentCount,
    }

    set((s) => {
      const foodExists = s.foods.some((item) => item.id === foodId)
      if (!foodExists) return s

      const foodMultiplier = computeFoodScoreMultiplier(s.evolutionLevel)
      const scoreDelta = rewardBase * foodMultiplier
      let score = s.score + scoreDelta
      let lengthProgress = s.lengthProgress + scoreDelta
      let segmentCount = s.segmentCount
      let evolutionLevel = s.evolutionLevel
      let snakeScale = s.snakeScale
      let scoreMultiplier = foodMultiplier
      let segmentScoreCost = s.segmentScoreCost
      let launchPromptActive = s.launchPromptActive

      outcome.scoreDelta = scoreDelta

      let guard = 0
      while (guard < 200) {
        guard += 1
        let progressed = false

        while (lengthProgress >= segmentScoreCost) {
          lengthProgress -= segmentScoreCost
          segmentCount += 1
          outcome.lengthGains += 1
          progressed = true
        }

        if (segmentCount >= SEGMENTS_TO_GROWTH) {
          evolutionLevel += 1
          snakeScale = computeSnakeScaleAfterEvolution(snakeScale, evolutionLevel)
          scoreMultiplier = computeFoodScoreMultiplier(evolutionLevel)
          segmentCount = COMPACT_SEGMENT_COUNT
          segmentScoreCost *= SEGMENT_COST_GROWTH_FACTOR
          outcome.evolved = true
          outcome.evolutionCount += 1
          progressed = true
        }

        if (!progressed) break
      }

      outcome.currentScale = snakeScale
      outcome.currentSegmentCount = segmentCount
      if (!s.hasLeftEarth && evolutionLevel >= SPACE_UNLOCK_EVOLUTION_LEVEL) {
        launchPromptActive = true
      }

      return {
        ...s,
        foods: s.foods.filter((item) => item.id !== foodId),
        score,
        lengthProgress,
        segmentCount,
        snakeScale,
        evolutionLevel,
        scoreMultiplier,
        segmentScoreCost,
        launchPromptActive,
      }
    })

    return outcome
  },

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
    segmentCount: INITIAL_SEGMENT_COUNT,
    snakeScale: 1,
    evolutionLevel: 0,
    scoreMultiplier: 1,
    lengthProgress: 0,
    segmentScoreCost: SCORE_PER_SEGMENT,
    locomotionMode: 'surface',
    hasLeftEarth: false,
    launchPromptActive: false,
    activePlanetName: 'Earth',
    currentSpeed: V_BASE,
    foods: [],
    lastInputTime: 0,
    aStarPath: [],
  }),
}))

export default useGameStore
