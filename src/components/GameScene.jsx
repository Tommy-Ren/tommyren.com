import { useRef, useMemo, useCallback, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useNavigate } from 'react-router-dom'
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

const SPHERE_RADIUS = 8
const SNAKE_SPEED = 1.8 // arc-distance per second
const STEER_SPEED = 2.5 // radians per second for manual steering
const SEGMENT_SPACING = 0.35 // arc-distance between segments
const FOOD_COLLECT_DIST = 0.8
const BLOCK_COLLECT_DIST = 1.2
const TRAIL_LENGTH = 120 // max trail history

const NAV_BLOCKS = [
  { label: 'Resume', path: '/resume', theta: Math.PI * 0.3, phi: 0, color: '#FF0055' },
  { label: 'Background', path: '/background', theta: Math.PI * 0.3, phi: Math.PI * 0.8, color: '#FF0055' },
  { label: 'Portfolio', path: '/portfolio', theta: Math.PI * 0.7, phi: Math.PI * 0.4, color: '#FF0055' },
  { label: 'Projects', path: '/projects', theta: Math.PI * 0.7, phi: Math.PI * 1.2, color: '#FF0055' },
  { label: 'CV', path: '/cv', theta: Math.PI * 0.5, phi: Math.PI * 1.6, color: '#FF0055' },
]

/* ── Globe wireframe ── */
function Globe() {
  return (
    <group>
      {/* Solid dark sphere */}
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS - 0.02, 64, 64]} />
        <meshStandardMaterial
          color="#080808"
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      {/* Wireframe grid overlay */}
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, 32, 32]} />
        <meshBasicMaterial
          color="#00F0FF"
          wireframe
          transparent
          opacity={0.06}
        />
      </mesh>
      {/* Equator ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[SPHERE_RADIUS + 0.01, 0.015, 8, 128]} />
        <meshBasicMaterial color="#00F0FF" transparent opacity={0.15} />
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
  const intensity = isHead ? 3 : Math.max(0.4, 1.5 - index * 0.08)
  const opacity = Math.max(0.3, 1 - index * 0.04)
  const scale = isHead ? 0.28 : Math.max(0.12, 0.24 - index * 0.006)

  return (
    <mesh
      position={orient.position}
      quaternion={orient.quaternion}
    >
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
      // Bob up and down along surface normal
      const normal = baseOrient.position.clone().normalize()
      const bob = Math.sin(Date.now() * 0.004) * 0.15
      ref.current.position.copy(
        baseOrient.position.clone().add(normal.multiplyScalar(bob + 0.3))
      )
    }
  })

  return (
    <mesh ref={ref} position={baseOrient.position} quaternion={baseOrient.quaternion}>
      <octahedronGeometry args={[0.25, 0]} />
      <meshStandardMaterial
        color="#ADFF00"
        emissive="#ADFF00"
        emissiveIntensity={3}
        transparent
        opacity={0.9}
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
      const bob = Math.sin(Date.now() * 0.002 + phi) * 0.08
      ref.current.position.copy(
        orient.position.clone().add(normal.multiplyScalar(bob + 0.5))
      )
      const targetScale = hovered.current ? 1.15 : 1
      ref.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        delta * 5
      )
    }
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
        <boxGeometry args={[1.2, 0.8, 1.2]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={flash ? 4 : 0.8}
          transparent
          opacity={flash ? 0.8 : 0.25}
        />
      </mesh>
      <mesh>
        <boxGeometry args={[1.2, 0.8, 1.2]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={flash ? 5 : 1.5}
          wireframe
          transparent
          opacity={0.6}
        />
      </mesh>
      {/* Holographic label floating above */}
      <sprite position={[0, 0.9, 0]} scale={[2, 0.5, 1]}>
        <spriteMaterial
          map={createTextTexture(label)}
          transparent
          depthTest={false}
        />
      </sprite>
    </group>
  )
}

/* ── Text texture helper ── */
const textureCache = {}
function createTextTexture(text) {
  if (textureCache[text]) return textureCache[text]
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 512, 128)
  ctx.font = 'bold 48px Orbitron, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#FF0055'
  ctx.shadowColor = '#FF0055'
  ctx.shadowBlur = 20
  ctx.fillText(text.toUpperCase(), 256, 64)
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  textureCache[text] = texture
  return texture
}

/* ── Main Game Scene ── */
export default function GameScene() {
  const navigate = useNavigate()
  const {
    autopilot, colliding, collidingBlock, gameRunning,
    score, food, segmentCount, snakeSpeed,
    incrementScore, setAutopilot, recordInput,
    checkIdleResume, setFood, addSegments,
    triggerCollision, clearCollision,
  } = useGameStore()

  // Refs for real-time game loop (not in state to avoid re-renders)
  const headRef = useRef({ theta: Math.PI / 2, phi: 0 })
  const headingRef = useRef(0)
  const trailRef = useRef([]) // array of {theta, phi, heading}
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

  // Sync refs with store
  useEffect(() => { autopilotRef.current = autopilot }, [autopilot])
  useEffect(() => { segCountRef.current = segmentCount }, [segmentCount])
  useEffect(() => { foodRef.current = food }, [food])
  useEffect(() => { collidingRef.current = colliding }, [colliding])

  // Render state (updated each frame)
  const [renderState, setRenderState] = useState({
    segments: [{ theta: Math.PI / 2, phi: 0, heading: 0 }],
    food: food,
    flash: false,
    collidingBlockLabel: null,
  })

  // Keyboard controls - A/D or Left/Right only
  const steerRef = useRef(0) // -1 left, 0 none, 1 right
  const keysDown = useRef(new Set())

  useEffect(() => {
    const onDown = (e) => {
      const key = e.key.toLowerCase()
      if (key === 'a' || key === 'arrowleft') {
        keysDown.current.add('left')
        recordInput()
      }
      if (key === 'd' || key === 'arrowright') {
        keysDown.current.add('right')
        recordInput()
      }
    }
    const onUp = (e) => {
      const key = e.key.toLowerCase()
      if (key === 'a' || key === 'arrowleft') keysDown.current.delete('left')
      if (key === 'd' || key === 'arrowright') keysDown.current.delete('right')
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [recordInput])

  // Update steer from keys
  useEffect(() => {
    const interval = setInterval(() => {
      const left = keysDown.current.has('left')
      const right = keysDown.current.has('right')
      if (left && !right) steerRef.current = -1
      else if (right && !left) steerRef.current = 1
      else steerRef.current = 0
    }, 16)
    return () => clearInterval(interval)
  }, [])

  const handleNavClick = useCallback((path) => {
    navigate(path)
  }, [navigate])

  // Camera follow
  const { camera } = useThree()

  useFrame((_, delta) => {
    // Check idle resumption
    checkIdleResume()

    if (collidingRef.current) {
      // During collision animation, flash rapidly
      flashTimerRef.current += delta
      const flashOn = Math.floor(flashTimerRef.current * 16) % 2 === 0
      flashRef.current = flashOn
      // Update render for flash
      setRenderState(prev => ({ ...prev, flash: flashOn }))
      return
    }

    const head = headRef.current
    let heading = headingRef.current

    // Steering
    if (!autopilotRef.current) {
      // Manual steering
      heading += steerRef.current * STEER_SPEED * delta
    } else {
      // A* autopilot steering
      astarRecalcRef.current -= delta
      if (astarRecalcRef.current <= 0 || astarPathRef.current.length === 0) {
        // Recalculate path to food
        try {
          const obstacles = NAV_BLOCKS.map(b => ({ theta: b.theta, phi: b.phi }))
          const path = findPathAStar(
            head.theta, head.phi,
            foodRef.current.theta, foodRef.current.phi,
            obstacles
          )
          astarPathRef.current = path && path.length > 0 ? path : []
        } catch (e) {
          // Fallback: steer directly toward food
          astarPathRef.current = [{ theta: foodRef.current.theta, phi: foodRef.current.phi }]
        }
        astarRecalcRef.current = 0.5 // recalc every 0.5s
      }

      // Steer toward next waypoint
      if (astarPathRef.current.length > 0) {
        const target = astarPathRef.current[0]
        const dist = greatCircleDistance(head.theta, head.phi, target.theta, target.phi)

        if (dist < 0.8) {
          astarPathRef.current.shift()
        }

        if (astarPathRef.current.length > 0) {
          const wp = astarPathRef.current[0]
          const desiredHeading = headingToward(head.theta, head.phi, wp.theta, wp.phi)

          // Smoothly steer toward desired heading
          let diff = desiredHeading - heading
          // Normalize to [-PI, PI]
          while (diff > Math.PI) diff -= Math.PI * 2
          while (diff < -Math.PI) diff += Math.PI * 2

          const steerAmount = Math.sign(diff) * Math.min(Math.abs(diff), STEER_SPEED * delta * 1.5)
          heading += steerAmount
        }
      }
    }

    // Move forward
    const arcDist = SNAKE_SPEED * delta
    const result = moveOnSphere(head.theta, head.phi, heading, arcDist)

    headRef.current = { theta: result.theta, phi: result.phi }
    headingRef.current = result.heading

    // Add to trail
    trailRef.current.unshift({
      theta: result.theta,
      phi: result.phi,
      heading: result.heading,
    })
    if (trailRef.current.length > TRAIL_LENGTH) {
      trailRef.current.length = TRAIL_LENGTH
    }

    // Build segments from trail at regular spacing
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
          // Interpolate
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

    // Check food collision
    const fd = foodRef.current
    if (greatCircleDistance(result.theta, result.phi, fd.theta, fd.phi) < FOOD_COLLECT_DIST) {
      incrementScore()
      addSegments(2)
      const avoidPts = [
        ...NAV_BLOCKS.map(b => ({ theta: b.theta, phi: b.phi })),
        { theta: result.theta, phi: result.phi },
      ]
      const newFood = randomSpherePoint(avoidPts, 3.0)
      foodRef.current = newFood
      setFood(newFood)
      astarPathRef.current = [] // force recalc
    }

    // Check nav block collision
    for (const block of NAV_BLOCKS) {
      const dist = greatCircleDistance(result.theta, result.phi, block.theta, block.phi)
      if (dist < BLOCK_COLLECT_DIST) {
        // Trigger 0.5s collision feedback
        collidingRef.current = true
        collisionTargetRef.current = block.path
        flashTimerRef.current = 0
        triggerCollision(block.label)

        setTimeout(() => {
          clearCollision()
          collidingRef.current = false
          navigate(block.path)
        }, 500)
        return
      }
    }

    // Camera follow - always positioned above the snake relative to sphere surface
    const headPos = sphericalToCartesian(result.theta, result.phi)
    const normal = headPos.clone().normalize()
    // Camera sits along the surface normal, elevated above the head
    // This ensures consistent distance regardless of where on the sphere the snake is
    const camTarget = normal.clone().multiplyScalar(SPHERE_RADIUS + 14)
    camera.position.lerp(camTarget, delta * 2.5)
    camera.lookAt(new THREE.Vector3(0, 0, 0))

    // Update render state
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
      <ambientLight intensity={0.12} />
      <pointLight position={[0, 15, 0]} intensity={0.6} color="#00F0FF" distance={40} />
      <pointLight position={[-12, 8, -12]} intensity={0.4} color="#FF0055" distance={30} />
      <pointLight position={[12, 8, 12]} intensity={0.4} color="#ADFF00" distance={30} />
      <pointLight position={[0, -15, 0]} intensity={0.2} color="#00F0FF" distance={30} />

      <Globe />

      {/* Snake segments */}
      {segments.map((seg, i) => (
        <SnakeSegment
          key={i}
          theta={seg.theta}
          phi={seg.phi}
          heading={seg.heading}
          index={i}
          isHead={i === 0}
          flash={flash}
        />
      ))}

      {/* Food */}
      <FoodItem theta={renderState.food.theta} phi={renderState.food.phi} />

      {/* Nav Blocks */}
      {NAV_BLOCKS.map((block) => (
        <NavBlock
          key={block.label}
          label={block.label}
          path={block.path}
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
