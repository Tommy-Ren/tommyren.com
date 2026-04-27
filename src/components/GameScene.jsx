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
const SEGMENT_SPACING = 1.25
const FOOD_COLLECT_DIST = 4.0 // 5x from 0.8
const BLOCK_COLLECT_DIST = 6.0 // 5x from 1.2
const TRAIL_LENGTH = 600 // increased for longer snake + bigger world
const SNAKE_SIZE_MULT = 0.68

// Physics speed constants
const V_BASE = 6.75
const V_MAX = 27.0
const V_MIN = 3.0
const ACCEL_RATE = 14.0
const BRAKE_RATE = 10.0
const FRICTION = 5.0

// Camera offset — higher for the bigger sphere
const CAM_ELEVATION = 30

// Overlay zoom distance (how far camera pulls back when overlay is open)
const OVERLAY_ZOOM = 55
const ZOOM_MIN = 0.000001
const ZOOM_WHEEL_EXP = 0.0016

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

function useConfiguredTexture(textureUrl) {
  const texture = useLoader(THREE.TextureLoader, textureUrl)
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
  }, [texture])
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
        depthTest={false}
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
          color="#020817"
          side={THREE.BackSide}
          fog={false}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[310000, 48, 48]} />
        <meshBasicMaterial
          color="#0c2f65"
          side={THREE.BackSide}
          fog={false}
          transparent
          opacity={0.18}
          depthWrite={false}
          depthTest={false}
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
function Globe() {
  const earthTexture = useConfiguredTexture(earthTextureUrl)
  const earthNightTexture = useConfiguredTexture(earthNightTextureUrl)

  return (
    <group>
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS - 0.05, 128, 128]} />
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
        <sphereGeometry args={[SPHERE_RADIUS, 48, 48]} />
        <meshBasicMaterial color="#00F0FF" wireframe transparent opacity={0.04} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[SPHERE_RADIUS + 0.02, 0.04, 8, 256]} />
        <meshBasicMaterial color="#00F0FF" transparent opacity={0.12} />
      </mesh>
    </group>
  )
}

/* ── Snake segment on sphere ── */
function SnakeSegment({ theta, phi, heading, index, isHead, flash }) {
  const orient = useMemo(
    () => getOrientationOnSphere(theta, phi, heading),
    [theta, phi, heading]
  )
  const baseColor = isHead ? '#00F0FF' : '#00C8DD'
  const emissiveColor = isHead ? '#00F0FF' : '#008899'
  const intensity = isHead ? 3 : Math.max(0.4, 1.5 - index * 0.04)
  const opacity = Math.max(0.3, 1 - index * 0.02)
  const baseScale = isHead ? 1.2 : Math.max(0.5, 1.0 - index * 0.015)
  const scale = baseScale * SNAKE_SIZE_MULT

  return (
    <mesh position={orient.position} quaternion={orient.quaternion}>
      <sphereGeometry args={[scale, 8, 8]} />
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
function FoodItem({ theta, phi }) {
  const ref = useRef()
  const baseOrient = useMemo(
    () => getOrientationOnSphere(theta, phi),
    [theta, phi]
  )
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 3
      const normal = baseOrient.position.clone().normalize()
      const bob = Math.sin(Date.now() * 0.004) * 0.5
      ref.current.position.copy(
        baseOrient.position.clone().add(normal.multiplyScalar(bob + 1.2))
      )
    }
  })
  return (
    <mesh ref={ref} position={baseOrient.position} quaternion={baseOrient.quaternion}>
      <octahedronGeometry args={[1.0, 0]} />
      <meshStandardMaterial
        color="#ADFF00" emissive="#ADFF00" emissiveIntensity={3}
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
export default function GameScene() {
  const {
    autopilot, colliding, collidingBlock, gameRunning,
    score, food, segmentCount,
    incrementScore, setAutopilot, recordInput,
    checkIdleResume, setFood, addSegments,
    triggerCollision, clearCollision, resetGame,
    currentSpeed, setCurrentSpeed, vBase, vMax, vMin,
    activeOverlay, setActiveOverlay,
  } = useGameStore()

  // Refs for real-time game loop
  const headRef = useRef({ theta: Math.PI / 2, phi: 0 })
  const headingRef = useRef(0)
  const trailRef = useRef([])
  const segCountRef = useRef(segmentCount)
  const foodRef = useRef(food)
  const autopilotRef = useRef(autopilot)
  const collidingRef = useRef(false)
  const collisionTimerRef = useRef(null)
  const collisionTargetRef = useRef(null)
  const astarPathRef = useRef([])
  const astarRecalcRef = useRef(0)
  const flashRef = useRef(false)
  const flashTimerRef = useRef(0)
  const speedRef = useRef(vBase)
  const zoomRef = useRef(CAM_ELEVATION) // scroll wheel zoom

  // Sync refs with store
  useEffect(() => { autopilotRef.current = autopilot }, [autopilot])
  useEffect(() => { segCountRef.current = segmentCount }, [segmentCount])
  useEffect(() => { foodRef.current = food }, [food])
  useEffect(() => { collidingRef.current = colliding }, [colliding])

  // Scroll wheel zoom
  useEffect(() => {
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
  }, [])

  // Render state
  const [renderState, setRenderState] = useState({
    segments: [{ theta: Math.PI / 2, phi: 0, heading: 0 }],
    food: food,
    flash: false,
    collidingBlockLabel: null,
  })

  // Keyboard controls - A/D steer, W/S throttle
  const steerRef = useRef(0)
  const throttleRef = useRef(0) // -1 brake, 0 none, 1 accel
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

  // Update steer + throttle from keys
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
    checkIdleResume()

    if (collidingRef.current) {
      flashTimerRef.current += delta
      const flashOn = Math.floor(flashTimerRef.current * 16) % 2 === 0
      flashRef.current = flashOn
      setRenderState(prev => ({ ...prev, flash: flashOn }))
      return
    }

    const head = headRef.current
    let heading = headingRef.current

    // ── Physics-based speed ──
    let speed = speedRef.current
    const throttle = throttleRef.current

    if (throttle > 0) {
      // Accelerate: parabolic ease-in toward V_MAX
      const t = (speed - vBase) / (vMax - vBase) // 0..1 progress
      const easeFactor = 1 - t * t // faster at start, slower near max
      speed += ACCEL_RATE * easeFactor * delta
      if (speed > vMax) speed = vMax
    } else if (throttle < 0) {
      // Brake: ease toward V_MIN
      const t = (speed - vMin) / (vBase - vMin) // 1..0 progress
      const easeFactor = t * t // slower near min
      speed -= BRAKE_RATE * easeFactor * delta
      if (speed < vMin) speed = vMin
    } else {
      // No input: friction returns to V_BASE
      if (speed > vBase) {
        speed -= FRICTION * delta
        if (speed < vBase) speed = vBase
      } else if (speed < vBase) {
        speed += FRICTION * delta
        if (speed > vBase) speed = vBase
      }
    }
    speedRef.current = speed
    setCurrentSpeed(speed)

    // Steering
    if (!autopilotRef.current) {
      // Negate steer so A=left, D=right matches visual direction
      heading -= steerRef.current * STEER_SPEED * delta
    } else {
      // A* autopilot
      astarRecalcRef.current -= delta
      if (astarRecalcRef.current <= 0 || astarPathRef.current.length === 0) {
        try {
          const obstacles = NAV_BLOCKS.map(b => ({ theta: b.theta, phi: b.phi }))
          const path = findPathAStar(
            head.theta, head.phi,
            foodRef.current.theta, foodRef.current.phi,
            obstacles
          )
          astarPathRef.current = path && path.length > 0 ? path : []
        } catch (e) {
          astarPathRef.current = [{ theta: foodRef.current.theta, phi: foodRef.current.phi }]
        }
        astarRecalcRef.current = 0.3
      }

      // Emergency block avoidance — reactive steering away from nearby blocks
      const EMERGENCY_DIST = 12.0 // distance threshold to trigger emergency steer
      let emergencySteer = 0
      for (const block of NAV_BLOCKS) {
        const blockDist = greatCircleDistance(head.theta, head.phi, block.theta, block.phi)
        if (blockDist < EMERGENCY_DIST) {
          // Heading toward block
          const toBlock = headingToward(head.theta, head.phi, block.theta, block.phi)
          let angleDiff = toBlock - heading
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2
          // Only react if we're generally heading toward the block (within ±90°)
          if (Math.abs(angleDiff) < Math.PI / 2) {
            // Steer away — stronger when closer
            const urgency = 1 - (blockDist / EMERGENCY_DIST)
            const steerDir = angleDiff > 0 ? -1 : 1 // steer opposite to block
            emergencySteer += steerDir * urgency * STEER_SPEED * delta * 6.0
          }
        }
      }

      if (Math.abs(emergencySteer) > 0.001) {
        // Emergency steer overrides A* path following
        heading += emergencySteer
        // Force A* recalc next frame to find new route
        astarRecalcRef.current = 0
      } else if (astarPathRef.current.length > 0) {
        const target = astarPathRef.current[0]
        const dist = greatCircleDistance(head.theta, head.phi, target.theta, target.phi)
        if (dist < 4.0) astarPathRef.current.shift()

        if (astarPathRef.current.length > 0) {
          const wp = astarPathRef.current[0]
          const desiredHeading = headingToward(head.theta, head.phi, wp.theta, wp.phi)
          let diff = desiredHeading - heading
          while (diff > Math.PI) diff -= Math.PI * 2
          while (diff < -Math.PI) diff += Math.PI * 2
          const steerAmount = Math.sign(diff) * Math.min(Math.abs(diff), STEER_SPEED * delta * 3.0)
          heading += steerAmount
        }
      }
    }

    // Move forward with current speed
    const arcDist = speed * delta
    const result = moveOnSphere(head.theta, head.phi, heading, arcDist)

    headRef.current = { theta: result.theta, phi: result.phi }
    headingRef.current = result.heading

    // Trail
    trailRef.current.unshift({ theta: result.theta, phi: result.phi, heading: result.heading })
    if (trailRef.current.length > TRAIL_LENGTH) trailRef.current.length = TRAIL_LENGTH

    // Build segments from trail
    const segments = [{ theta: result.theta, phi: result.phi, heading: result.heading }]
    let trailIdx = 0
    let accumDist = 0

    for (let i = 1; i < segCountRef.current && trailIdx < trailRef.current.length - 1; i++) {
      const targetDist = i * SEGMENT_SPACING
      while (trailIdx < trailRef.current.length - 1 && accumDist < targetDist) {
        const a = trailRef.current[trailIdx]
        const b = trailRef.current[trailIdx + 1]
        const d = greatCircleDistance(a.theta, a.phi, b.theta, b.phi)
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

    // Self-collision check (head vs body segments, skip first few)
    const SELF_COLLIDE_DIST = 0.75
    if (segments.length > 6) {
      for (let si = 6; si < segments.length; si++) {
        const seg = segments[si]
        const d = greatCircleDistance(result.theta, result.phi, seg.theta, seg.phi)
        if (d < SELF_COLLIDE_DIST) {
          // Reset score and length
          resetGame()
          segCountRef.current = 3
          trailRef.current = []
          headRef.current = { theta: Math.PI / 2, phi: 0 }
          headingRef.current = 0
          speedRef.current = vBase
          astarPathRef.current = []
          break
        }
      }
    }

    // Food collision
    const fd = foodRef.current
    if (greatCircleDistance(result.theta, result.phi, fd.theta, fd.phi) < FOOD_COLLECT_DIST) {
      incrementScore()
      addSegments(1)
      const avoidPts = [
        ...NAV_BLOCKS.map(b => ({ theta: b.theta, phi: b.phi })),
        { theta: result.theta, phi: result.phi },
      ]
      const newFood = randomSpherePoint(avoidPts, 8.0)
      foodRef.current = newFood
      setFood(newFood)
      astarPathRef.current = []
    }

    // Nav block collision — reset score/length, then navigate
    for (const block of NAV_BLOCKS) {
      const dist = greatCircleDistance(result.theta, result.phi, block.theta, block.phi)
      if (dist < BLOCK_COLLECT_DIST) {
        collidingRef.current = true
        collisionTargetRef.current = block.overlay
        flashTimerRef.current = 0
        triggerCollision(block.label)
        setTimeout(() => {
          resetGame()
          segCountRef.current = 3
          trailRef.current = []
          headRef.current = { theta: Math.PI / 2, phi: 0 }
          headingRef.current = 0
          speedRef.current = vBase
          astarPathRef.current = []
          clearCollision()
          collidingRef.current = false
          setActiveOverlay(block.overlay)
        }, 500)
        return
      }
    }

    // Camera follow — zoom out when overlay is active, otherwise use scroll-wheel zoom
    const headPos = sphericalToCartesian(result.theta, result.phi)
    const normal = headPos.clone().normalize()
    const targetZoom = activeOverlay ? OVERLAY_ZOOM : zoomRef.current
    const camTarget = normal.clone().multiplyScalar(SPHERE_RADIUS + targetZoom)
    camera.position.lerp(camTarget, delta * (activeOverlay ? 1.5 : 2.5))
    camera.lookAt(new THREE.Vector3(0, 0, 0))

    setRenderState({
      segments,
      food: foodRef.current,
      flash: false,
      collidingBlockLabel: null,
    })
  })

  const { segments, flash, collidingBlockLabel } = renderState

  return (
    <>
      <UniverseBackdrop />
      <DistantPlanetField />

      <ambientLight intensity={0.12} />
      <pointLight position={[0, 60, 0]} intensity={0.8} color="#00F0FF" distance={120} />
      <pointLight position={[-50, 30, -50]} intensity={0.5} color="#FF0055" distance={100} />
      <pointLight position={[50, 30, 50]} intensity={0.5} color="#ADFF00" distance={100} />
      <pointLight position={[0, -60, 0]} intensity={0.3} color="#00F0FF" distance={100} />

      <Globe />

      {segments.map((seg, i) => (
        <SnakeSegment
          key={i} theta={seg.theta} phi={seg.phi} heading={seg.heading}
          index={i} isHead={i === 0} flash={flash}
        />
      ))}

      <FoodItem theta={renderState.food.theta} phi={renderState.food.phi} />

      {NAV_BLOCKS.map((block) => (
        <NavBlock
          key={block.label} label={block.label} path={block.overlay}
          theta={block.theta} phi={block.phi} color={block.color}
          onClick={handleNavClick}
          flash={flash && collidingBlockLabel === block.label}
        />
      ))}
    </>
  )
}
