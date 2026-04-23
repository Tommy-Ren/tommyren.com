import { useRef, useMemo, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'
import useGameStore from '../store/gameStore'

const GRID_SIZE = 20
const CELL = 1.2
const SPEED = 4.5
const SERPENTINE_AMP = 3
const SERPENTINE_FREQ = 0.6

const NAV_BLOCKS = [
  { label: 'Resume', path: '/resume', pos: [-7, 0, -7], color: '#FF0055' },
  { label: 'Background', path: '/background', pos: [7, 0, -7], color: '#FF0055' },
  { label: 'Portfolio', path: '/portfolio', pos: [-7, 0, 7], color: '#FF0055' },
  { label: 'Projects', path: '/projects', pos: [7, 0, 7], color: '#FF0055' },
  { label: 'CV', path: '/cv', pos: [0, 0, -9], color: '#FF0055' },
]

function spawnFood(existingBlocks) {
  let pos
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE - GRID_SIZE / 2) * CELL,
      z: Math.floor(Math.random() * GRID_SIZE - GRID_SIZE / 2) * CELL,
    }
  } while (existingBlocks.some(b => Math.abs(b.pos[0] - pos.x) < 2 && Math.abs(b.pos[2] - pos.z) < 2))
  return pos
}

/* ── Snake Head + Body ── */
function Snake({ segments }) {
  return (
    <group>
      {segments.map((seg, i) => (
        <mesh key={i} position={[seg.x, 0.4, seg.z]}>
          <boxGeometry args={[0.9, 0.5, 0.9]} />
          <meshStandardMaterial
            color={i === 0 ? '#00F0FF' : '#00C8DD'}
            emissive={i === 0 ? '#00F0FF' : '#008899'}
            emissiveIntensity={i === 0 ? 2 : 0.8}
            transparent
            opacity={Math.max(0.5, 1 - i * 0.05)}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ── Food ── */
function Food({ position }) {
  const ref = useRef()
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 2
      ref.current.position.y = 0.6 + Math.sin(Date.now() * 0.003) * 0.2
    }
  })
  return (
    <mesh ref={ref} position={[position.x, 0.6, position.z]}>
      <octahedronGeometry args={[0.4, 0]} />
      <meshStandardMaterial
        color="#ADFF00"
        emissive="#ADFF00"
        emissiveIntensity={2.5}
        transparent
        opacity={0.9}
      />
    </mesh>
  )
}

/* ── Navigation Block ── */
function NavBlock({ label, path, pos, color, onClick }) {
  const ref = useRef()
  const hovered = useRef(false)

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.position.y = 1 + Math.sin(Date.now() * 0.002 + pos[0]) * 0.15
      const targetScale = hovered.current ? 1.15 : 1
      ref.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5)
    }
  })

  return (
    <group
      ref={ref}
      position={pos}
      onClick={(e) => { e.stopPropagation(); onClick(path) }}
      onPointerOver={() => { hovered.current = true; document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { hovered.current = false; document.body.style.cursor = 'default' }}
    >
      <mesh>
        <boxGeometry args={[2.4, 1.4, 2.4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={0.25}
          wireframe={false}
        />
      </mesh>
      {/* Wireframe overlay */}
      <mesh>
        <boxGeometry args={[2.4, 1.4, 2.4]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.5}
          wireframe
          transparent
          opacity={0.6}
        />
      </mesh>
      {/* Label using sprite */}
      <sprite position={[0, 1.4, 0]} scale={[2.5, 0.6, 1]}>
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

/* ── Grid Floor ── */
function GridFloor() {
  return (
    <group>
      <gridHelper args={[GRID_SIZE * CELL, GRID_SIZE, '#00F0FF', '#0a2a2e']} position={[0, 0, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[GRID_SIZE * CELL, GRID_SIZE * CELL]} />
        <meshStandardMaterial color="#050505" transparent opacity={0.95} />
      </mesh>
    </group>
  )
}

/* ── Main Game Scene ── */
export default function GameScene() {
  const navigate = useNavigate()
  const autoCrawl = useGameStore(s => s.autoCrawl)
  const score = useGameStore(s => s.score)
  const incrementScore = useGameStore(s => s.incrementScore)

  const snakeRef = useRef([{ x: 0, y: 0, z: 0 }])
  const dirRef = useRef({ x: 1, z: 0 })
  const foodRef = useRef(spawnFood(NAV_BLOCKS))
  const timeRef = useRef(0)
  const serpTimeRef = useRef(0)
  const segCountRef = useRef(3)
  const stateRef = useRef({ segments: [{ x: 0, y: 0, z: 0 }] })
  const forceUpdate = useRef(0)

  // Keyboard controls
  useEffect(() => {
    const handler = (e) => {
      if (!autoCrawl) return
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          if (dirRef.current.z !== 1) dirRef.current = { x: 0, z: -1 }; break
        case 'ArrowDown': case 's': case 'S':
          if (dirRef.current.z !== -1) dirRef.current = { x: 0, z: 1 }; break
        case 'ArrowLeft': case 'a': case 'A':
          if (dirRef.current.x !== 1) dirRef.current = { x: -1, z: 0 }; break
        case 'ArrowRight': case 'd': case 'D':
          if (dirRef.current.x !== -1) dirRef.current = { x: 1, z: 0 }; break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [autoCrawl])

  const handleNavClick = useCallback((path) => {
    navigate(path)
  }, [navigate])

  useFrame((_, delta) => {
    if (!autoCrawl) return

    timeRef.current += delta
    serpTimeRef.current += delta

    // Serpentine auto-movement
    if (dirRef.current.x !== 0 || dirRef.current.z !== 0) {
      // Add serpentine wave to perpendicular axis
    }

    if (timeRef.current > 0.12) {
      timeRef.current = 0
      const head = snakeRef.current[0]
      const dir = dirRef.current

      // Serpentine offset
      const serpOffset = Math.sin(serpTimeRef.current * SERPENTINE_FREQ * Math.PI * 2) * SERPENTINE_AMP * 0.08

      let newX = head.x + dir.x * CELL
      let newZ = head.z + dir.z * CELL

      // Add perpendicular serpentine
      if (dir.x !== 0) newZ += serpOffset
      if (dir.z !== 0) newX += serpOffset

      // Wrap around grid
      const half = (GRID_SIZE * CELL) / 2
      if (newX > half) newX = -half
      if (newX < -half) newX = half
      if (newZ > half) newZ = -half
      if (newZ < -half) newZ = half

      const newHead = { x: newX, y: 0, z: newZ }
      const newSegments = [newHead, ...snakeRef.current.slice(0, segCountRef.current - 1)]
      snakeRef.current = newSegments

      // Check food collision
      const fd = foodRef.current
      if (Math.abs(newHead.x - fd.x) < CELL && Math.abs(newHead.z - fd.z) < CELL) {
        incrementScore()
        segCountRef.current += 2
        foodRef.current = spawnFood(NAV_BLOCKS)
      }

      // Check nav block collision
      for (const block of NAV_BLOCKS) {
        if (
          Math.abs(newHead.x - block.pos[0]) < 1.8 &&
          Math.abs(newHead.z - block.pos[2]) < 1.8
        ) {
          navigate(block.path)
          return
        }
      }

      stateRef.current = { segments: [...newSegments] }
      forceUpdate.current++
    }
  })

  const segments = stateRef.current.segments

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 15, 0]} intensity={0.8} color="#00F0FF" />
      <pointLight position={[-10, 8, -10]} intensity={0.4} color="#FF0055" />
      <pointLight position={[10, 8, 10]} intensity={0.4} color="#ADFF00" />

      <GridFloor />
      <Snake segments={segments} />
      <Food position={foodRef.current} />

      {NAV_BLOCKS.map((block) => (
        <NavBlock
          key={block.label}
          label={block.label}
          path={block.path}
          pos={block.pos}
          color={block.color}
          onClick={handleNavClick}
        />
      ))}
    </>
  )
}
