import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import useGameStore from '../store/gameStore'
import { contentZones, contentZonesById, HOME_HUB } from '../data/contentZones'
import { getSectionTransition } from '../data/sectionTransitions'
import CameraRig from './scene/CameraRig'
import TransitionEffects from './scene/TransitionEffects'
import AboutDestination from './sections/AboutDestination'
import ProjectsDestination from './sections/ProjectsDestination'
import ResumeDestination from './sections/ResumeDestination'
import ContactDestination from './sections/ContactDestination'
import {
  SPHERE_RADIUS,
  SURFACE_MODE,
  SPACE_MODE,
  SurfacePlanet,
  SpaceCenterPlanet,
  UniverseBackdrop,
  DistantPlanetField,
  GameplayPlanetField,
  SnakeSegment,
  FoodItem,
  computeFoodCollisionDistance,
  computeBlockCollisionDistance,
  computeSelfCollisionDistance,
  computeSnakeSpeedProfile,
  sampleBodyObstacles,
  computeHomeCameraAnchor,
  advanceSurfaceSnake,
  greatCircleDistance,
  createRandomPlanetLayout,
} from './scene/HomeWorldPrimitives'
import {
  sphericalToCartesian,
  moveOnSphere,
  randomSpherePoint,
  findPathAStar,
  headingToward,
} from '../utils/sphereMath'
import earthTextureUrl from '../assets/planets/earth.jpg'
import earthNightTextureUrl from '../assets/planets/earth_night.jpg'
import saturnTextureUrl from '../assets/planets/saturn.jpg'
import jupiterTextureUrl from '../assets/planets/jupiter.jpg'
import ceresTextureUrl from '../assets/planets/ceres.jpg'
import haumeaTextureUrl from '../assets/planets/haumea.jpg'
import erisTextureUrl from '../assets/planets/eris.jpg'
import makemakeTextureUrl from '../assets/planets/makemake.jpg'
import marsTextureUrl from '../assets/planets/mars.jpg'
import mercuryTextureUrl from '../assets/planets/mercury.jpg'
import moonTextureUrl from '../assets/planets/moon.jpg'
import sunTextureUrl from '../assets/planets/sun.jpg'
import venusTextureUrl from '../assets/planets/venus.jpg'

const STEER_SPEED = 2.5
const BASE_SEGMENT_SPACING = 1.25 / 6
const FOOD_INITIAL_COUNT = 12
const FOOD_MAX_SPAWN_ATTEMPTS = 5
const FOOD_MIN_SPAWN_DIST = 1.6
const FOOD_NAV_SAFE_RADIUS = 2.75 + 1.9
const FOOD_FOOD_SAFE_RADIUS = 1.2
const MAX_FOOD_COUNT = Number.POSITIVE_INFINITY
const MAX_FOOD_COUNT_LOW_SPEC = 64
const MAX_FRAME_DELTA = 0.05
const FOOD_SPAWN_INTERVAL = 1.65
const MAX_FOOD_SPAWNS_PER_FRAME = 2
const MAX_FOOD_SPAWNS_PER_FRAME_LOW_SPEC = 1
const SPACE_UNLOCK_EVOLUTION_LEVEL = 3
const SPACE_ZOOM_DEFAULT = 72
const SPACE_CAMERA_FOLLOW = 56
const SPACE_CAMERA_LOOKAHEAD = 28
const SPACE_CAMERA_HEIGHT = 26
const SPACE_CAMERA_SMOOTH = 2.8
const SPACE_CONTROL_SMOOTH = 4.0
const SPACE_TURN_SPEED = 6.0
const SPACE_LAUNCH_ALTITUDE = 8
const SPACE_FOOD_SPAWN_INTERVAL = 1.3
const SPACE_FOOD_INITIAL_COUNT = 10
const SPACE_MAX_FOOD_COUNT = 120
const SPACE_MAX_FOOD_COUNT_LOW_SPEC = 42
const STUCK_PROGRESS_EPS = 0.025
const STUCK_TIMEOUT = 2.4
const TARGET_COOLDOWN_MS = 5200
const TARGET_NAV_HARD_EXCLUSION = FOOD_NAV_SAFE_RADIUS + 1.35
const NAV_LOOKAHEAD_SECONDS = 0.9
const NAV_LOOKAHEAD_SAMPLES = [0.3, 0.6, 1.0]
const NAV_WAYPOINT_SAFE_MULT = 2.2
const NAV_EMERGENCY_SPEED_FACTOR = 0.9
const NAV_EMERGENCY_MIN_EXTRA = 6.3
const AUTOPILOT_TURN_DAMP_EXP = 0.2
const AUTOPILOT_TURN_DAMP_MIN = 0.35
const AUTOPILOT_SOFT_TURN_ANGLE = Math.PI * 0.55
const AUTOPILOT_HARD_UTURN_ANGLE = Math.PI * 0.82
const ZOOM_MIN = 0.000001
const SURFACE_ZOOM_MAX = 500000
const SPACE_ZOOM_MAX = 500000
const ZOOM_WHEEL_EXP = 0.0016
const AUTOPILOT_RECALC_INTERVAL = 0.1
const SELF_COLLIDE_SEGMENT_SKIP = 4
const FOOD_WINDOW_RECALC_INTERVAL = 0.22
const FOOD_WINDOW_SIZE = 180
const FOOD_WINDOW_SIZE_LOW_SPEC = 64
const FOOD_AUTOPILOT_SIZE = 120
const FOOD_AUTOPILOT_SIZE_LOW_SPEC = 40
const FOOD_COLLISION_SIZE = 72
const FOOD_COLLISION_SIZE_LOW_SPEC = 24
const ACCEL_RATE = 14.0
const BRAKE_RATE = 10.0
const FRICTION = 5.0
const SPACE_BOOST_MULTIPLIER = 1.9
const SPACE_TRAIL_SAMPLE_DISTANCE = 2.6

// Earth navigation now lives entirely in the UI navbar, so the surface gameplay
// no longer places physical page portals on the planet.
const NAV_BLOCKS = []

const FOOD_VARIANTS = [
  { kind: 'small', weight: 0.56, basePoints: 1, sizeRatio: 0.58, color: '#44d8ff' },
  { kind: 'medium', weight: 0.29, basePoints: 5, sizeRatio: 1.0, color: '#a7ff3f' },
  { kind: 'large', weight: 0.15, basePoints: 10, sizeRatio: 1.52, color: '#ff8e3b' },
]

const PLANET_TEXTURES = {
  Earth: earthTextureUrl,
  'Earth Night': earthNightTextureUrl,
  Mercury: mercuryTextureUrl,
  Venus: venusTextureUrl,
  Mars: marsTextureUrl,
  Moon: moonTextureUrl,
  Ceres: ceresTextureUrl,
  Jupiter: jupiterTextureUrl,
  Saturn: saturnTextureUrl,
  Haumea: haumeaTextureUrl,
  Makemake: makemakeTextureUrl,
  Eris: erisTextureUrl,
  Sun: sunTextureUrl,
}

function createFoodId() {
  return `food-${Date.now()}-${Math.round(Math.random() * 1e9)}`
}

function pickFoodVariant() {
  const roll = Math.random()
  let cursor = 0
  for (const variant of FOOD_VARIANTS) {
    cursor += variant.weight
    if (roll <= cursor) return variant
  }
  return FOOD_VARIANTS[FOOD_VARIANTS.length - 1]
}

function spawnSurfaceFood({ snakeSegments = [], foods = [], extraAvoid = [], snakeScale = 1 } = {}) {
  const avoidanceScale = Math.pow(Math.max(1, snakeScale), 0.34)
  const snakeAvoidDist = Math.max(FOOD_MIN_SPAWN_DIST, 0.11333333333333333 * avoidanceScale * 2.6)
  for (let attempt = 0; attempt < FOOD_MAX_SPAWN_ATTEMPTS; attempt++) {
    const variant = pickFoodVariant()
    const point = randomSpherePoint([], 0)
    if (!point) continue

    let blocked = false
    for (const block of NAV_BLOCKS) {
      if (greatCircleDistance(point.theta, point.phi, block.theta, block.phi) < FOOD_NAV_SAFE_RADIUS) {
        blocked = true
        break
      }
    }
    if (blocked) continue

    for (const seg of snakeSegments) {
      if (greatCircleDistance(point.theta, point.phi, seg.theta, seg.phi) < snakeAvoidDist) {
        blocked = true
        break
      }
    }
    if (blocked) continue

    for (const food of foods) {
      if (greatCircleDistance(point.theta, point.phi, food.theta, food.phi) < FOOD_FOOD_SAFE_RADIUS) {
        blocked = true
        break
      }
    }
    if (blocked) continue

    for (const avoid of extraAvoid) {
      if (greatCircleDistance(point.theta, point.phi, avoid.theta, avoid.phi) < FOOD_MIN_SPAWN_DIST) {
        blocked = true
        break
      }
    }
    if (blocked) continue

    return {
      id: createFoodId(),
      mode: SURFACE_MODE,
      theta: point.theta,
      phi: point.phi,
      kind: variant.kind,
      basePoints: variant.basePoints,
      sizeRatio: variant.sizeRatio,
      color: variant.color,
      createdAt: Date.now(),
    }
  }
  return null
}

function spawnSpaceFood({ foods = [], snakeScale = 1 } = {}) {
  const radius = 120 + Math.random() * 320
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const variant = pickFoodVariant()
  const pos = [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ]

  const tooClose = foods.some((item) => {
    if (!Array.isArray(item.position)) return false
    const a = new THREE.Vector3(...item.position)
    const b = new THREE.Vector3(...pos)
    return a.distanceTo(b) < 18
  })
  if (tooClose) return null

  return {
    id: createFoodId(),
    mode: SPACE_MODE,
    position: pos,
    kind: `${variant.kind}-space`,
    basePoints: variant.basePoints,
    sizeRatio: variant.sizeRatio * Math.max(0.9, Math.pow(Math.max(1, snakeScale), 0.08)),
    color: variant.color,
    createdAt: Date.now(),
  }
}

function toPlanetFieldEntry(planet) {
  return {
    id: planet.id,
    name: planet.name,
    textureUrl: planet.textureUrl,
    position: planet.position,
    radius: planet.radius,
    axialTiltDeg: planet.axialTiltDeg,
    spinSpeed: planet.spinSpeed,
    initialRotation: planet.initialRotation,
    ring: planet.ring,
    ringTilt: planet.ringTilt,
    isStar: planet.isStar,
  }
}

function normalizeAngleDiff(angle) {
  let next = angle
  while (next > Math.PI) next -= Math.PI * 2
  while (next < -Math.PI) next += Math.PI * 2
  return next
}

function pushNearestFood(bucket, entry, maxCount) {
  if (maxCount <= 0) return
  if (bucket.length < maxCount) {
    bucket.push(entry)
    return
  }

  let farthestIdx = 0
  let farthestDist = bucket[0].dist
  for (let i = 1; i < bucket.length; i++) {
    if (bucket[i].dist > farthestDist) {
      farthestDist = bucket[i].dist
      farthestIdx = i
    }
  }

  if (entry.dist < farthestDist) {
    bucket[farthestIdx] = entry
  }
}

function selectNearestFoods(foods, head, maxCount) {
  if (!foods || foods.length === 0 || maxCount <= 0) return []
  if (foods.length <= maxCount) return foods

  const nearest = []
  for (const item of foods) {
    const dist = greatCircleDistance(head.theta, head.phi, item.theta, item.phi)
    pushNearestFood(nearest, { item, dist }, maxCount)
  }

  nearest.sort((a, b) => a.dist - b.dist)
  return nearest.map((entry) => entry.item)
}

function chooseFoodTarget(
  foods,
  head,
  bodyObstacles = [],
  { cooldowns, now = 0, bodyUnsafeDist = 1.6, heading = 0, snakeScale = 1 } = {}
) {
  if (!foods || foods.length === 0) return null

  const candidates = []
  for (const item of foods) {
    if (cooldowns?.has(item.id) && cooldowns.get(item.id) > now) continue

    const dist = greatCircleDistance(head.theta, head.phi, item.theta, item.phi)
    let nearestBodyDist = Infinity
    for (const body of bodyObstacles) {
      const d = greatCircleDistance(item.theta, item.phi, body.theta, body.phi)
      if (d < nearestBodyDist) nearestBodyDist = d
      if (nearestBodyDist < bodyUnsafeDist * 0.45) break
    }

    let nearestNavDist = Infinity
    for (const block of NAV_BLOCKS) {
      const d = greatCircleDistance(item.theta, item.phi, block.theta, block.phi)
      if (d < nearestNavDist) nearestNavDist = d
    }

    candidates.push({
      item,
      dist,
      nearestBodyDist,
      nearestNavDist,
      navRisk: nearestNavDist < TARGET_NAV_HARD_EXCLUSION,
    })
  }

  if (candidates.length === 0) {
    let fallback = foods[0]
    let fallbackScore = Infinity
    for (const item of foods) {
      const dist = greatCircleDistance(head.theta, head.phi, item.theta, item.phi)
      const utility = dist / (1 + item.basePoints * 0.65)
      if (utility < fallbackScore) {
        fallback = item
        fallbackScore = utility
      }
    }
    return fallback
  }

  const saferCandidates = candidates.filter((c) => !c.navRisk)
  const pool = saferCandidates.length > 0 ? saferCandidates : candidates

  let best = pool[0].item
  let bestScore = Infinity
  const scale = Math.max(1, snakeScale)
  const turnPenaltyStrength = 0.95 + Math.log2(scale) * 0.75
  for (const candidate of pool) {
    const crowdPenalty = candidate.nearestBodyDist < bodyUnsafeDist
      ? 1 + (bodyUnsafeDist - candidate.nearestBodyDist) * 1.8
      : 1

    const navUnsafeDist = FOOD_NAV_SAFE_RADIUS + 0.75
    const navPenalty = candidate.nearestNavDist < navUnsafeDist
      ? 1 + (navUnsafeDist - candidate.nearestNavDist) * 3.2
      : 1

    const toward = headingToward(head.theta, head.phi, candidate.item.theta, candidate.item.phi)
    const turnDiff = Math.abs(normalizeAngleDiff(toward - heading))
    const softTurnPenalty = turnDiff > AUTOPILOT_SOFT_TURN_ANGLE
      ? 1 + ((turnDiff - AUTOPILOT_SOFT_TURN_ANGLE) / (Math.PI - AUTOPILOT_SOFT_TURN_ANGLE)) * turnPenaltyStrength
      : 1
    const hardUTurnPenalty = turnDiff > AUTOPILOT_HARD_UTURN_ANGLE
      ? 4 + Math.log2(scale) * 2
      : 1

    const utility = (
      candidate.dist * crowdPenalty * navPenalty * softTurnPenalty * hardUTurnPenalty
    ) / (1 + candidate.item.basePoints * 0.65)
    if (utility < bestScore) {
      best = candidate.item
      bestScore = utility
    }
  }

  return best || null
}

function NavBlock({ label, path, theta, phi, color, onClick, flash }) {
  const ref = useRef()
  const hovered = useRef(false)
  const orient = useMemo(() => {
    const position = sphericalToCartesian(theta, phi)
    const normal = position.clone().normalize()
    const worldUp = normal.clone()
    const east = new THREE.Vector3(-Math.sin(phi), 0, Math.cos(phi)).normalize()
    const north = new THREE.Vector3().crossVectors(east, worldUp).normalize()
    const right = north.clone().normalize()
    const m = new THREE.Matrix4()
    m.makeBasis(right, worldUp, east.clone().negate())
    m.setPosition(position)
    return {
      position,
      quaternion: new THREE.Quaternion().setFromRotationMatrix(m),
    }
  }, [theta, phi])

  useFrame((_, delta) => {
    if (!ref.current) return
    const normal = orient.position.clone().normalize()
    const bob = Math.sin(Date.now() * 0.002 + phi) * 0.3
    ref.current.position.copy(orient.position.clone().add(normal.multiplyScalar(bob + 2.0)))
    const targetScale = hovered.current ? 1.15 : 1
    ref.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5)
  })

  const displayColor = flash ? '#FFFFFF' : color

  return (
    <group
      ref={ref}
      position={orient.position}
      quaternion={orient.quaternion}
      onClick={(e) => { e.stopPropagation(); onClick(path) }}
      onPointerOver={() => { hovered.current = true; document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { hovered.current = false; document.body.style.cursor = 'default' }}
    >
      <mesh>
        <boxGeometry args={[5, 3.5, 5]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={flash ? 4 : 0.8}
          transparent
          opacity={flash ? 0.8 : 0.25}
        />
      </mesh>
      <mesh>
        <boxGeometry args={[5, 3.5, 5]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={flash ? 5 : 1.5}
          wireframe
          transparent
          opacity={0.6}
        />
      </mesh>
      <Html
        position={[0, 3.5, 0]}
        center
        transform
        sprite
        distanceFactor={8}
        style={{
          color: '#FF0055',
          fontFamily: 'Orbitron, sans-serif',
          fontSize: '14px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          textShadow: '0 0 12px rgba(255,0,85,0.9)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Html>
    </group>
  )
}

function SectionScene({ section, selectedItem, onSelect }) {
  const zone = section && section !== 'home' ? contentZonesById[section] : null
  if (!zone) return null

  if (zone.sectionId === 'about') {
    return <AboutDestination zone={zone} selectedId={selectedItem} onSelect={onSelect} />
  }
  if (zone.sectionId === 'projects') {
    return <ProjectsDestination zone={zone} selectedId={selectedItem} onSelect={onSelect} />
  }
  if (zone.sectionId === 'resume') {
    return <ResumeDestination zone={zone} selectedId={selectedItem} onSelect={onSelect} />
  }
  if (zone.sectionId === 'contact') {
    return <ContactDestination zone={zone} selectedId={selectedItem} onSelect={onSelect} />
  }
  return null
}

export default function GameScene({ lowSpec = false }) {
  const {
    score,
    autopilot,
    colliding,
    collidingBlock,
    foods,
    segmentCount,
    snakeScale,
    evolutionLevel,
    locomotionMode,
    launchPromptActive,
    hasLeftEarth,
    activePlanetName,
    currentSection,
    targetSection,
    gameplayState,
    cameraMode,
    transitionPhase,
    transitionProgress,
    selectedSectionItem,
    reducedMotion,
    inputEnabled,
    gameplayFrozen,
    recordInput,
    checkIdleResume,
    setFoods,
    consumeFood,
    setAutopilot,
    setLocomotionMode,
    setHasLeftEarth,
    setLaunchPromptActive,
    setActivePlanetName,
    setCurrentSpeed,
    setSpeedProfile,
    triggerCollision,
    clearCollision,
    navigateToSection,
    completeSectionTransition,
    setTransitionPhase,
    setTransitionProgress,
    setCameraMode,
    returnHome,
    focusSectionItem,
    unfocusSectionItem,
    resetGame,
  } = useGameStore()

  const headRef = useRef({ theta: Math.PI / 2, phi: 0 })
  const headingRef = useRef(0)
  const trailRef = useRef([])
  const segmentsRef = useRef([{ theta: Math.PI / 2, phi: 0, heading: 0 }])
  const segCountRef = useRef(segmentCount)
  const snakeScaleRef = useRef(snakeScale)
  const foodsRef = useRef(foods)
  const autopilotRef = useRef(autopilot)
  const collidingRef = useRef(colliding)
  const collisionTimerRef = useRef(null)
  const astarPathRef = useRef([])
  const astarRecalcRef = useRef(0)
  const targetFoodIdRef = useRef(null)
  const flashRef = useRef(false)
  const flashTimerRef = useRef(0)
  const speedRef = useRef(5.0625)
  const speedProfileRef = useRef({ vMin: 2.25, vBase: 5.0625, vMax: 20.25 })
  const zoomRef = useRef(30)
  const touchSteerRef = useRef(0)
  const touchSteerUntilRef = useRef(0)
  const foodSpawnClockRef = useRef(0)
  const nearbyFoodsRef = useRef(foods)
  const nearbyFoodsClockRef = useRef(0)
  const locomotionModeRef = useRef(locomotionMode)
  const evolutionLevelRef = useRef(evolutionLevel)
  const flightHeadRef = useRef(new THREE.Vector3(0, SPHERE_RADIUS + SPACE_LAUNCH_ALTITUDE, 0))
  const flightDirRef = useRef(new THREE.Vector3(1, 0, 0))
  const flightTrailRef = useRef([])
  const flightSpeedRef = useRef(5.0625)
  const spaceZoomRef = useRef(SPACE_ZOOM_DEFAULT)
  const touchFlightVecRef = useRef({ x: 0, y: 0, until: 0 })
  const touchBoostActiveRef = useRef(false)
  const spaceLaunchGraceRef = useRef(0)
  const surfacePlanetTextureRef = useRef(earthTextureUrl)
  const landedPlanetNameRef = useRef(activePlanetName || 'Earth')
  const gameplayStateRef = useRef(gameplayState)
  const cameraModeRef = useRef(cameraMode)
  const currentSectionRef = useRef(currentSection)
  const targetSectionRef = useRef(targetSection)
  const reducedMotionRef = useRef(reducedMotion)
  const inputEnabledRef = useRef(inputEnabled)
  const gameplayFrozenRef = useRef(gameplayFrozen)
  const transitionClockRef = useRef(0)
  const currentTransitionRef = useRef(null)
  const transitionStartAnchorRef = useRef([0, 18, 30])
  const transitionDestinationRef = useRef(HOME_HUB.arrivalCamera)
  const gameplayCameraAnchorRef = useRef([0, 18, 30])
  const focusAnchorRef = useRef(null)
  const throttleRef = useRef(0)
  const targetCooldownsRef = useRef(new Map())
  const targetTrackRef = useRef({ id: null, lastDistance: Infinity, stuckTime: 0 })
  const keysDownRef = useRef(new Set())
  const spacePlanetsRef = useRef(createRandomPlanetLayout())
  const cameraLookTargetRef = useRef([0, 0, 0])
  const sectionOrbitYawRef = useRef(0)
  const sectionOrbitPitchRef = useRef(0.08)
  const sectionOrbitDistanceRef = useRef(72)
  const { gl } = useThree()
  const [renderState, setRenderState] = useState({
    segments: [{ theta: Math.PI / 2, phi: 0, heading: 0 }],
    foods: foods.slice(0, lowSpec ? 48 : 120),
    snakeScale,
    locomotionMode,
    surfacePlanetTexture: earthTextureUrl,
    landedPlanetName: activePlanetName || 'Earth',
    flash: false,
    collidingBlockLabel: null,
  })
  const spacePlanets = spacePlanetsRef.current
  const gameplayPlanets = useMemo(() => spacePlanets.map(toPlanetFieldEntry), [spacePlanets])

  useEffect(() => { autopilotRef.current = autopilot }, [autopilot])
  useEffect(() => { segCountRef.current = segmentCount }, [segmentCount])
  useEffect(() => { snakeScaleRef.current = snakeScale }, [snakeScale])
  useEffect(() => {
    foodsRef.current = foods
    nearbyFoodsRef.current = foods
    nearbyFoodsClockRef.current = 0
  }, [foods])
  useEffect(() => { locomotionModeRef.current = locomotionMode }, [locomotionMode])
  useEffect(() => { evolutionLevelRef.current = evolutionLevel }, [evolutionLevel])
  useEffect(() => { landedPlanetNameRef.current = activePlanetName || 'Earth' }, [activePlanetName])
  useEffect(() => { collidingRef.current = colliding }, [colliding])
  useEffect(() => { gameplayStateRef.current = gameplayState }, [gameplayState])
  useEffect(() => { cameraModeRef.current = cameraMode }, [cameraMode])
  useEffect(() => { currentSectionRef.current = currentSection }, [currentSection])
  useEffect(() => { targetSectionRef.current = targetSection }, [targetSection])
  useEffect(() => { reducedMotionRef.current = reducedMotion }, [reducedMotion])
  useEffect(() => { inputEnabledRef.current = inputEnabled }, [inputEnabled])
  useEffect(() => { gameplayFrozenRef.current = gameplayFrozen }, [gameplayFrozen])

  useEffect(() => {
    gl.domElement.style.touchAction = 'none'
  }, [gl])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => useGameStore.getState().setReducedMotion(media.matches)
    apply()
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }
    media.addListener(apply)
    return () => media.removeListener(apply)
  }, [])

  const seedFoodField = useCallback((headPoint = headRef.current, snakeSegments = segmentsRef.current) => {
    const maxFoodCount = lowSpec ? MAX_FOOD_COUNT_LOW_SPEC : MAX_FOOD_COUNT
    const initialCountRaw = lowSpec ? Math.max(4, Math.floor(FOOD_INITIAL_COUNT / 2)) : FOOD_INITIAL_COUNT
    const initialCount = Math.min(initialCountRaw, maxFoodCount)
    const nextFoods = []
    const spawnBody = snakeSegments?.length ? snakeSegments : [headPoint]

    for (let i = 0; i < initialCount; i++) {
      const item = spawnSurfaceFood({
        snakeSegments: spawnBody,
        foods: nextFoods,
        extraAvoid: [headPoint],
        snakeScale: snakeScaleRef.current,
      })
      if (item) nextFoods.push(item)
    }

    foodsRef.current = nextFoods
    setFoods(nextFoods)
    return nextFoods
  }, [lowSpec, setFoods])

  useEffect(() => {
    if (gameplayState !== 'playing' || locomotionMode !== SURFACE_MODE || foods.length) return
    seedFoodField()
  }, [foods.length, gameplayState, locomotionMode, seedFoodField])

  useEffect(() => {
    const maxFoodCount = lowSpec ? MAX_FOOD_COUNT_LOW_SPEC : MAX_FOOD_COUNT
    if (foods.length > maxFoodCount) {
      const trimmed = foods.slice(-maxFoodCount)
      foodsRef.current = trimmed
      nearbyFoodsRef.current = trimmed
      nearbyFoodsClockRef.current = 0
      setFoods(trimmed)
    }
  }, [foods, lowSpec, setFoods])

  useEffect(() => {
    return () => {
      if (collisionTimerRef.current) {
        clearTimeout(collisionTimerRef.current)
      }
    }
  }, [])

  const hardReset = useCallback((respawnFoods = true) => {
    const baseProfile = computeSnakeSpeedProfile(1)
    resetGame()
    headRef.current = { theta: Math.PI / 2, phi: 0 }
    headingRef.current = 0
    trailRef.current = []
    segmentsRef.current = [{ theta: Math.PI / 2, phi: 0, heading: 0 }]
    segCountRef.current = 3
    snakeScaleRef.current = 1
    speedRef.current = baseProfile.vBase
    speedProfileRef.current = baseProfile
    setSpeedProfile(baseProfile)
    setCurrentSpeed(baseProfile.vBase)
    if (collisionTimerRef.current) {
      clearTimeout(collisionTimerRef.current)
      collisionTimerRef.current = null
    }
    astarPathRef.current = []
    astarRecalcRef.current = 0
    targetFoodIdRef.current = null
    targetCooldownsRef.current.clear()
    targetTrackRef.current = { id: null, lastDistance: Infinity, stuckTime: 0 }
    flashRef.current = false
    flashTimerRef.current = 0
    foodSpawnClockRef.current = 0
    collidingRef.current = false
    nearbyFoodsRef.current = []
    nearbyFoodsClockRef.current = 0
    autopilotRef.current = true
    locomotionModeRef.current = SURFACE_MODE
    evolutionLevelRef.current = 0
    gameplayStateRef.current = 'playing'
    currentSectionRef.current = 'home'
    targetSectionRef.current = null
    cameraModeRef.current = 'followSnake'
    flightTrailRef.current = []
    flightHeadRef.current = new THREE.Vector3(0, SPHERE_RADIUS + SPACE_LAUNCH_ALTITUDE, 0)
    flightDirRef.current = new THREE.Vector3(1, 0, 0)
    flightSpeedRef.current = baseProfile.vBase
    touchFlightVecRef.current = { x: 0, y: 0, until: 0 }
    touchBoostActiveRef.current = false
    cameraLookTargetRef.current = [0, 0, 0]
    surfacePlanetTextureRef.current = earthTextureUrl
    landedPlanetNameRef.current = 'Earth'
    setLocomotionMode(SURFACE_MODE)
    setHasLeftEarth(false)
    setLaunchPromptActive(false)
    setActivePlanetName('Earth')
    setAutopilot(true)
    if (respawnFoods) {
      seedFoodField(headRef.current, segmentsRef.current)
    } else {
      foodsRef.current = []
      setFoods([])
    }
  }, [resetGame, seedFoodField, setActivePlanetName, setAutopilot, setCurrentSpeed, setFoods, setHasLeftEarth, setLaunchPromptActive, setLocomotionMode, setSpeedProfile])

  const syncRenderState = useCallback((nextState) => {
    setRenderState(nextState)
  }, [])

  const startSectionTransition = useCallback((section, source = 'topNav') => {
    if (!section) return
    const frozenFoods = foodsRef.current.filter((item) => (
      locomotionModeRef.current === SPACE_MODE
        ? item.mode === SPACE_MODE
        : !item.mode || item.mode === SURFACE_MODE
    ))
    const destination = section === 'home' ? HOME_HUB : contentZonesById[section]

    syncRenderState({
      segments: segmentsRef.current,
      foods: frozenFoods.slice(0, lowSpec ? 48 : 160),
      snakeScale: snakeScaleRef.current,
      locomotionMode: locomotionModeRef.current,
      surfacePlanetTexture: surfacePlanetTextureRef.current,
      landedPlanetName: landedPlanetNameRef.current,
      flash: false,
      collidingBlockLabel: null,
    }, true)
    transitionStartAnchorRef.current = gameplayCameraAnchorRef.current
    transitionDestinationRef.current = destination?.arrivalCamera || HOME_HUB.arrivalCamera
    currentTransitionRef.current = getSectionTransition(currentSectionRef.current || 'home', section)
    transitionClockRef.current = 0
    setTransitionPhase('pullback')
    setTransitionProgress(0)
    setCameraMode('cinematicPullback')
    navigateToSection(section, source)
  }, [navigateToSection, setCameraMode, setTransitionPhase, setTransitionProgress])

  const handleNavBlockClick = useCallback((section) => {
    if (!section) return
    if (gameplayStateRef.current !== 'playing' || gameplayFrozenRef.current) return
    if (locomotionModeRef.current !== SURFACE_MODE) return
    if (landedPlanetNameRef.current !== 'Earth') return
    startSectionTransition(section, 'navBlock')
  }, [startSectionTransition])

  useEffect(() => {
    const canvas = gl.domElement
    let pinchDist = null
    let swipeTracking = false
    let swipeStartX = 0
    let swipeStartY = 0

    const getTouchDist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)

    let sectionDrag = false
    let sectionStartX = 0
    let sectionStartY = 0

    const applySectionZoom = (factor) => {
      sectionOrbitDistanceRef.current = THREE.MathUtils.clamp(sectionOrbitDistanceRef.current * factor, 42, 132)
    }

    const onWheel = (e) => {
      if (gameplayStateRef.current === 'sectionViewing') {
        const factor = Math.exp(e.deltaY * ZOOM_WHEEL_EXP)
        applySectionZoom(factor)
        return
      }
      if (!inputEnabledRef.current || gameplayFrozenRef.current || gameplayStateRef.current !== 'playing') return
      const factor = Math.exp(e.deltaY * ZOOM_WHEEL_EXP)
      if (locomotionModeRef.current === SPACE_MODE) {
        spaceZoomRef.current = THREE.MathUtils.clamp(spaceZoomRef.current * factor, ZOOM_MIN, SPACE_ZOOM_MAX)
      } else {
        zoomRef.current = THREE.MathUtils.clamp(zoomRef.current * factor, ZOOM_MIN, SURFACE_ZOOM_MAX)
      }
    }

    const onTouchStart = (e) => {
      if (gameplayStateRef.current === 'sectionViewing') {
        if (e.touches.length === 2) {
          pinchDist = getTouchDist(e.touches[0], e.touches[1])
          return
        }
        if (e.touches.length === 1) {
          sectionDrag = true
          sectionStartX = e.touches[0].clientX
          sectionStartY = e.touches[0].clientY
        }
        return
      }
      if (!inputEnabledRef.current || gameplayFrozenRef.current || gameplayStateRef.current !== 'playing') return
      if (e.touches.length === 2) {
        pinchDist = getTouchDist(e.touches[0], e.touches[1])
        return
      }
      if (e.touches.length === 1) {
        swipeTracking = true
        swipeStartX = e.touches[0].clientX
        swipeStartY = e.touches[0].clientY
      }
    }

    const onTouchMove = (e) => {
      if (gameplayStateRef.current === 'sectionViewing') {
        if (e.touches.length === 2) {
          if (e.cancelable) e.preventDefault()
          const nextDist = getTouchDist(e.touches[0], e.touches[1])
          if (pinchDist && nextDist > 0) {
            applySectionZoom(pinchDist / nextDist)
          }
          pinchDist = nextDist
          return
        }
        if (e.touches.length === 1 && sectionDrag) {
          const t = e.touches[0]
          const dx = t.clientX - sectionStartX
          const dy = t.clientY - sectionStartY
          sectionOrbitYawRef.current -= dx * 0.0048
          sectionOrbitPitchRef.current = THREE.MathUtils.clamp(sectionOrbitPitchRef.current - dy * 0.0028, -0.58, 0.58)
          sectionStartX = t.clientX
          sectionStartY = t.clientY
          if (e.cancelable) e.preventDefault()
        }
        return
      }
      if (!inputEnabledRef.current || gameplayFrozenRef.current || gameplayStateRef.current !== 'playing') return
      const mode = locomotionModeRef.current
      if (e.touches.length === 2) {
        if (e.cancelable) e.preventDefault()
        const nextDist = getTouchDist(e.touches[0], e.touches[1])
        if (pinchDist && nextDist > 0) {
          const factor = pinchDist / nextDist
          if (mode === SPACE_MODE) {
            spaceZoomRef.current = THREE.MathUtils.clamp(spaceZoomRef.current * factor, ZOOM_MIN, SPACE_ZOOM_MAX)
          } else {
            zoomRef.current = THREE.MathUtils.clamp(zoomRef.current * factor, ZOOM_MIN, SURFACE_ZOOM_MAX)
          }
        }
        pinchDist = nextDist
        return
      }

      if (mode === SPACE_MODE && e.touches.length === 1) {
        const t = e.touches[0]
        const dx = t.clientX - swipeStartX
        const dy = t.clientY - swipeStartY
        touchFlightVecRef.current = {
          x: THREE.MathUtils.clamp(dx / 120, -1, 1),
          y: THREE.MathUtils.clamp(-dy / 120, -1, 1),
          until: performance.now() + 140,
        }
        if (e.cancelable) e.preventDefault()
        return
      }

      if (e.touches.length === 1 && swipeTracking) {
        const t = e.touches[0]
        const dx = t.clientX - swipeStartX
        const dy = t.clientY - swipeStartY
        if (Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.15) {
          if (e.cancelable) e.preventDefault()
          touchSteerRef.current = dx > 0 ? 1 : -1
          touchSteerUntilRef.current = performance.now() + 120
          recordInput()
          swipeStartX = t.clientX
          swipeStartY = t.clientY
        }
      }
    }

    const onTouchEnd = (e) => {
      if (e.touches.length < 2) pinchDist = null
      if (gameplayStateRef.current === 'sectionViewing') {
        if (e.touches.length === 0) sectionDrag = false
        return
      }
      if (e.touches.length === 0) {
        swipeTracking = false
        touchFlightVecRef.current = { x: 0, y: 0, until: 0 }
      }
    }

    const onPointerDown = (e) => {
      if (gameplayStateRef.current !== 'sectionViewing') return
      sectionDrag = true
      sectionStartX = e.clientX
      sectionStartY = e.clientY
    }

    const onPointerMove = (e) => {
      if (gameplayStateRef.current !== 'sectionViewing' || !sectionDrag) return
      const dx = e.clientX - sectionStartX
      const dy = e.clientY - sectionStartY
      sectionOrbitYawRef.current -= dx * 0.0045
      sectionOrbitPitchRef.current = THREE.MathUtils.clamp(sectionOrbitPitchRef.current - dy * 0.0026, -0.58, 0.58)
      sectionStartX = e.clientX
      sectionStartY = e.clientY
    }

    const onPointerUp = () => {
      sectionDrag = false
    }

    canvas.addEventListener('wheel', onWheel, { passive: true })
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd, { passive: true })
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: true })
    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      canvas.removeEventListener('touchcancel', onTouchEnd)
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [gl, recordInput])

  const enterSpaceFromSurface = useCallback(() => {
    if (gameplayFrozenRef.current) return false
    if (locomotionModeRef.current !== SURFACE_MODE) return false
    if (evolutionLevelRef.current < SPACE_UNLOCK_EVOLUTION_LEVEL) return false

    const surfaceHead = headRef.current
    const surfaceHeading = headingRef.current
    const surfacePos = sphericalToCartesian(surfaceHead.theta, surfaceHead.phi)
    const next = advanceSurfaceSnake({ head: surfaceHead, heading: surfaceHeading, speed: 1.2, delta: 1 })
    const nextPos = sphericalToCartesian(next.theta, next.phi)
    const forward = nextPos.clone().sub(surfacePos).normalize()
    const normal = surfacePos.clone().normalize()
    const launchPos = surfacePos.clone().add(normal.multiplyScalar(SPACE_LAUNCH_ALTITUDE))

    flightHeadRef.current = launchPos
    flightDirRef.current = forward.lengthSq() > 0.0001 ? forward : new THREE.Vector3(1, 0, 0)
    flightTrailRef.current = [{ position: [launchPos.x, launchPos.y, launchPos.z], direction: [flightDirRef.current.x, flightDirRef.current.y, flightDirRef.current.z] }]
    const surfaceProfile = computeSnakeSpeedProfile(snakeScaleRef.current)
    astarPathRef.current = []
    astarRecalcRef.current = 0
    targetFoodIdRef.current = null
    targetCooldownsRef.current.clear()
    targetTrackRef.current = { id: null, lastDistance: Infinity, stuckTime: 0 }
    flashRef.current = false
    flashTimerRef.current = 0
    nearbyFoodsRef.current = []
    nearbyFoodsClockRef.current = 0
    flightSpeedRef.current = speedRef.current
    spaceLaunchGraceRef.current = 1.6
    touchFlightVecRef.current = { x: 0, y: 0, until: 0 }
    touchBoostActiveRef.current = false
    spaceZoomRef.current = SPACE_ZOOM_DEFAULT
    locomotionModeRef.current = SPACE_MODE
    cameraLookTargetRef.current = [
      launchPos.x + flightDirRef.current.x * SPACE_CAMERA_LOOKAHEAD,
      launchPos.y + flightDirRef.current.y * SPACE_CAMERA_LOOKAHEAD,
      launchPos.z + flightDirRef.current.z * SPACE_CAMERA_LOOKAHEAD,
    ]
    setLocomotionMode(SPACE_MODE)
    setHasLeftEarth(true)
    setLaunchPromptActive(false)
    setActivePlanetName('Earth')
    landedPlanetNameRef.current = 'Earth'
    surfacePlanetTextureRef.current = earthTextureUrl
    setAutopilot(false)
    setSpeedProfile(surfaceProfile)
    setCurrentSpeed(speedRef.current)

    foodsRef.current = []
    const initialSpaceFoods = []
    for (let i = 0; i < SPACE_FOOD_INITIAL_COUNT; i++) {
      const item = spawnSpaceFood({ foods: initialSpaceFoods, snakeScale: snakeScaleRef.current })
      if (item) initialSpaceFoods.push(item)
    }
    foodsRef.current = initialSpaceFoods
    setFoods(initialSpaceFoods)
    return true
  }, [setActivePlanetName, setAutopilot, setCurrentSpeed, setFoods, setHasLeftEarth, setLaunchPromptActive, setLocomotionMode, setSpeedProfile])

  const landOnPlanet = useCallback((planet = null) => {
    locomotionModeRef.current = SURFACE_MODE
    setLocomotionMode(SURFACE_MODE)
    setHasLeftEarth(true)
    setLaunchPromptActive(false)
    setAutopilot(false)
    const nextPlanetName = planet?.name || 'Earth'
    setActivePlanetName(nextPlanetName)
    landedPlanetNameRef.current = nextPlanetName
    surfacePlanetTextureRef.current = PLANET_TEXTURES[nextPlanetName] || earthTextureUrl
    const baseHead = { theta: Math.PI / 2, phi: 0 }
    headRef.current = baseHead
    headingRef.current = 0
    trailRef.current = [{ theta: baseHead.theta, phi: baseHead.phi, heading: 0 }]
    segmentsRef.current = [{ theta: baseHead.theta, phi: baseHead.phi, heading: 0 }]
    astarPathRef.current = []
    astarRecalcRef.current = 0
    targetFoodIdRef.current = null
    targetCooldownsRef.current.clear()
    targetTrackRef.current = { id: null, lastDistance: Infinity, stuckTime: 0 }
    flashRef.current = false
    flashTimerRef.current = 0
    nearbyFoodsRef.current = []
    nearbyFoodsClockRef.current = 0
    const profile = computeSnakeSpeedProfile(snakeScaleRef.current)
    speedRef.current = profile.vBase
    speedProfileRef.current = profile
    setSpeedProfile(profile)
    setCurrentSpeed(profile.vBase)
    cameraLookTargetRef.current = [0, 0, 0]
    foodsRef.current = []
    setFoods([])
    seedFoodField(headRef.current, segmentsRef.current)
  }, [seedFoodField, setActivePlanetName, setAutopilot, setCurrentSpeed, setFoods, setHasLeftEarth, setLaunchPromptActive, setLocomotionMode, setSpeedProfile])

  useEffect(() => {
    const onDown = (e) => {
      if (!inputEnabledRef.current || gameplayFrozenRef.current || gameplayStateRef.current !== 'playing') return
      const key = e.key.toLowerCase()
      if (key === ' ' || key === 'spacebar') {
        e.preventDefault()
        if (locomotionModeRef.current === SURFACE_MODE) {
          enterSpaceFromSurface()
        } else if (locomotionModeRef.current === SPACE_MODE) {
          keysDownRef.current.add('spaceBoost')
          touchBoostActiveRef.current = true
          recordInput()
        }
        return
      }
      if (key === 'a' || key === 'arrowleft') {
        keysDownRef.current.add('left')
        recordInput()
      }
      if (key === 'd' || key === 'arrowright') {
        keysDownRef.current.add('right')
        recordInput()
      }
      if (key === 'w' || key === 'arrowup') {
        keysDownRef.current.add('accel')
        recordInput()
      }
      if (key === 's' || key === 'arrowdown') {
        keysDownRef.current.add('brake')
        recordInput()
      }
    }

    const onUp = (e) => {
      const key = e.key.toLowerCase()
      if (key === ' ' || key === 'spacebar') {
        keysDownRef.current.delete('spaceBoost')
        touchBoostActiveRef.current = false
      }
      if (key === 'a' || key === 'arrowleft') keysDownRef.current.delete('left')
      if (key === 'd' || key === 'arrowright') keysDownRef.current.delete('right')
      if (key === 'w' || key === 'arrowup') keysDownRef.current.delete('accel')
      if (key === 's' || key === 'arrowdown') keysDownRef.current.delete('brake')
    }

    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [enterSpaceFromSurface, recordInput])

  useFrame((_, delta) => {
    delta = Math.min(delta, MAX_FRAME_DELTA)

    if (gameplayStateRef.current === 'transitioning' && targetSectionRef.current) {
      const transition = currentTransitionRef.current || getSectionTransition(currentSectionRef.current || 'home', targetSectionRef.current)
      const total = transition.duration || 2.8
      transitionClockRef.current += delta
      const progress = Math.min(1, transitionClockRef.current / total)
      const pullbackEnd = (transition.pullbackDuration || 0.6) / total
      const warpEnd = ((transition.pullbackDuration || 0.6) + (transition.warpDuration || 1.1)) / total

      if (progress < pullbackEnd) {
        if (cameraModeRef.current !== 'cinematicPullback') setCameraMode('cinematicPullback')
        if (transitionPhase !== 'pullback') setTransitionPhase('pullback')
      } else if (progress < warpEnd) {
        if (cameraModeRef.current !== 'warpTravel') setCameraMode('warpTravel')
        if (transitionPhase !== 'warp') setTransitionPhase('warp')
      } else {
        if (cameraModeRef.current !== 'sectionArrival') setCameraMode('sectionArrival')
        if (transitionPhase !== 'arrival') setTransitionPhase('arrival')
      }

      setTransitionProgress(progress)

      if (progress >= 1) {
        completeSectionTransition()
        syncRenderState({
          segments: segmentsRef.current,
          foods: foodsRef.current.slice(0, lowSpec ? 48 : 120),
          snakeScale: snakeScaleRef.current,
          locomotionMode: locomotionModeRef.current,
          surfacePlanetTexture: surfacePlanetTextureRef.current,
          landedPlanetName: landedPlanetNameRef.current,
          flash: false,
          collidingBlockLabel: null,
        }, true)
      }
    }

    if (gameplayStateRef.current !== 'playing') {
      const frozenFoods = foodsRef.current.filter((item) => (
        locomotionModeRef.current === SPACE_MODE
          ? item.mode === SPACE_MODE
          : !item.mode || item.mode === SURFACE_MODE
      ))
      syncRenderState({
        segments: segmentsRef.current,
        foods: frozenFoods.slice(0, lowSpec ? 48 : 160),
        snakeScale: snakeScaleRef.current,
        locomotionMode: locomotionModeRef.current,
        surfacePlanetTexture: surfacePlanetTextureRef.current,
        landedPlanetName: landedPlanetNameRef.current,
        flash: collidingRef.current,
        collidingBlockLabel: collidingBlock,
      })
      return
    }

    if (collidingRef.current) {
      flashTimerRef.current += delta
      const flashOn = Math.floor(flashTimerRef.current * 16) % 2 === 0
      flashRef.current = flashOn
      const frozenFoods = foodsRef.current.filter((item) => (
        locomotionModeRef.current === SPACE_MODE
          ? item.mode === SPACE_MODE
          : !item.mode || item.mode === SURFACE_MODE
      ))
      syncRenderState({
        segments: segmentsRef.current,
        foods: frozenFoods.slice(0, lowSpec ? FOOD_WINDOW_SIZE_LOW_SPEC : FOOD_WINDOW_SIZE),
        snakeScale: snakeScaleRef.current,
        locomotionMode: locomotionModeRef.current,
        surfacePlanetTexture: surfacePlanetTextureRef.current,
        landedPlanetName: landedPlanetNameRef.current,
        flash: flashOn,
        collidingBlockLabel: collidingBlock,
      })
      return
    }

    if (locomotionModeRef.current === SURFACE_MODE) {
      checkIdleResume()

      const head = headRef.current
      let heading = headingRef.current
      let speed = speedRef.current
      const speedProfile = computeSnakeSpeedProfile(snakeScaleRef.current)
      const { vMin: dynVMin, vBase: dynVBase, vMax: dynVMax } = speedProfile
      speed = THREE.MathUtils.clamp(speed, dynVMin, dynVMax)
      const profileRef = speedProfileRef.current
      if (
        Math.abs(profileRef.vMin - dynVMin) > 0.001 ||
        Math.abs(profileRef.vBase - dynVBase) > 0.001 ||
        Math.abs(profileRef.vMax - dynVMax) > 0.001
      ) {
        speedProfileRef.current = speedProfile
        setSpeedProfile(speedProfile)
      }

      const throttle = (keysDownRef.current.has('accel') ? 1 : 0) - (keysDownRef.current.has('brake') ? 1 : 0)
      if (throttle > 0) {
        const t = THREE.MathUtils.clamp((speed - dynVBase) / Math.max(0.0001, dynVMax - dynVBase), 0, 1)
        const easeFactor = 1 - t * t
        speed += ACCEL_RATE * easeFactor * delta
        if (speed > dynVMax) speed = dynVMax
      } else if (throttle < 0) {
        const t = THREE.MathUtils.clamp((speed - dynVMin) / Math.max(0.0001, dynVBase - dynVMin), 0, 1)
        const easeFactor = t * t
        speed -= BRAKE_RATE * easeFactor * delta
        if (speed < dynVMin) speed = dynVMin
      } else if (speed > dynVBase) {
        speed -= FRICTION * delta
        if (speed < dynVBase) speed = dynVBase
      } else if (speed < dynVBase) {
        speed += FRICTION * delta
        if (speed > dynVBase) speed = dynVBase
      }

      const segmentSpacing = BASE_SEGMENT_SPACING * Math.max(0.2, snakeScaleRef.current)
      const blockCollisionDist = computeBlockCollisionDistance(snakeScaleRef.current)
      const cachedSegments = segmentsRef.current
      const bodyObstacles = sampleBodyObstacles(cachedSegments)
      const scaleForTurn = Math.max(1, snakeScaleRef.current)
      const autopilotTurnFactor = THREE.MathUtils.clamp(
        1 / Math.pow(scaleForTurn, AUTOPILOT_TURN_DAMP_EXP),
        AUTOPILOT_TURN_DAMP_MIN,
        1
      )
      const autopilotSteerSpeed = STEER_SPEED * autopilotTurnFactor
      const scaleForFoodSearch = Math.max(1, snakeScaleRef.current)
      const growthSearchFactor = lowSpec
        ? 1
        : Math.min(5, 1 + Math.log2(scaleForFoodSearch) * 0.9)
      const foodWindowSize = lowSpec
        ? FOOD_WINDOW_SIZE_LOW_SPEC
        : Math.min(900, Math.max(FOOD_WINDOW_SIZE, Math.ceil(FOOD_WINDOW_SIZE * growthSearchFactor)))
      const collisionScanSize = lowSpec
        ? FOOD_COLLISION_SIZE_LOW_SPEC
        : Math.min(
            foodWindowSize,
            Math.max(FOOD_COLLISION_SIZE, Math.ceil(FOOD_COLLISION_SIZE * growthSearchFactor))
          )
      const windowRecalcInterval = lowSpec
        ? FOOD_WINDOW_RECALC_INTERVAL
        : THREE.MathUtils.clamp(
            FOOD_WINDOW_RECALC_INTERVAL / (1 + Math.log2(scaleForFoodSearch) * 0.5),
            0.05,
            FOOD_WINDOW_RECALC_INTERVAL
          )
      const surfaceFoodPool = foodsRef.current.filter((item) => !item.mode || item.mode === SURFACE_MODE)
      nearbyFoodsClockRef.current -= delta
      if (
        nearbyFoodsClockRef.current <= 0 ||
        nearbyFoodsRef.current.length === 0 ||
        surfaceFoodPool.length <= foodWindowSize
      ) {
        nearbyFoodsRef.current = selectNearestFoods(surfaceFoodPool, head, foodWindowSize)
        nearbyFoodsClockRef.current = windowRecalcInterval
      }

      const nearbyFoods = nearbyFoodsRef.current
      const autopilotFoods = nearbyFoods.slice(0, lowSpec ? FOOD_AUTOPILOT_SIZE_LOW_SPEC : FOOD_AUTOPILOT_SIZE)
      const collisionFoods = nearbyFoods.slice(0, collisionScanSize)

      let nearestBodyDist = Infinity
      for (let i = SELF_COLLIDE_SEGMENT_SKIP; i < cachedSegments.length; i++) {
        const seg = cachedSegments[i]
        const d = greatCircleDistance(head.theta, head.phi, seg.theta, seg.phi)
        if (d < nearestBodyDist) nearestBodyDist = d
      }

      let nearestNavDist = Infinity
      for (const block of NAV_BLOCKS) {
        const d = greatCircleDistance(head.theta, head.phi, block.theta, block.phi)
        if (d < nearestNavDist) nearestNavDist = d
      }

      if (!autopilotRef.current) {
        const now = performance.now()
        const touchSteer = now < touchSteerUntilRef.current ? touchSteerRef.current : 0
        if (!touchSteer) touchSteerRef.current = 0
        const steerInput = touchSteer || ((keysDownRef.current.has('right') ? 1 : 0) - (keysDownRef.current.has('left') ? 1 : 0))
        heading -= steerInput * STEER_SPEED * delta
      } else {
        const now = performance.now()
        const cooldowns = targetCooldownsRef.current
        for (const [id, expiresAt] of cooldowns) {
          if (expiresAt <= now) cooldowns.delete(id)
        }

        const targetFood = chooseFoodTarget(autopilotFoods, head, bodyObstacles, {
          cooldowns,
          now,
          bodyUnsafeDist: Math.min(14, Math.max(1.4, segmentSpacing * 6.4)),
          heading,
          snakeScale: snakeScaleRef.current,
        })
        const targetFoodId = targetFood ? targetFood.id : null

        if (targetFoodIdRef.current !== targetFoodId) {
          targetFoodIdRef.current = targetFoodId
          astarPathRef.current = []
          astarRecalcRef.current = 0
          targetTrackRef.current = { id: targetFoodId, lastDistance: Infinity, stuckTime: 0 }
        }

        astarRecalcRef.current -= delta
        if (targetFood && (astarRecalcRef.current <= 0 || astarPathRef.current.length === 0)) {
          try {
            const navClearanceCells = snakeScaleRef.current <= 6 ? 7 : 6
            const bodyClearanceCells = snakeScaleRef.current <= 6
              ? 2
              : snakeScaleRef.current <= 36
                ? 3
                : 4
            const obstacles = [
              ...NAV_BLOCKS.map((block) => ({ theta: block.theta, phi: block.phi, clearanceCells: navClearanceCells })),
              ...bodyObstacles.map((pt) => ({ ...pt, clearanceCells: bodyClearanceCells })),
            ]
            const path = findPathAStar(
              head.theta,
              head.phi,
              targetFood.theta,
              targetFood.phi,
              obstacles
            )
            astarPathRef.current = path && path.length > 0 ? path : []
          } catch (error) {
            astarPathRef.current = [{ theta: targetFood.theta, phi: targetFood.phi }]
          }
          astarRecalcRef.current = AUTOPILOT_RECALC_INTERVAL
        }

        if (astarPathRef.current.length > 0) {
          const waypointSafetyDist = blockCollisionDist * NAV_WAYPOINT_SAFE_MULT
          while (astarPathRef.current.length > 0) {
            const waypoint = astarPathRef.current[0]
            const waypointUnsafe = NAV_BLOCKS.some((block) => (
              greatCircleDistance(waypoint.theta, waypoint.phi, block.theta, block.phi) < waypointSafetyDist
            ))
            if (!waypointUnsafe) break
            astarPathRef.current.shift()
          }

          const target = astarPathRef.current[0]
          if (target) {
            const dist = greatCircleDistance(head.theta, head.phi, target.theta, target.phi)
            if (dist < segmentSpacing * 2.8) {
              astarPathRef.current.shift()
            }

            if (astarPathRef.current.length > 0) {
              const waypoint = astarPathRef.current[0]
              const desiredHeading = headingToward(head.theta, head.phi, waypoint.theta, waypoint.phi)
              const diff = normalizeAngleDiff(desiredHeading - heading)
              if (Math.abs(diff) > AUTOPILOT_HARD_UTURN_ANGLE && snakeScaleRef.current > 6) {
                if (targetFood) cooldowns.set(targetFood.id, now + TARGET_COOLDOWN_MS)
                targetFoodIdRef.current = null
                astarPathRef.current = []
                astarRecalcRef.current = 0
              } else {
                const steerAmount = Math.sign(diff) * Math.min(Math.abs(diff), autopilotSteerSpeed * delta * 2.2)
                heading += steerAmount
              }
            }
          }
        }

        if (targetFood) {
          const targetDist = greatCircleDistance(head.theta, head.phi, targetFood.theta, targetFood.phi)
          const collectDist = computeFoodCollisionDistance(snakeScaleRef.current, targetFood.sizeRatio)
          const tracker = targetTrackRef.current
          if (tracker.id !== targetFood.id) {
            targetTrackRef.current = { id: targetFood.id, lastDistance: targetDist, stuckTime: 0 }
          } else if (targetDist > collectDist * 1.3) {
            const progress = tracker.lastDistance - targetDist
            if (progress < Math.max(STUCK_PROGRESS_EPS, segmentSpacing * 0.08)) {
              tracker.stuckTime += delta
            } else {
              tracker.stuckTime = Math.max(0, tracker.stuckTime - delta * 0.7)
            }
            tracker.lastDistance = targetDist
            if (tracker.stuckTime >= STUCK_TIMEOUT) {
              cooldowns.set(targetFood.id, now + TARGET_COOLDOWN_MS)
              targetFoodIdRef.current = null
              astarPathRef.current = []
              astarRecalcRef.current = 0
              targetTrackRef.current = { id: null, lastDistance: Infinity, stuckTime: 0 }
            }
          }
        }

        const autopilotCruiseFloor = dynVBase
        const autopilotEmergencyFloor = Math.max(dynVMin, dynVBase * 0.86)
        let emergencySteer = 0
        const navEmergencyDist = Math.max(
          blockCollisionDist * 2.9,
          speed * NAV_EMERGENCY_SPEED_FACTOR + NAV_EMERGENCY_MIN_EXTRA
        )
        const bodyEmergencyDist = Math.min(20, Math.max(3.2, segmentSpacing * 7))

        for (const block of NAV_BLOCKS) {
          const dangerDist = greatCircleDistance(head.theta, head.phi, block.theta, block.phi)
          if (dangerDist >= navEmergencyDist) continue

          const toward = headingToward(head.theta, head.phi, block.theta, block.phi)
          const diff = normalizeAngleDiff(toward - heading)
          if (Math.abs(diff) > Math.PI * 0.9) continue

          const urgency = 1 - dangerDist / navEmergencyDist
          emergencySteer += (diff > 0 ? -1 : 1) * urgency * autopilotSteerSpeed * delta * 5.4
        }

        for (const bodyPoint of bodyObstacles) {
          const dangerDist = greatCircleDistance(head.theta, head.phi, bodyPoint.theta, bodyPoint.phi)
          if (dangerDist >= bodyEmergencyDist) continue

          const toward = headingToward(head.theta, head.phi, bodyPoint.theta, bodyPoint.phi)
          const diff = normalizeAngleDiff(toward - heading)
          if (Math.abs(diff) > Math.PI * 0.84) continue

          const urgency = 1 - dangerDist / bodyEmergencyDist
          emergencySteer += (diff > 0 ? -1 : 1) * urgency * autopilotSteerSpeed * delta * 3.0
        }

        if (Math.abs(emergencySteer) > 0.0001) {
          heading += emergencySteer
          speed = Math.max(autopilotEmergencyFloor, speed - BRAKE_RATE * delta * 0.9)
          astarRecalcRef.current = 0
        }

        const lookaheadArc = Math.max(
          blockCollisionDist * 2.5,
          speed * NAV_LOOKAHEAD_SECONDS
        )
        let imminentRisk = false
        let avoidanceSteerScore = 0

        for (const ratio of NAV_LOOKAHEAD_SAMPLES) {
          const probe = moveOnSphere(head.theta, head.phi, heading, lookaheadArc * ratio)

          for (const block of NAV_BLOCKS) {
            const d = greatCircleDistance(probe.theta, probe.phi, block.theta, block.phi)
            const safetyDist = blockCollisionDist * (1.12 + (1 - ratio) * 0.16)
            if (d < safetyDist) {
              imminentRisk = true
              const toward = headingToward(probe.theta, probe.phi, block.theta, block.phi)
              const diff = normalizeAngleDiff(toward - heading)
              const urgency = 1 - d / Math.max(0.0001, safetyDist)
              avoidanceSteerScore += (diff > 0 ? -1 : 1) * urgency * 1.55
            }
          }

          for (let i = SELF_COLLIDE_SEGMENT_SKIP; i < cachedSegments.length; i++) {
            const seg = cachedSegments[i]
            const collisionDist = computeSelfCollisionDistance(0, i, snakeScaleRef.current) * 1.05
            const d = greatCircleDistance(probe.theta, probe.phi, seg.theta, seg.phi)
            if (d < collisionDist) {
              imminentRisk = true
              const toward = headingToward(probe.theta, probe.phi, seg.theta, seg.phi)
              const diff = normalizeAngleDiff(toward - heading)
              const urgency = 1 - d / Math.max(0.0001, collisionDist)
              avoidanceSteerScore += (diff > 0 ? -1 : 1) * urgency * 0.95
              break
            }
          }
        }

        if (imminentRisk) {
          const steerDir = Math.sign(avoidanceSteerScore || emergencySteer || 1)
          heading += steerDir * autopilotSteerSpeed * delta * 4.0
          speed = Math.max(autopilotEmergencyFloor, speed - BRAKE_RATE * delta * 2.8)
          astarPathRef.current = []
          astarRecalcRef.current = 0
        }

        const bodySlowdownThreshold = Math.min(18, segmentSpacing * 7.5)
        const navSlowdownThreshold = blockCollisionDist * 2.5
        if (nearestBodyDist < bodySlowdownThreshold || nearestNavDist < navSlowdownThreshold) {
          speed = Math.max(autopilotCruiseFloor, speed - BRAKE_RATE * delta * 1.25)
        }
      }

      speed = THREE.MathUtils.clamp(speed, dynVMin, dynVMax)
      speedRef.current = speed
      setCurrentSpeed(speed)

      const totalArcDist = speed * delta
      const maxSubstepArc = Math.max(0.15, segmentSpacing * 0.65)
      const substeps = Math.max(1, Math.ceil(totalArcDist / maxSubstepArc))
      const stepArc = totalArcDist / substeps
      let result = { theta: head.theta, phi: head.phi, heading }

      for (let i = 0; i < substeps; i++) {
        result = moveOnSphere(result.theta, result.phi, result.heading, stepArc)
        trailRef.current.unshift({ theta: result.theta, phi: result.phi, heading: result.heading })
      }

      headRef.current = { theta: result.theta, phi: result.phi }
      headingRef.current = result.heading
      gameplayCameraAnchorRef.current = computeHomeCameraAnchor(headRef.current, lowSpec ? 26 : zoomRef.current)

      const requiredTrailDist = segmentSpacing * Math.max(segCountRef.current + 2, 8)
      const roughSamplesPerUnit = 5.5
      const requiredByDensity = Math.ceil(requiredTrailDist * roughSamplesPerUnit)
      const sampleArcEstimate = Math.max(0.05, stepArc)
      const requiredByDistance = Math.ceil((requiredTrailDist / sampleArcEstimate) * 1.35)
      const dynamicTrailTarget = Math.max(requiredByDensity, requiredByDistance)
      const maxTrailLength = lowSpec
        ? Math.max(280, Math.min(3600, dynamicTrailTarget))
        : Math.max(6000, Math.min(60000, dynamicTrailTarget))
      if (trailRef.current.length > maxTrailLength) trailRef.current.length = maxTrailLength

      const segments = [{ theta: result.theta, phi: result.phi, heading: result.heading }]
      let trailIdx = 0
      let accumDist = 0
      for (let i = 1; i < segCountRef.current && trailIdx < trailRef.current.length - 1; i++) {
        const targetDist = i * segmentSpacing
        while (trailIdx < trailRef.current.length - 1 && accumDist < targetDist) {
          const a = trailRef.current[trailIdx]
          const b = trailRef.current[trailIdx + 1]
          const d = greatCircleDistance(a.theta, a.phi, b.theta, b.phi)
          if (d <= 0.00001) {
            trailIdx++
            continue
          }
          if (accumDist + d >= targetDist) {
            const t = (targetDist - accumDist) / d
            const theta = a.theta + (b.theta - a.theta) * t
            const phi = a.phi + (b.phi - a.phi) * t
            segments.push({ theta, phi, heading: b.heading })
            break
          }
          accumDist += d
          trailIdx += 1
        }
      }
      segmentsRef.current = segments

      const skipCount = Math.max(SELF_COLLIDE_SEGMENT_SKIP, Math.ceil(3 + Math.pow(snakeScaleRef.current, 0.18)))
      if (segments.length > skipCount + 1) {
        for (let si = skipCount; si < segments.length; si++) {
          const seg = segments[si]
          const d = greatCircleDistance(result.theta, result.phi, seg.theta, seg.phi)
          if (d < computeSelfCollisionDistance(0, si, snakeScaleRef.current)) {
            hardReset(true)
            syncRenderState({
              segments: segmentsRef.current,
              foods: foodsRef.current.slice(0, lowSpec ? FOOD_WINDOW_SIZE_LOW_SPEC : FOOD_WINDOW_SIZE),
              snakeScale: snakeScaleRef.current,
              locomotionMode: SURFACE_MODE,
              surfacePlanetTexture: surfacePlanetTextureRef.current,
              landedPlanetName: landedPlanetNameRef.current,
              flash: false,
              collidingBlockLabel: null,
            })
            return
          }
        }
      }

      for (const item of collisionFoods) {
        const foodDist = greatCircleDistance(result.theta, result.phi, item.theta, item.phi)
        const tunnelPadding = Math.min(segmentSpacing * 0.95, speed * delta * 0.7)
        const collectDist = computeFoodCollisionDistance(snakeScaleRef.current, item.sizeRatio) + tunnelPadding
        if (foodDist > collectDist) continue
        const outcome = consumeFood(item.id, item.basePoints)
        const nextState = useGameStore.getState()
        foodsRef.current = nextState.foods
        segCountRef.current = nextState.segmentCount
        snakeScaleRef.current = nextState.snakeScale
        astarPathRef.current = []
        astarRecalcRef.current = 0
        targetFoodIdRef.current = null
        targetTrackRef.current = { id: null, lastDistance: Infinity, stuckTime: 0 }
        nearbyFoodsClockRef.current = 0
        if (outcome?.evolved) {
          const keepTrail = Math.max(64, Math.floor(trailRef.current.length * (2 / 3)))
          trailRef.current = trailRef.current.slice(0, keepTrail)
        }
        break
      }

      foodSpawnClockRef.current += delta
      const spawnInterval = lowSpec ? FOOD_SPAWN_INTERVAL * 1.8 : FOOD_SPAWN_INTERVAL
      const maxFoodCount = lowSpec ? MAX_FOOD_COUNT_LOW_SPEC : MAX_FOOD_COUNT
      const spawnBudget = lowSpec ? MAX_FOOD_SPAWNS_PER_FRAME_LOW_SPEC : MAX_FOOD_SPAWNS_PER_FRAME
      if (foodsRef.current.length >= maxFoodCount) {
        foodSpawnClockRef.current = Math.min(foodSpawnClockRef.current, spawnInterval)
      }
      let spawnedThisFrame = 0
      while (
        foodSpawnClockRef.current >= spawnInterval &&
        foodsRef.current.length < maxFoodCount &&
        spawnedThisFrame < spawnBudget
      ) {
        foodSpawnClockRef.current -= spawnInterval
        const newFood = spawnSurfaceFood({
          snakeSegments: segments,
          foods: foodsRef.current,
          extraAvoid: [{ theta: result.theta, phi: result.phi }],
          snakeScale: snakeScaleRef.current,
        })
        if (newFood) {
          const nextFoods = [...foodsRef.current, newFood]
          foodsRef.current = nextFoods
          setFoods(nextFoods)
          spawnedThisFrame += 1
        }
      }
      if (spawnedThisFrame >= spawnBudget) {
        foodSpawnClockRef.current = Math.min(foodSpawnClockRef.current, spawnInterval * 2.5)
      }

      for (const block of NAV_BLOCKS) {
        const dist = greatCircleDistance(result.theta, result.phi, block.theta, block.phi)
        if (dist < blockCollisionDist) {
          collidingRef.current = true
          flashRef.current = false
          flashTimerRef.current = 0
          triggerCollision(block.label)
          if (collisionTimerRef.current) clearTimeout(collisionTimerRef.current)
          collisionTimerRef.current = setTimeout(() => {
            hardReset(true)
            clearCollision()
            collidingRef.current = false
            collisionTimerRef.current = null
            startSectionTransition(block.section, 'navBlock')
          }, 500)
          return
        }
      }

      syncRenderState({
        segments,
        foods: nearbyFoods,
        snakeScale: snakeScaleRef.current,
        locomotionMode: SURFACE_MODE,
        surfacePlanetTexture: surfacePlanetTextureRef.current,
        landedPlanetName: landedPlanetNameRef.current,
        flash: flashRef.current,
        collidingBlockLabel: collidingBlock,
      })
      return
    }

    const headPos = flightHeadRef.current.clone()
    const dir = flightDirRef.current.clone().normalize()
    let speed = flightSpeedRef.current
    const flightInput = touchFlightVecRef.current.until > performance.now()
      ? touchFlightVecRef.current
      : { x: 0, y: 0 }
    const inputX = Math.abs(flightInput.x) > 0.01
      ? flightInput.x
      : ((keysDownRef.current.has('right') ? 1 : 0) - (keysDownRef.current.has('left') ? 1 : 0))
    const inputY = Math.abs(flightInput.y) > 0.01
      ? flightInput.y
      : ((keysDownRef.current.has('accel') ? 1 : 0) - (keysDownRef.current.has('brake') ? 1 : 0))

    const worldUp = new THREE.Vector3(0, 1, 0)
    let rightAxis = new THREE.Vector3().crossVectors(dir, worldUp)
    if (rightAxis.lengthSq() < 0.001) {
      rightAxis = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(1, 0, 0))
    }
    rightAxis.normalize()
    const upAxis = new THREE.Vector3().crossVectors(rightAxis, dir).normalize()
    const desiredDir = dir
      .clone()
      .add(rightAxis.clone().multiplyScalar(inputX * SPACE_TURN_SPEED * delta))
      .add(upAxis.clone().multiplyScalar(inputY * SPACE_TURN_SPEED * delta))
      .normalize()
    dir.lerp(desiredDir, THREE.MathUtils.clamp(delta * SPACE_CONTROL_SMOOTH, 0, 1)).normalize()

    const spaceProfile = computeSnakeSpeedProfile(snakeScaleRef.current)
    const boostActive = keysDownRef.current.has('spaceBoost') || touchBoostActiveRef.current
    const boostedProfile = {
      vMin: spaceProfile.vMin,
      vBase: spaceProfile.vBase * (boostActive ? SPACE_BOOST_MULTIPLIER : 1),
      vMax: spaceProfile.vMax * (boostActive ? SPACE_BOOST_MULTIPLIER : 1.35),
    }
    speedProfileRef.current = boostedProfile
    setSpeedProfile(boostedProfile)
    if (boostActive) speed += ACCEL_RATE * 1.2 * delta
    else if (keysDownRef.current.has('brake')) speed -= BRAKE_RATE * delta
    else if (speed > boostedProfile.vBase) speed -= FRICTION * delta
    else if (speed < boostedProfile.vBase) speed += FRICTION * delta
    speed = THREE.MathUtils.clamp(speed, boostedProfile.vMin, boostedProfile.vMax)
    headPos.add(dir.clone().multiplyScalar(speed * delta))
    flightHeadRef.current = headPos
    flightDirRef.current = dir
    flightSpeedRef.current = speed
    speedRef.current = speed
    setCurrentSpeed(speed)

    const prevFlightSample = flightTrailRef.current[0]
    const prevSamplePos = prevFlightSample?.position
      ? new THREE.Vector3(...prevFlightSample.position)
      : null
    if (!prevSamplePos || prevSamplePos.distanceTo(headPos) >= SPACE_TRAIL_SAMPLE_DISTANCE) {
      flightTrailRef.current.unshift({ position: [headPos.x, headPos.y, headPos.z], direction: [dir.x, dir.y, dir.z] })
    } else {
      flightTrailRef.current[0] = { position: [headPos.x, headPos.y, headPos.z], direction: [dir.x, dir.y, dir.z] }
    }
    if (flightTrailRef.current.length > 2400) flightTrailRef.current.length = 2400

    const spaceSegments = flightTrailRef.current
      .slice(0, Math.max(segCountRef.current * 12, 24))
      .filter((_, index) => index % 12 === 0)
      .slice(0, segCountRef.current)
      .map((item) => ({ ...item, mode: SPACE_MODE }))
    segmentsRef.current = spaceSegments

    const spaceFoods = foodsRef.current.filter((item) => item.mode === SPACE_MODE)
    for (const item of spaceFoods) {
      const foodPos = new THREE.Vector3(...item.position)
      if (headPos.distanceTo(foodPos) > computeFoodCollisionDistance(snakeScaleRef.current, item.sizeRatio) * 1.2) continue
      const outcome = consumeFood(item.id, item.basePoints)
      const nextState = useGameStore.getState()
      foodsRef.current = nextState.foods
      segCountRef.current = nextState.segmentCount
      snakeScaleRef.current = nextState.snakeScale
      if (outcome?.evolved) {
        flightTrailRef.current = flightTrailRef.current.slice(0, Math.max(42, Math.floor(flightTrailRef.current.length * (2 / 3))))
      }
      break
    }

    foodSpawnClockRef.current += delta
    const maxFoodCount = lowSpec ? SPACE_MAX_FOOD_COUNT_LOW_SPEC : SPACE_MAX_FOOD_COUNT
    const spawnBudget = lowSpec ? MAX_FOOD_SPAWNS_PER_FRAME_LOW_SPEC : MAX_FOOD_SPAWNS_PER_FRAME
    let spawnedThisFrame = 0
    while (foodSpawnClockRef.current >= SPACE_FOOD_SPAWN_INTERVAL && foodsRef.current.length < maxFoodCount && spawnedThisFrame < spawnBudget) {
      foodSpawnClockRef.current -= SPACE_FOOD_SPAWN_INTERVAL
      const newFood = spawnSpaceFood({ foods: foodsRef.current, snakeScale: snakeScaleRef.current })
      if (newFood) {
        const nextFoods = [...foodsRef.current, newFood]
        foodsRef.current = nextFoods
        setFoods(nextFoods)
        spawnedThisFrame += 1
      }
    }

    for (const planet of gameplayPlanets) {
      const planetPos = new THREE.Vector3(...planet.position)
      if (headPos.distanceTo(planetPos) <= planet.radius + Math.max(3, snakeScaleRef.current * 0.35)) {
        landOnPlanet(planet)
        break
      }
    }

    let camUpDir = new THREE.Vector3().crossVectors(rightAxis, dir).normalize()
    const camDistance = Math.max(24, Math.min(SPACE_ZOOM_MAX, spaceZoomRef.current))
    const camBack = dir.clone().multiplyScalar(-camDistance)
    const camUpOffset = camUpDir.multiplyScalar(SPACE_CAMERA_HEIGHT)
    const lookTarget = headPos.clone().add(dir.clone().multiplyScalar(SPACE_CAMERA_LOOKAHEAD))
    gameplayCameraAnchorRef.current = [
      headPos.x + camBack.x + camUpOffset.x,
      headPos.y + camBack.y + camUpOffset.y,
      headPos.z + camBack.z + camUpOffset.z,
    ]
    cameraLookTargetRef.current = [lookTarget.x, lookTarget.y, lookTarget.z]

    syncRenderState({
      segments: spaceSegments,
      foods: spaceFoods.slice(0, lowSpec ? 48 : 120),
      snakeScale: snakeScaleRef.current,
      locomotionMode: SPACE_MODE,
      surfacePlanetTexture: surfacePlanetTextureRef.current,
      landedPlanetName: landedPlanetNameRef.current,
      flash: false,
      collidingBlockLabel: null,
    })
  })

  const destinationSection = gameplayState === 'sectionViewing'
    ? currentSection
    : (gameplayState === 'transitioning' && transitionPhase === 'arrival' ? targetSection : null)
  const destinationZone = destinationSection && destinationSection !== 'home' ? contentZonesById[destinationSection] : null
  const destinationOrbit = destinationZone?.orbitCamera || destinationZone?.arrivalCamera || HOME_HUB.orbitCamera
  const selectedFocusAnchor = destinationZone && selectedSectionItem
    ? (destinationZone.focusTargets.find((item) => item.id === selectedSectionItem)?.position || null)
    : null


  const onSectionSelect = useCallback((id) => {
    if (!id) return
    if (selectedSectionItem === id) {
      unfocusSectionItem()
      return
    }
    focusSectionItem(id)
    setCameraMode('sectionFocus')
  }, [focusSectionItem, selectedSectionItem, setCameraMode, unfocusSectionItem])

  const currentTransition = currentTransitionRef.current || getSectionTransition(currentSection || 'home', targetSection || 'home')

  return (
    <>
      {!lowSpec && <UniverseBackdrop />}
      {!lowSpec && <DistantPlanetField planets={gameplayPlanets} />}
      {!lowSpec && renderState.locomotionMode === SPACE_MODE && (
        <GameplayPlanetField planets={gameplayPlanets} />
      )}

      <ambientLight intensity={0.16} />
      <pointLight position={[0, 60, 0]} intensity={0.8} color="#00F0FF" distance={120} />
      <pointLight position={[-50, 30, -50]} intensity={0.5} color="#FF0055" distance={100} />
      <pointLight position={[50, 30, 50]} intensity={0.5} color="#ADFF00" distance={100} />
      <pointLight position={[0, -60, 0]} intensity={0.3} color="#00F0FF" distance={100} />

      <CameraRig
        mode={cameraMode}
        transitionPhase={transitionPhase}
        transitionProgress={transitionProgress}
        reducedMotion={reducedMotion}
        gameplayAnchor={gameplayCameraAnchorRef.current}
        homeReturnAnchor={HOME_HUB.arrivalCamera}
        destinationAnchor={destinationZone?.anchorPosition || HOME_HUB.anchorPosition}
        destinationOrbit={destinationOrbit}
        focusAnchor={selectedFocusAnchor}
        gameplayLookTarget={cameraLookTargetRef.current}
        locomotionMode={renderState.locomotionMode}
        orbitYaw={sectionOrbitYawRef.current}
        orbitPitch={sectionOrbitPitchRef.current}
        orbitDistance={sectionOrbitDistanceRef.current}
      />
      <TransitionEffects
        cameraMode={cameraMode}
        transitionPhase={transitionPhase}
        transitionProgress={transitionProgress}
        warpIntensity={currentTransition?.warpIntensity || 0}
      />

      {renderState.locomotionMode === SPACE_MODE ? (
        <SpaceCenterPlanet textureUrl={renderState.surfacePlanetTexture || earthTextureUrl} lowSpec={lowSpec} />
      ) : (
        <SurfacePlanet
          textureUrl={renderState.surfacePlanetTexture || earthTextureUrl}
          lowSpec={lowSpec}
          classicEarth={!hasLeftEarth && (renderState.surfacePlanetTexture || earthTextureUrl) === earthTextureUrl}
          lineOpacity={hasLeftEarth ? 0.08 : 0.04}
          torusOpacity={hasLeftEarth ? 0.16 : 0.12}
          dimTexture={hasLeftEarth}
        />
      )}

      {renderState.segments.map((seg, index) => (
        <SnakeSegment
          key={index}
          theta={seg.theta}
          phi={seg.phi}
          heading={seg.heading}
          position={seg.position}
          direction={seg.direction}
          index={index}
          isHead={index === 0}
          flash={renderState.flash}
          snakeScale={renderState.snakeScale}
          lowSpec={lowSpec}
        />
      ))}

      {renderState.foods.map((item) => (
        <FoodItem key={item.id} food={item} snakeScale={renderState.snakeScale} lowSpec={lowSpec} />
      ))}

      {renderState.locomotionMode === SURFACE_MODE &&
        renderState.landedPlanetName === 'Earth' &&
        (currentSection === 'home' || targetSection === 'home') &&
        NAV_BLOCKS.map((block) => (
          <NavBlock
            key={block.label}
            label={block.label}
            path={block.section}
            theta={block.theta}
            phi={block.phi}
            color={block.color}
            onClick={handleNavBlockClick}
            flash={renderState.flash && renderState.collidingBlockLabel === block.label}
          />
        ))}

      <SectionScene section={destinationSection} selectedItem={selectedSectionItem} onSelect={onSectionSelect} />
    </>
  )
}
