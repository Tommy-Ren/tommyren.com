import { useRef, useMemo, useCallback, useEffect, useState } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import useGameStore from '../store/gameStore'
import {
  sphericalToCartesian,
  getOrientationOnSphere,
  moveOnSphere,
  greatCircleDistance,
  randomSpherePoint,
  findPathAStar,
  headingToward,
} from '../utils/sphereMath'
import earthTextureUrl from '../assets/planets/earth.jpg'
import earthNightTextureUrl from '../assets/planets/earth_night.jpg'
import earthLowTextureUrl from '../assets/planets/low/earth_low.jpg'
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

const SPHERE_RADIUS = 40
const STEER_SPEED = 2.5
const BASE_SEGMENT_SPACING = 1.25 / 6
const BASE_FOOD_COLLECT_DIST = 4.0 / 6
const BASE_BLOCK_COLLECT_DIST = 2.75
const TRAIL_LENGTH = 600 // increased for longer snake + bigger world
const BASE_SNAKE_SIZE_MULT = 0.68 / 6
const FOOD_SPAWN_INTERVAL = 1.65
const FOOD_INITIAL_COUNT = 12
const FOOD_MAX_SPAWN_ATTEMPTS = 5
const FOOD_MIN_SPAWN_DIST = 1.6
const FOOD_NAV_SAFE_RADIUS = BASE_BLOCK_COLLECT_DIST + 1.9
const FOOD_FOOD_SAFE_RADIUS = 1.2
const MAX_FOOD_COUNT = Number.POSITIVE_INFINITY
const MAX_FOOD_COUNT_LOW_SPEC = 64
const FOOD_SCALE_EXP = 0.18
const FOOD_COLLISION_SCALE_EXP = 0.16
const SPEED_GROWTH_LOG_FACTOR = 0.18
const SPEED_GROWTH_MAX_MULT = 2.4
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
const MAX_FRAME_DELTA = 0.05
const FOOD_WINDOW_RECALC_INTERVAL = 0.22
const FOOD_WINDOW_SIZE = 180
const FOOD_WINDOW_SIZE_LOW_SPEC = 64
const FOOD_AUTOPILOT_SIZE = 120
const FOOD_AUTOPILOT_SIZE_LOW_SPEC = 40
const FOOD_COLLISION_SIZE = 72
const FOOD_COLLISION_SIZE_LOW_SPEC = 24
const MAX_FOOD_SPAWNS_PER_FRAME = 2
const MAX_FOOD_SPAWNS_PER_FRAME_LOW_SPEC = 1

// Physics speed constants
const V_BASE = 5.0625
const V_MAX = 20.25
const V_MIN = 2.25
const ACCEL_RATE = 14.0
const BRAKE_RATE = 10.0
const FRICTION = 5.0

// Camera offset — higher for the bigger sphere
const CAM_ELEVATION = 30

// Overlay zoom distance (how far camera pulls back when overlay is open)
const OVERLAY_ZOOM = 55
const ZOOM_MIN = 0.000001
const ZOOM_WHEEL_EXP = 0.0016
const AUTOPILOT_RECALC_INTERVAL = 0.1
const SELF_COLLIDE_SEGMENT_SKIP = 4

const FOOD_VARIANTS = [
  { kind: 'small', weight: 0.56, basePoints: 1, sizeRatio: 0.58, color: '#44d8ff' },
  { kind: 'medium', weight: 0.29, basePoints: 5, sizeRatio: 1.0, color: '#a7ff3f' },
  { kind: 'large', weight: 0.15, basePoints: 10, sizeRatio: 1.52, color: '#ff8e3b' },
]

const NAV_BLOCKS = [
  { label: 'Resume', overlay: 'resume', theta: Math.PI * 0.3, phi: 0, color: '#FF0055' },
  { label: 'About Me', overlay: 'about', theta: Math.PI * 0.3, phi: Math.PI * 0.8, color: '#FF0055' },
  { label: 'Portfolio', overlay: 'projects', theta: Math.PI * 0.7, phi: Math.PI * 0.4, color: '#FF0055' },
  { label: 'Projects', overlay: 'projects', theta: Math.PI * 0.7, phi: Math.PI * 1.2, color: '#FF0055' },
  { label: 'Contact', overlay: 'contact', theta: Math.PI * 0.5, phi: Math.PI * 1.6, color: '#FF0055' },
]

const PLANET_LIBRARY = [
  { name: 'Sun', textureUrl: sunTextureUrl, hasRing: false, isStar: true },
  { name: 'Mercury', textureUrl: mercuryTextureUrl, hasRing: false },
  { name: 'Venus', textureUrl: venusTextureUrl, hasRing: false },
  { name: 'Earth', textureUrl: earthTextureUrl, hasRing: false },
  { name: 'Earth Night', textureUrl: earthNightTextureUrl, hasRing: false },
  { name: 'Moon', textureUrl: moonTextureUrl, hasRing: false },
  { name: 'Mars', textureUrl: marsTextureUrl, hasRing: false },
  { name: 'Ceres', textureUrl: ceresTextureUrl, hasRing: false },
  { name: 'Jupiter', textureUrl: jupiterTextureUrl, hasRing: false },
  { name: 'Saturn', textureUrl: saturnTextureUrl, hasRing: true },
  { name: 'Haumea', textureUrl: haumeaTextureUrl, hasRing: false },
  { name: 'Makemake', textureUrl: makemakeTextureUrl, hasRing: false },
  { name: 'Eris', textureUrl: erisTextureUrl, hasRing: false },
]

const PLANET_DIST_MIN = 38000
const PLANET_DIST_MAX = 150000
const PLANET_GAP = 2800
const PLANET_SIZE_MIN_MULT = 2
const PLANET_SIZE_MAX_MULT = 200

function randRange(min, max) {
  return min + Math.random() * (max - min)
}

function normalizeAngleDiff(angle) {
  let next = angle
  while (next > Math.PI) next -= Math.PI * 2
  while (next < -Math.PI) next += Math.PI * 2
  return next
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

function createFoodId() {
  return `food-${Date.now()}-${Math.round(Math.random() * 1e9)}`
}

function spawnFood({ snakeSegments = [], foods = [], extraAvoid = [], snakeScale = 1 } = {}) {
  const avoidanceScale = Math.pow(Math.max(1, snakeScale), 0.34)
  const snakeAvoidDist = Math.max(
    FOOD_MIN_SPAWN_DIST,
    BASE_SNAKE_SIZE_MULT * avoidanceScale * 2.6
  )

  for (let attempt = 0; attempt < FOOD_MAX_SPAWN_ATTEMPTS; attempt++) {
    const variant = pickFoodVariant()
    const point = randomSpherePoint([], 0)
    if (!point) continue

    let isBlocked = false

    for (const block of NAV_BLOCKS) {
      if (greatCircleDistance(point.theta, point.phi, block.theta, block.phi) < FOOD_NAV_SAFE_RADIUS) {
        isBlocked = true
        break
      }
    }
    if (isBlocked) continue

    for (const seg of snakeSegments) {
      if (greatCircleDistance(point.theta, point.phi, seg.theta, seg.phi) < snakeAvoidDist) {
        isBlocked = true
        break
      }
    }
    if (isBlocked) continue

    for (const existingFood of foods) {
      if (greatCircleDistance(point.theta, point.phi, existingFood.theta, existingFood.phi) < FOOD_FOOD_SAFE_RADIUS) {
        isBlocked = true
        break
      }
    }
    if (isBlocked) continue

    for (const extra of extraAvoid) {
      if (greatCircleDistance(point.theta, point.phi, extra.theta, extra.phi) < FOOD_MIN_SPAWN_DIST) {
        isBlocked = true
        break
      }
    }
    if (isBlocked) continue

    return {
      id: createFoodId(),
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

function computeSnakeSpeedProfile(snakeScale) {
  const scale = Math.max(1, snakeScale)
  const growth = 1 + SPEED_GROWTH_LOG_FACTOR * Math.log2(scale)
  const multiplier = THREE.MathUtils.clamp(growth, 1, SPEED_GROWTH_MAX_MULT)
  const vBase = V_BASE * multiplier
  const vMax = V_MAX * multiplier
  const vMin = V_MIN * multiplier
  return { vMin, vBase, vMax }
}

function computeFoodScaleFactor(snakeScale, exponent = FOOD_SCALE_EXP) {
  return Math.pow(Math.max(1, snakeScale), exponent)
}

function computeSegmentRadius(index, snakeScale) {
  const baseScale = index === 0 ? 1.14 : Math.max(0.5, 0.96 - index * 0.012)
  return baseScale * BASE_SNAKE_SIZE_MULT * snakeScale
}

function computeSelfCollisionDistance(headIndex, bodyIndex, snakeScale) {
  const headRadius = computeSegmentRadius(headIndex, snakeScale)
  const bodyRadius = computeSegmentRadius(bodyIndex, snakeScale)
  return Math.max(0.11, (headRadius + bodyRadius) * 0.9)
}

function computeBlockCollisionDistance(snakeScale) {
  const scaleFactor = Math.pow(Math.max(1, snakeScale), 0.22)
  return BASE_BLOCK_COLLECT_DIST * scaleFactor
}

function chordToArcDistance(chordLength, sphereRadius = SPHERE_RADIUS) {
  const safeRatio = THREE.MathUtils.clamp(chordLength / (2 * sphereRadius), 0, 1)
  return 2 * sphereRadius * Math.asin(safeRatio)
}

function computeFoodCollisionDistance(snakeScale, foodSizeRatio) {
  const headRadius = computeSegmentRadius(0, snakeScale)
  const foodRadius = computeFoodRenderRadius(snakeScale, foodSizeRatio)
  const touchChord = (headRadius + foodRadius) * 0.96
  const visualTouchDist = chordToArcDistance(touchChord)
  const legacyDist = BASE_FOOD_COLLECT_DIST
    * computeFoodScaleFactor(snakeScale, FOOD_COLLISION_SCALE_EXP)
    * Math.max(0.6, foodSizeRatio)
  return Math.max(legacyDist, visualTouchDist)
}

function computeFoodRenderRadius(snakeScale, foodSizeRatio) {
  const growth = computeFoodScaleFactor(snakeScale, FOOD_SCALE_EXP)
  return BASE_SNAKE_SIZE_MULT * growth * foodSizeRatio
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

function sampleBodyObstacles(segments) {
  const sampled = []
  if (!segments || segments.length <= 8) return sampled
  for (let i = 8; i < segments.length; i += 2) {
    const seg = segments[i]
    sampled.push({ theta: seg.theta, phi: seg.phi, clearanceCells: 2 })
  }
  return sampled
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
    // All items were on cooldown, fallback to nearest item by raw utility.
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

  // Prefer food away from nav blocks to avoid sharp near-nav turns.
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

function makeFibonacciDirections(count) {
  const dirs = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1 || 1)) * 2
    const radius = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i
    dirs.push(new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius))
  }
  return dirs
}

function shuffleArray(items) {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function createRandomPlanetLayout() {
  const earthReferenceRadius = SPHERE_RADIUS
  const directions = shuffleArray(makeFibonacciDirections(PLANET_LIBRARY.length))
  const placed = []

  return PLANET_LIBRARY.map((planet, i) => {
    const direction = directions[i]
    const radius = earthReferenceRadius * randRange(PLANET_SIZE_MIN_MULT, PLANET_SIZE_MAX_MULT)

    let distance = THREE.MathUtils.lerp(
      PLANET_DIST_MIN,
      PLANET_DIST_MAX,
      i / (PLANET_LIBRARY.length - 1 || 1)
    )
    distance += randRange(-7000, 7000)
    distance = Math.max(PLANET_DIST_MIN, distance)

    let position = direction.clone().multiplyScalar(distance)

    for (let attempt = 0; attempt < 240; attempt++) {
      let overlap = false
      for (const existing of placed) {
        const minDist = existing.radius + radius + PLANET_GAP
        const currentDist = position.distanceTo(existing.position)
        if (currentDist < minDist) {
          const pushOut = minDist - currentDist + randRange(200, 900)
          position = direction.clone().multiplyScalar(position.length() + pushOut)
          overlap = true
          break
        }
      }
      if (!overlap) break
    }

    placed.push({ position, radius })

    return {
      ...planet,
      position: [position.x, position.y, position.z],
      radius,
      axialTiltDeg: randRange(0, 180),
      spinSpeed: randRange(0.0007, 0.0038) * (Math.random() < 0.5 ? -1 : 1),
      ring: planet.hasRing,
      ringTilt: THREE.MathUtils.degToRad(randRange(8, 72)),
      initialRotation: [
        randRange(0, Math.PI * 2),
        randRange(0, Math.PI * 2),
        randRange(0, Math.PI * 2),
      ],
    }
  })
}

function useConfiguredTexture(textureUrl, { lowSpec = false } = {}) {
  const texture = useLoader(THREE.TextureLoader, textureUrl)
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = lowSpec ? 1 : 8
    texture.minFilter = lowSpec ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = !lowSpec
    texture.needsUpdate = true
  }, [texture, lowSpec])
  return texture
}

function buildStarLayer(count, minRadius, maxRadius, whiteMix = 0) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const white = new THREE.Color('#ffffff')

  for (let i = 0; i < count; i++) {
    const idx = i * 3
    const u = Math.random()
    const v = Math.random()
    const theta = Math.acos(2 * u - 1)
    const phi = 2 * Math.PI * v
    const radius = THREE.MathUtils.lerp(minRadius, maxRadius, Math.pow(Math.random(), 0.35))

    const sinTheta = Math.sin(theta)
    positions[idx] = radius * sinTheta * Math.cos(phi)
    positions[idx + 1] = radius * Math.cos(theta)
    positions[idx + 2] = radius * sinTheta * Math.sin(phi)

    const r = Math.random()
    const color = new THREE.Color(
      r < 0.75 ? 0.72 + Math.random() * 0.28 : 0.58 + Math.random() * 0.42,
      0.76 + Math.random() * 0.24,
      0.9 + Math.random() * 0.1
    ).lerp(white, whiteMix)

    colors[idx] = color.r
    colors[idx + 1] = color.g
    colors[idx + 2] = color.b
  }

  return { positions, colors }
}

function StarLayer({ count, minRadius, maxRadius, size, opacity, spinSpeed, whiteMix = 0 }) {
  const ref = useRef()
  const layer = useMemo(
    () => buildStarLayer(count, minRadius, maxRadius, whiteMix),
    [count, minRadius, maxRadius, whiteMix]
  )

  useFrame((_, delta) => {
    if (ref.current && spinSpeed) {
      ref.current.rotation.y += delta * spinSpeed
    }
  })

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={layer.positions}
          count={layer.positions.length / 3}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={layer.colors}
          count={layer.colors.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        sizeAttenuation
        vertexColors
        transparent
        opacity={opacity}
        depthWrite={false}
        depthTest={true}
        fog={false}
      />
    </points>
  )
}

function UniverseBackdrop() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[360000, 48, 48]} />
        <meshBasicMaterial
          color="#041235"
          side={THREE.BackSide}
          fog={false}
          depthWrite={false}
          depthTest={true}
        />
      </mesh>
      <StarLayer
        count={7600}
        minRadius={8000}
        maxRadius={335000}
        size={9.5}
        opacity={0.82}
        spinSpeed={0.00006}
      />
      <StarLayer
        count={520}
        minRadius={12000}
        maxRadius={325000}
        size={18}
        opacity={0.95}
        spinSpeed={-0.00008}
        whiteMix={0.22}
      />
    </group>
  )
}

function DistantPlanet({
  textureUrl,
  position,
  radius,
  spinSpeed = 0,
  ring = false,
  ringTilt = 0,
  axialTiltDeg = 0,
  isStar = false,
  initialRotation = [0, 0, 0],
}) {
  const ref = useRef()
  const texture = useConfiguredTexture(textureUrl)
  const axialTilt = THREE.MathUtils.degToRad(axialTiltDeg)
  const effectiveRingTilt = ringTilt || axialTilt

  useFrame((_, delta) => {
    if (ref.current && spinSpeed) {
      ref.current.rotation.y += delta * spinSpeed
    }
  })

  return (
    <group position={position} rotation={initialRotation}>
      <group rotation={[0, 0, axialTilt]}>
        <mesh ref={ref}>
          <sphereGeometry args={[radius, 48, 48]} />
          {isStar ? (
            <meshBasicMaterial map={texture} color="#ffe9be" fog={false} />
          ) : (
            <meshBasicMaterial
              map={texture}
              color="#ffffff"
              fog={false}
            />
          )}
        </mesh>
        {ring && (
          <mesh rotation={[Math.PI / 2.4, effectiveRingTilt, 0]}>
            <torusGeometry args={[radius * 1.5, radius * 0.12, 2, 120]} />
            <meshBasicMaterial color="#d9e3ff" transparent opacity={0.35} fog={false} />
          </mesh>
        )}
      </group>
    </group>
  )
}

function DistantPlanetField() {
  const randomLayout = useMemo(() => createRandomPlanetLayout(), [])

  return (
    <group>
      {randomLayout.map((planet, i) => (
        <DistantPlanet key={i} {...planet} />
      ))}
    </group>
  )
}

/* ── Globe wireframe ── */
function GlobeFull() {
  const earthTexture = useConfiguredTexture(earthTextureUrl, { lowSpec: false })
  const earthNightTexture = useConfiguredTexture(earthNightTextureUrl, { lowSpec: false })

  return (
    <group>
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS - 0.05, 96, 96]} />
        <meshStandardMaterial
          map={earthTexture}
          emissiveMap={earthNightTexture}
          color="#ffffff"
          roughness={0.88}
          metalness={0.03}
          emissive="#8aa6ff"
          emissiveIntensity={0.32}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, 42, 42]} />
        <meshBasicMaterial color="#00F0FF" wireframe transparent opacity={0.04} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[SPHERE_RADIUS + 0.02, 0.04, 8, 220]} />
        <meshBasicMaterial color="#00F0FF" transparent opacity={0.12} />
      </mesh>
    </group>
  )
}

function GlobeLow() {
  const earthTexture = useConfiguredTexture(earthLowTextureUrl, { lowSpec: true })

  return (
    <group>
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS - 0.05, 28, 28]} />
        <meshStandardMaterial
          map={earthTexture}
          color="#ffffff"
          roughness={0.92}
          metalness={0.02}
          emissive="#1a2b46"
          emissiveIntensity={0.12}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, 20, 20]} />
        <meshBasicMaterial color="#00F0FF" wireframe transparent opacity={0.05} />
      </mesh>
    </group>
  )
}

/* ── Snake segment on sphere ── */
function SnakeSegment({ theta, phi, heading, index, isHead, flash, snakeScale = 1, lowSpec = false }) {
  const orient = useMemo(
    () => getOrientationOnSphere(theta, phi, heading),
    [theta, phi, heading]
  )
  const baseColor = isHead ? '#00F0FF' : '#00C8DD'
  const emissiveColor = isHead ? '#00F0FF' : '#008899'
  const intensity = isHead ? 3.2 : Math.max(0.35, 1.35 - index * 0.03)
  const opacity = Math.max(0.3, 1 - index * 0.02)
  const baseScale = isHead ? 1.14 : Math.max(0.5, 0.96 - index * 0.012)
  const scale = baseScale * BASE_SNAKE_SIZE_MULT * snakeScale

  return (
    <mesh position={orient.position} quaternion={orient.quaternion}>
      <sphereGeometry args={[scale, lowSpec ? 5 : 9, lowSpec ? 5 : 9]} />
      <meshStandardMaterial
        color={flash ? '#FFFFFF' : baseColor}
        emissive={flash ? '#FFFFFF' : emissiveColor}
        emissiveIntensity={flash ? 5 : intensity}
        transparent
        opacity={opacity}
      />
    </mesh>
  )
}

/* ── Food on sphere ── */
function FoodItem({ food, snakeScale = 1, lowSpec = false }) {
  const ref = useRef()
  const { theta, phi, color = '#ADFF00', sizeRatio = 1 } = food
  const baseOrient = useMemo(
    () => getOrientationOnSphere(theta, phi),
    [theta, phi]
  )

  const scaledSize = computeFoodRenderRadius(snakeScale, sizeRatio)

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 2.4
      const normal = baseOrient.position.clone().normalize()
      const bob = Math.sin(Date.now() * 0.0037 + phi * 3.2) * (0.22 + scaledSize * 0.08)
      ref.current.position.copy(
        baseOrient.position.clone().add(normal.multiplyScalar(0.26 + scaledSize * 0.95 + bob))
      )
    }
  })

  return (
    <mesh ref={ref} position={baseOrient.position} quaternion={baseOrient.quaternion}>
      <octahedronGeometry args={[scaledSize, lowSpec ? 0 : 1]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2.6}
        transparent opacity={0.9}
      />
    </mesh>
  )
}

/* ── Nav Block on sphere ── */
function NavBlock({ label, path, theta, phi, color, onClick, flash }) {
  const ref = useRef()
  const hovered = useRef(false)
  const orient = useMemo(
    () => getOrientationOnSphere(theta, phi),
    [theta, phi]
  )
  useFrame((_, delta) => {
    if (ref.current) {
      const normal = orient.position.clone().normalize()
      const bob = Math.sin(Date.now() * 0.002 + phi) * 0.3
      ref.current.position.copy(
        orient.position.clone().add(normal.multiplyScalar(bob + 2.0))
      )
      const targetScale = hovered.current ? 1.15 : 1
      ref.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5)
    }
  })
  const displayColor = flash ? '#FFFFFF' : color
  return (
    <group
      ref={ref} position={orient.position} quaternion={orient.quaternion}
      onClick={(e) => { e.stopPropagation(); onClick(path) }}
      onPointerOver={() => { hovered.current = true; document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { hovered.current = false; document.body.style.cursor = 'default' }}
    >
      <mesh>
        <boxGeometry args={[5, 3.5, 5]} />
        <meshStandardMaterial
          color={displayColor} emissive={displayColor}
          emissiveIntensity={flash ? 4 : 0.8} transparent opacity={flash ? 0.8 : 0.25}
        />
      </mesh>
      <mesh>
        <boxGeometry args={[5, 3.5, 5]} />
        <meshStandardMaterial
          color={displayColor} emissive={displayColor}
          emissiveIntensity={flash ? 5 : 1.5} wireframe transparent opacity={0.6}
        />
      </mesh>
      <sprite position={[0, 3.5, 0]} scale={[8, 2, 1]}>
        <spriteMaterial map={createTextTexture(label)} transparent depthTest={false} />
      </sprite>
    </group>
  )
}

/* ── Text texture helper ── */
const textureCache = {}
function createTextTexture(text) {
  if (textureCache[text]) return textureCache[text]
  const canvas = document.createElement('canvas')
  canvas.width = 512; canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 512, 128)
  ctx.font = 'bold 48px Orbitron, sans-serif'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = '#FF0055'; ctx.shadowColor = '#FF0055'; ctx.shadowBlur = 20
  ctx.fillText(text.toUpperCase(), 256, 64)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  textureCache[text] = texture
  return texture
}

/* ── Main Game Scene ── */
export default function GameScene({ lowSpec = false }) {
  const {
    autopilot, colliding, collidingBlock,
    foods, segmentCount, snakeScale,
    recordInput,
    checkIdleResume, setFoods, consumeFood,
    triggerCollision, clearCollision, resetGame,
    setCurrentSpeed, setSpeedProfile, vBase, vMax, vMin,
    activeOverlay, setActiveOverlay,
  } = useGameStore()

  // Refs for real-time game loop
  const headRef = useRef({ theta: Math.PI / 2, phi: 0 })
  const headingRef = useRef(0)
  const trailRef = useRef([])
  const segmentsRef = useRef([{ theta: Math.PI / 2, phi: 0, heading: 0 }])
  const segCountRef = useRef(segmentCount)
  const snakeScaleRef = useRef(snakeScale)
  const foodsRef = useRef(foods)
  const autopilotRef = useRef(autopilot)
  const collidingRef = useRef(false)
  const collisionTimerRef = useRef(null)
  const astarPathRef = useRef([])
  const astarRecalcRef = useRef(0)
  const targetFoodIdRef = useRef(null)
  const flashRef = useRef(false)
  const flashTimerRef = useRef(0)
  const speedRef = useRef(vBase)
  const speedProfileRef = useRef({ vMin, vBase, vMax })
  const zoomRef = useRef(CAM_ELEVATION)
  const touchSteerRef = useRef(0)
  const touchSteerUntilRef = useRef(0)
  const foodSpawnClockRef = useRef(0)
  const targetCooldownsRef = useRef(new Map())
  const targetTrackRef = useRef({ id: null, lastDistance: Infinity, stuckTime: 0 })
  const nearbyFoodsRef = useRef(foods)
  const nearbyFoodsClockRef = useRef(0)

  const seedFoodField = useCallback((headPoint = headRef.current, snakeSegments = segmentsRef.current) => {
    const maxFoodCount = lowSpec ? MAX_FOOD_COUNT_LOW_SPEC : MAX_FOOD_COUNT
    const initialCountRaw = lowSpec ? Math.max(4, Math.floor(FOOD_INITIAL_COUNT / 2)) : FOOD_INITIAL_COUNT
    const initialCount = Math.min(initialCountRaw, maxFoodCount)
    const nextFoods = []
    const spawnBody = snakeSegments?.length ? snakeSegments : [headPoint]

    for (let i = 0; i < initialCount; i++) {
      const item = spawnFood({
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

    if (respawnFoods) {
      seedFoodField(headRef.current, segmentsRef.current)
    } else {
      foodsRef.current = []
      setFoods([])
    }
  }, [resetGame, seedFoodField, setCurrentSpeed, setFoods, setSpeedProfile])

  // Sync refs with store
  useEffect(() => { autopilotRef.current = autopilot }, [autopilot])
  useEffect(() => { segCountRef.current = segmentCount }, [segmentCount])
  useEffect(() => { snakeScaleRef.current = snakeScale }, [snakeScale])
  useEffect(() => {
    foodsRef.current = foods
    nearbyFoodsRef.current = foods
    nearbyFoodsClockRef.current = 0
  }, [foods])
  useEffect(() => { collidingRef.current = colliding }, [colliding])

  useEffect(() => {
    if (!foods.length) {
      seedFoodField()
    }
  }, [foods.length, seedFoodField])

  useEffect(() => {
    const maxFoodCount = lowSpec ? MAX_FOOD_COUNT_LOW_SPEC : MAX_FOOD_COUNT
    if (foods.length > maxFoodCount) {
      const trimmed = foods.slice(-maxFoodCount)
      foodsRef.current = trimmed
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

  // Scroll wheel zoom
  useEffect(() => {
    if (lowSpec) return

    const onWheel = (e) => {
      e.preventDefault()
      const factor = Math.exp(e.deltaY * ZOOM_WHEEL_EXP)
      zoomRef.current = Math.max(ZOOM_MIN, zoomRef.current * factor)
    }
    const canvas = document.querySelector('canvas')
    if (canvas) canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      if (canvas) canvas.removeEventListener('wheel', onWheel)
    }
  }, [lowSpec])

  // Touch controls: two-finger pinch zoom, one-finger swipe steer
  useEffect(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return

    const SWIPE_TRIGGER_PX = 28
    const SWIPE_STEER_MS = 220

    let pinchDist = null
    let swipeTracking = false
    let swipeStartX = 0
    let swipeStartY = 0

    const getTouchDist = (a, b) => {
      const dx = a.clientX - b.clientX
      const dy = a.clientY - b.clientY
      return Math.hypot(dx, dy)
    }

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        pinchDist = getTouchDist(e.touches[0], e.touches[1])
        swipeTracking = false
        return
      }
      if (e.touches.length === 1) {
        const t = e.touches[0]
        swipeStartX = t.clientX
        swipeStartY = t.clientY
        swipeTracking = true
      }
    }

    const onTouchMove = (e) => {
      if (e.touches.length === 2) {
        if (lowSpec) return
        e.preventDefault()
        const nextDist = getTouchDist(e.touches[0], e.touches[1])
        if (pinchDist && nextDist > 0) {
          const factor = pinchDist / nextDist
          zoomRef.current = Math.max(ZOOM_MIN, zoomRef.current * factor)
        }
        pinchDist = nextDist
        return
      }

      if (e.touches.length === 1 && swipeTracking) {
        const t = e.touches[0]
        const dx = t.clientX - swipeStartX
        const dy = t.clientY - swipeStartY

        if (Math.abs(dx) > SWIPE_TRIGGER_PX && Math.abs(dx) > Math.abs(dy) * 1.2) {
          e.preventDefault()
          touchSteerRef.current = dx > 0 ? 1 : -1
          touchSteerUntilRef.current = performance.now() + SWIPE_STEER_MS
          recordInput()
          swipeStartX = t.clientX
          swipeStartY = t.clientY
        }
      }
    }

    const onTouchEnd = (e) => {
      if (e.touches.length < 2) pinchDist = null
      if (e.touches.length === 0) swipeTracking = false
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd, { passive: true })
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: true })

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      canvas.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [recordInput, lowSpec])

  // Render state
  const [renderState, setRenderState] = useState({
    segments: [{ theta: Math.PI / 2, phi: 0, heading: 0 }],
    foods: foods.slice(0, lowSpec ? FOOD_WINDOW_SIZE_LOW_SPEC : FOOD_WINDOW_SIZE),
    snakeScale: snakeScale,
    flash: false,
    collidingBlockLabel: null,
  })

  // Keyboard controls - A/D steer, W/S throttle
  const steerRef = useRef(0)
  const throttleRef = useRef(0)
  const keysDown = useRef(new Set())

  useEffect(() => {
    const onDown = (e) => {
      const key = e.key.toLowerCase()
      if (key === 'a' || key === 'arrowleft') {
        keysDown.current.add('left'); recordInput()
      }
      if (key === 'd' || key === 'arrowright') {
        keysDown.current.add('right'); recordInput()
      }
      if (key === 'w' || key === 'arrowup') {
        keysDown.current.add('accel'); recordInput()
      }
      if (key === 's' || key === 'arrowdown') {
        keysDown.current.add('brake'); recordInput()
      }
    }
    const onUp = (e) => {
      const key = e.key.toLowerCase()
      if (key === 'a' || key === 'arrowleft') keysDown.current.delete('left')
      if (key === 'd' || key === 'arrowright') keysDown.current.delete('right')
      if (key === 'w' || key === 'arrowup') keysDown.current.delete('accel')
      if (key === 's' || key === 'arrowdown') keysDown.current.delete('brake')
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [recordInput])

  useEffect(() => {
    const interval = setInterval(() => {
      const left = keysDown.current.has('left')
      const right = keysDown.current.has('right')
      if (left && !right) steerRef.current = -1
      else if (right && !left) steerRef.current = 1
      else steerRef.current = 0

      const accel = keysDown.current.has('accel')
      const brake = keysDown.current.has('brake')
      if (accel && !brake) throttleRef.current = 1
      else if (brake && !accel) throttleRef.current = -1
      else throttleRef.current = 0
    }, 16)
    return () => clearInterval(interval)
  }, [])

  const handleNavClick = useCallback((overlayId) => { setActiveOverlay(overlayId) }, [setActiveOverlay])
  const { camera } = useThree()

  useFrame((_, delta) => {
    delta = Math.min(delta, MAX_FRAME_DELTA)
    checkIdleResume()

    if (collidingRef.current) {
      flashTimerRef.current += delta
      const flashOn = Math.floor(flashTimerRef.current * 16) % 2 === 0
      flashRef.current = flashOn
      setRenderState((prev) => ({
        ...prev,
        flash: flashOn,
        collidingBlockLabel: collidingBlock,
      }))
      return
    }

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

    const throttle = throttleRef.current

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
    } else {
      if (speed > dynVBase) {
        speed -= FRICTION * delta
        if (speed < dynVBase) speed = dynVBase
      } else if (speed < dynVBase) {
        speed += FRICTION * delta
        if (speed > dynVBase) speed = dynVBase
      }
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
    nearbyFoodsClockRef.current -= delta
    if (
      nearbyFoodsClockRef.current <= 0 ||
      nearbyFoodsRef.current.length === 0 ||
      foodsRef.current.length <= foodWindowSize
    ) {
      nearbyFoodsRef.current = selectNearestFoods(foodsRef.current, head, foodWindowSize)
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
      const steerInput = touchSteer || steerRef.current
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
            ...NAV_BLOCKS.map((b) => ({ theta: b.theta, phi: b.phi, clearanceCells: navClearanceCells })),
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
        } catch (e) {
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
            const wp = astarPathRef.current[0]
            const desiredHeading = headingToward(head.theta, head.phi, wp.theta, wp.phi)
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

    const requiredTrailDist = segmentSpacing * Math.max(segCountRef.current + 2, 8)
    const roughSamplesPerUnit = 5.5
    const requiredByDensity = Math.ceil(requiredTrailDist * roughSamplesPerUnit)
    const sampleArcEstimate = Math.max(0.05, stepArc)
    const requiredByDistance = Math.ceil((requiredTrailDist / sampleArcEstimate) * 1.35)
    const dynamicTrailTarget = Math.max(requiredByDensity, requiredByDistance)
    const maxTrailLength = lowSpec
      ? Math.max(280, Math.min(3600, dynamicTrailTarget))
      : Math.max(TRAIL_LENGTH, Math.min(60000, dynamicTrailTarget))

    if (trailRef.current.length > maxTrailLength) {
      trailRef.current.length = maxTrailLength
    }

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
        trailIdx++
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
          setRenderState({
            segments: [{ theta: Math.PI / 2, phi: 0, heading: 0 }],
            foods: nearbyFoods,
            snakeScale: snakeScaleRef.current,
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

      if (outcome.evolved) {
        // Keep most of the current trail so evolution compaction does not
        // collapse the body too aggressively across later evolutions.
        const keepTrail = Math.max(64, Math.floor(trailRef.current.length * (2 / 3)))
        trailRef.current = trailRef.current.slice(0, keepTrail)
      }

      break
    }

    const spawnInterval = lowSpec ? FOOD_SPAWN_INTERVAL * 1.8 : FOOD_SPAWN_INTERVAL
    const maxFoodCount = lowSpec ? MAX_FOOD_COUNT_LOW_SPEC : MAX_FOOD_COUNT
    const spawnBudget = lowSpec ? MAX_FOOD_SPAWNS_PER_FRAME_LOW_SPEC : MAX_FOOD_SPAWNS_PER_FRAME
    foodSpawnClockRef.current += delta
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
      const newFood = spawnFood({
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
        flashTimerRef.current = 0
        triggerCollision(block.label)
        if (collisionTimerRef.current) clearTimeout(collisionTimerRef.current)
        collisionTimerRef.current = setTimeout(() => {
          hardReset(true)
          clearCollision()
          collidingRef.current = false
          setActiveOverlay(block.overlay)
        }, 500)
        return
      }
    }

    const headPos = sphericalToCartesian(result.theta, result.phi)
    const normal = headPos.clone().normalize()
    const targetZoom = activeOverlay ? OVERLAY_ZOOM : (lowSpec ? CAM_ELEVATION : zoomRef.current)
    const camTarget = normal.clone().multiplyScalar(SPHERE_RADIUS + targetZoom)
    camera.position.lerp(camTarget, delta * (activeOverlay ? 1.5 : 2.5))
    camera.lookAt(new THREE.Vector3(0, 0, 0))

    setRenderState({
      segments,
      foods: nearbyFoods,
      snakeScale: snakeScaleRef.current,
      flash: false,
      collidingBlockLabel: collidingBlock,
    })
  })

  const {
    segments,
    foods: renderFoods,
    snakeScale: renderSnakeScale,
    flash,
    collidingBlockLabel,
  } = renderState

  return (
    <>
      {!lowSpec && <UniverseBackdrop />}
      {!lowSpec && <DistantPlanetField />}

      <ambientLight intensity={0.12} />
      <pointLight position={[0, 60, 0]} intensity={0.8} color="#00F0FF" distance={120} />
      <pointLight position={[-50, 30, -50]} intensity={0.5} color="#FF0055" distance={100} />
      <pointLight position={[50, 30, 50]} intensity={0.5} color="#ADFF00" distance={100} />
      <pointLight position={[0, -60, 0]} intensity={0.3} color="#00F0FF" distance={100} />

      {lowSpec ? <GlobeLow /> : <GlobeFull />}

      {segments.map((seg, i) => (
        <SnakeSegment
          key={i}
          theta={seg.theta}
          phi={seg.phi}
          heading={seg.heading}
          index={i}
          isHead={i === 0}
          flash={flash}
          snakeScale={renderSnakeScale}
          lowSpec={lowSpec}
        />
      ))}

      {renderFoods.map((item) => (
        <FoodItem
          key={item.id}
          food={item}
          snakeScale={renderSnakeScale}
          lowSpec={lowSpec}
        />
      ))}

      {NAV_BLOCKS.map((block) => (
        <NavBlock
          key={block.label}
          label={block.label}
          path={block.overlay}
          theta={block.theta}
          phi={block.phi}
          color={block.color}
          onClick={handleNavClick}
          flash={flash && collidingBlockLabel === block.label}
        />
      ))}
    </>
  )
}
