import { useRef, useMemo, useCallback, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
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
const ZOOM_MIN = 5
const ZOOM_MAX = 420
const ZOOM_WHEEL_SCALE = 0.08

const NAV_BLOCKS = [
  { label: 'Resume', overlay: 'resume', theta: Math.PI * 0.3, phi: 0, color: '#FF0055' },
  { label: 'About Me', overlay: 'about', theta: Math.PI * 0.3, phi: Math.PI * 0.8, color: '#FF0055' },
  { label: 'Portfolio', overlay: 'projects', theta: Math.PI * 0.7, phi: Math.PI * 0.4, color: '#FF0055' },
  { label: 'Projects', overlay: 'projects', theta: Math.PI * 0.7, phi: Math.PI * 1.2, color: '#FF0055' },
  { label: 'Contact', overlay: 'contact', theta: Math.PI * 0.5, phi: Math.PI * 1.6, color: '#FF0055' },
]

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
        fog={false}
      />
    </points>
  )
}

function UniverseBackdrop() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1400, 48, 48]} />
        <meshBasicMaterial color="#020817" side={THREE.BackSide} fog={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1180, 48, 48]} />
        <meshBasicMaterial
          color="#0c2f65"
          side={THREE.BackSide}
          fog={false}
          transparent
          opacity={0.18}
        />
      </mesh>
      <StarLayer
        count={4200}
        minRadius={260}
        maxRadius={1300}
        size={1.35}
        opacity={0.82}
        spinSpeed={0.0014}
      />
      <StarLayer
        count={260}
        minRadius={280}
        maxRadius={1250}
        size={2.6}
        opacity={0.95}
        spinSpeed={-0.0023}
        whiteMix={0.22}
      />
    </group>
  )
}

/* ── Globe wireframe ── */
function Globe() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS - 0.05, 128, 128]} />
        <meshStandardMaterial color="#080808" roughness={0.9} metalness={0.1} />
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
      zoomRef.current += e.deltaY * ZOOM_WHEEL_SCALE
      zoomRef.current = THREE.MathUtils.clamp(zoomRef.current, ZOOM_MIN, ZOOM_MAX)
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
