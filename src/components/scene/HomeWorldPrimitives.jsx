import { useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import {
  sphericalToCartesian,
  getOrientationOnSphere,
  moveOnSphere,
  greatCircleDistance,
} from '../../utils/sphereMath'
import earthTextureUrl from '../../assets/planets/earth.jpg'
import earthNightTextureUrl from '../../assets/planets/earth_night.jpg'
import earthLowTextureUrl from '../../assets/planets/low/earth_low.jpg'
import saturnTextureUrl from '../../assets/planets/saturn.jpg'
import jupiterTextureUrl from '../../assets/planets/jupiter.jpg'
import ceresTextureUrl from '../../assets/planets/ceres.jpg'
import haumeaTextureUrl from '../../assets/planets/haumea.jpg'
import erisTextureUrl from '../../assets/planets/eris.jpg'
import makemakeTextureUrl from '../../assets/planets/makemake.jpg'
import marsTextureUrl from '../../assets/planets/mars.jpg'
import mercuryTextureUrl from '../../assets/planets/mercury.jpg'
import moonTextureUrl from '../../assets/planets/moon.jpg'
import sunTextureUrl from '../../assets/planets/sun.jpg'
import venusTextureUrl from '../../assets/planets/venus.jpg'

const SPHERE_RADIUS = 40
const BASE_SNAKE_SIZE_MULT = 0.68 / 6
const BASE_FOOD_COLLECT_DIST = 4.0 / 6
const BASE_BLOCK_COLLECT_DIST = 2.75
const FOOD_SCALE_EXP = 0.18
const FOOD_COLLISION_SCALE_EXP = 0.16
const SPEED_GROWTH_LOG_FACTOR = 0.18
const SPEED_GROWTH_MAX_MULT = 2.4
const SURFACE_MODE = 'surface'
const SPACE_MODE = 'space'

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

function getOrientationFromDirection(position, direction) {
  const pos = position.clone()
  const forward = direction.clone().normalize()
  const worldUp = new THREE.Vector3(0, 1, 0)
  let right = new THREE.Vector3().crossVectors(forward, worldUp).normalize()
  if (right.lengthSq() < 0.001) {
    right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(1, 0, 0)).normalize()
  }
  const up = new THREE.Vector3().crossVectors(right, forward).normalize()
  const m = new THREE.Matrix4()
  m.makeBasis(right, up, forward.clone().negate())
  m.setPosition(pos)
  const quat = new THREE.Quaternion().setFromRotationMatrix(m)
  return { position: pos, quaternion: quat, normal: up }
}

function computeFoodScaleFactor(snakeScale = 1, exponent = FOOD_SCALE_EXP) {
  return Math.pow(Math.max(1, snakeScale), exponent)
}

function computeSegmentRadius(index = 0, snakeScale = 1) {
  const baseScale = index === 0 ? 1.14 : Math.max(0.5, 0.96 - index * 0.012)
  return baseScale * BASE_SNAKE_SIZE_MULT * snakeScale
}

function computeFoodRenderRadius(snakeScale = 1, sizeRatio = 1) {
  const growth = computeFoodScaleFactor(snakeScale, FOOD_SCALE_EXP)
  return Math.max(0.12, BASE_SNAKE_SIZE_MULT * growth * sizeRatio)
}

function chordToArcDistance(chordLength, sphereRadius = SPHERE_RADIUS) {
  const safeRatio = THREE.MathUtils.clamp(chordLength / (2 * sphereRadius), 0, 1)
  return 2 * sphereRadius * Math.asin(safeRatio)
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

export function createRandomPlanetLayout() {
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
      id: `${planet.name}-${i}`,
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
            <meshBasicMaterial map={texture} color="#ffffff" fog={false} />
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

function GameplayPlanet({
  planet,
}) {
  if (planet.textureUrl) {
    return (
      <DistantPlanet
        textureUrl={planet.textureUrl}
        position={planet.position}
        radius={planet.radius}
        spinSpeed={planet.spinSpeed}
        ring={planet.ring}
        ringTilt={planet.ringTilt}
        axialTiltDeg={planet.axialTiltDeg}
        isStar={planet.isStar}
        initialRotation={planet.initialRotation}
      />
    )
  }

  return (
    <mesh position={planet.position}>
      <sphereGeometry args={[planet.radius, 32, 32]} />
      <meshStandardMaterial
        color={planet.color || '#14233b'}
        emissive={planet.glowColor || '#00F0FF'}
        emissiveIntensity={0.14}
        roughness={0.82}
      />
    </mesh>
  )
}

export function computeFoodCollisionDistance(snakeScale = 1, sizeRatio = 1) {
  const headRadius = computeSegmentRadius(0, snakeScale)
  const foodRadius = computeFoodRenderRadius(snakeScale, sizeRatio)
  const touchChord = (headRadius + foodRadius) * 0.96
  const visualTouchDist = chordToArcDistance(touchChord)
  const legacyDist = BASE_FOOD_COLLECT_DIST
    * computeFoodScaleFactor(snakeScale, FOOD_COLLISION_SCALE_EXP)
    * Math.max(0.6, sizeRatio)
  return Math.max(legacyDist, visualTouchDist)
}

export function computeBlockCollisionDistance(snakeScale = 1) {
  const scaleFactor = Math.pow(Math.max(1, snakeScale), 0.22)
  return BASE_BLOCK_COLLECT_DIST * scaleFactor
}

export function computeSelfCollisionDistance(headIndex, otherIndex, snakeScale = 1) {
  const headRadius = computeSegmentRadius(headIndex, snakeScale)
  const bodyRadius = computeSegmentRadius(otherIndex, snakeScale)
  return Math.max(0.11, (headRadius + bodyRadius) * 0.9)
}

export function computeSnakeSpeedProfile(snakeScale = 1) {
  const scale = Math.max(1, snakeScale)
  const growth = 1 + SPEED_GROWTH_LOG_FACTOR * Math.log2(scale)
  const multiplier = THREE.MathUtils.clamp(growth, 1, SPEED_GROWTH_MAX_MULT)
  return {
    vMin: 2.25 * multiplier,
    vBase: 5.0625 * multiplier,
    vMax: 20.25 * multiplier,
  }
}

export function sampleBodyObstacles(segments = []) {
  const sampled = []
  if (!segments || segments.length <= 8) return sampled
  for (let i = 8; i < segments.length; i += 2) {
    const seg = segments[i]
    if (!seg?.theta || !seg?.phi) continue
    sampled.push({ theta: seg.theta, phi: seg.phi, clearanceCells: 2 })
  }
  return sampled
}

export function SurfacePlanet({
  textureUrl,
  lowSpec = false,
  classicEarth = false,
  lineOpacity = 0.04,
  torusOpacity = 0.12,
  dimTexture = false,
}) {
  const selectedTexture = lowSpec && classicEarth ? earthLowTextureUrl : (textureUrl || earthTextureUrl)
  const surfaceMap = useConfiguredTexture(selectedTexture, { lowSpec })
  const nightMap = useConfiguredTexture(earthNightTextureUrl, { lowSpec })

  return (
    <group>
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS - 0.05, lowSpec ? 28 : 96, lowSpec ? 28 : 96]} />
        <meshStandardMaterial
          map={surfaceMap}
          emissiveMap={classicEarth && !dimTexture ? nightMap : null}
          color={dimTexture ? '#7f91a8' : '#ffffff'}
          roughness={lowSpec ? 0.92 : 0.88}
          metalness={0.03}
          emissive={classicEarth && !dimTexture ? '#8aa6ff' : '#0b1b36'}
          emissiveIntensity={classicEarth && !dimTexture ? 0.32 : (dimTexture ? 0.05 : 0.12)}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, lowSpec ? 20 : 42, lowSpec ? 20 : 42]} />
        <meshBasicMaterial color="#00F0FF" wireframe transparent opacity={lineOpacity} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[SPHERE_RADIUS + 0.02, 0.04, 8, 220]} />
        <meshBasicMaterial color="#00F0FF" transparent opacity={torusOpacity} />
      </mesh>
    </group>
  )
}

export function SpaceCenterPlanet({ textureUrl, lowSpec = false }) {
  const surfaceMap = useConfiguredTexture(textureUrl || earthTextureUrl, { lowSpec })
  return (
    <mesh>
      <sphereGeometry args={[SPHERE_RADIUS, lowSpec ? 36 : 72, lowSpec ? 36 : 72]} />
      <meshStandardMaterial map={surfaceMap} roughness={0.95} metalness={0.02} />
    </mesh>
  )
}

export function UniverseBackdrop() {
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

export function DistantPlanetField({ planets = null }) {
  const randomLayout = useMemo(() => planets || createRandomPlanetLayout(), [planets])

  return (
    <group>
      {randomLayout.map((planet) => (
        <DistantPlanet key={planet.id} {...planet} />
      ))}
    </group>
  )
}

export function GameplayPlanetField({ planets = [] }) {
  return (
    <group>
      {planets.map((planet) => (
        <GameplayPlanet key={planet.id || planet.name} planet={planet} />
      ))}
    </group>
  )
}

export function SnakeSegment({
  theta,
  phi,
  heading,
  position,
  direction,
  index = 0,
  isHead = false,
  flash = false,
  snakeScale = 1,
  lowSpec = false,
}) {
  const orient = useMemo(() => {
    if (Array.isArray(position) && Array.isArray(direction)) {
      return getOrientationFromDirection(new THREE.Vector3(...position), new THREE.Vector3(...direction))
    }
    return getOrientationOnSphere(theta, phi, heading)
  }, [theta, phi, heading, position, direction])

  const baseColor = isHead ? '#00F0FF' : '#00C8DD'
  const emissiveColor = isHead ? '#00F0FF' : '#008899'
  const intensity = isHead ? 3.2 : Math.max(0.35, 1.35 - index * 0.03)
  const opacity = Math.max(0.3, 1 - index * 0.02)
  const scale = computeSegmentRadius(index, snakeScale)

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

export function FoodItem({ food, snakeScale = 1, lowSpec = false }) {
  const ref = useRef()
  const {
    theta,
    phi,
    mode = SURFACE_MODE,
    position,
    color = '#ADFF00',
    sizeRatio = 1,
  } = food
  const baseOrient = useMemo(() => {
    if (mode === SPACE_MODE && position) {
      const p = new THREE.Vector3(position[0], position[1], position[2])
      return getOrientationFromDirection(p, p.clone().normalize())
    }
    return getOrientationOnSphere(theta, phi)
  }, [mode, position, theta, phi])

  const scaledSize = computeFoodRenderRadius(snakeScale, sizeRatio)

  useFrame((_, delta) => {
    if (!ref.current) return
    ref.current.rotation.y += delta * 2.4

    if (mode === SPACE_MODE || !Number.isFinite(phi)) return

    const normal = baseOrient.position.clone().normalize()
    const bob = Math.sin(Date.now() * 0.0037 + phi * 3.2) * (0.22 + scaledSize * 0.08)
    ref.current.position.copy(
      baseOrient.position.clone().add(normal.multiplyScalar(0.26 + scaledSize * 0.95 + bob))
    )
  })

  return (
    <mesh ref={ref} position={baseOrient.position} quaternion={baseOrient.quaternion}>
      <octahedronGeometry args={[scaledSize, lowSpec ? 0 : 1]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2.6}
        transparent
        opacity={0.9}
      />
    </mesh>
  )
}

export function computeHomeCameraAnchor(head, zoom = 30) {
  const headPos = sphericalToCartesian(head.theta, head.phi)
  const normal = headPos.clone().normalize()
  const target = normal.clone().multiplyScalar(SPHERE_RADIUS + zoom)
  return [target.x, target.y, target.z]
}

export function advanceSurfaceSnake({ head, heading, speed, delta }) {
  return moveOnSphere(head.theta, head.phi, heading, speed * delta)
}

export { SPHERE_RADIUS, SURFACE_MODE, SPACE_MODE, greatCircleDistance }
