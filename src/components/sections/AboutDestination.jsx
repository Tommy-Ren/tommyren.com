import { Html, useGLTF } from '@react-three/drei'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import aboutPlanetTextureUrl from '../../assets/planets/about me.jpg'
import aboutBaseModelUrl from '../../assets/3D/about_me_base.glb'

const CORE_CENTER = [0, 10.6, 0]
const CONNECTOR_ORIGIN = [0, 11.5, 0]

const CARD_LAYOUT = {
  who: {
    cardPos: [0, 24.6, 10.5],
    anchorPos: [0, 13.9, 4.2],
    width: 'section-about-card section-about-card-hero',
    kicker: 'Memory 01',
    icon: '◉',
    curveOffset: [0, 6.6, 16],
    curveLift: 12,
    lineColor: '#67f7ff',
    nodeScale: 1.28,
    tilt: [-5, 0, 0],
  },
  background: {
    cardPos: [-29.5, 11.8, 8.4],
    anchorPos: [-18.2, 8.6, 2.4],
    width: 'section-about-card',
    kicker: 'Memory 02',
    icon: '▣',
    curveOffset: [-8.5, 4.6, 10],
    curveLift: 6.5,
    lineColor: '#36dcff',
    nodeScale: 1.08,
    tilt: [0, 7, 0],
  },
  skills: {
    cardPos: [29.5, 12.0, 8.4],
    anchorPos: [18.2, 8.5, 2.4],
    width: 'section-about-card',
    kicker: 'Memory 03',
    icon: '</>',
    curveOffset: [8.5, 4.6, 10],
    curveLift: 6.5,
    lineColor: '#3eeeff',
    nodeScale: 1.08,
    tilt: [0, -7, 0],
  },
  philosophy: {
    cardPos: [-24.4, -14.9, 10.5],
    anchorPos: [-15.8, -5.8, 4.2],
    width: 'section-about-card section-about-card-wide',
    kicker: 'Memory 04',
    icon: '◈',
    curveOffset: [-9.8, -1.2, 12.8],
    curveLift: 4.8,
    lineColor: '#38dfff',
    nodeScale: 1.08,
    tilt: [4, 8, 0],
  },
  notes: {
    cardPos: [24.4, -15.0, 10.5],
    anchorPos: [15.8, -5.9, 4.2],
    width: 'section-about-card section-about-card-wide',
    kicker: 'Memory 05',
    icon: '✦',
    curveOffset: [9.8, -1.2, 12.8],
    curveLift: 4.8,
    lineColor: '#42ebff',
    nodeScale: 1.08,
    tilt: [4, -8, 0],
  },
}

function toVec3(list) {
  return new THREE.Vector3(list[0], list[1], list[2])
}

function OrbitTrack({ radius, tube, color, y = 0, rotation = [0, 0, 0], speed = 0, opacity = 0.45, segments = 240 }) {
  const ref = useRef()

  useFrame((_, delta) => {
    if (ref.current && speed) {
      ref.current.rotation.z += delta * speed
    }
  })

  return (
    <mesh ref={ref} position={[0, y, 0]} rotation={rotation}>
      <torusGeometry args={[radius, tube, 12, segments]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  )
}

function GlyphRing({ radius, count = 64, y = 0, rotation = [Math.PI / 2, 0, 0], speed = 0, color = '#00F0FF', accentColor = '#FF26A8', accentEvery = 9999, opacity = 0.58, size = [1.3, 0.22, 0.16] }) {
  const ref = useRef()

  useFrame((_, delta) => {
    if (ref.current && speed) {
      ref.current.rotation.z += delta * speed
    }
  })

  return (
    <group ref={ref} position={[0, y, 0]} rotation={rotation}>
      {Array.from({ length: count }).map((_, index) => {
        const angle = (index / count) * Math.PI * 2
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        const active = accentEvery > 0 && index % accentEvery === 0
        const length = active ? size[0] * 1.2 : size[0]
        return (
          <mesh key={index} position={[x, 0, z]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[length, size[1], size[2]]} />
            <meshBasicMaterial color={active ? accentColor : color} transparent opacity={active ? opacity + 0.1 : opacity} />
          </mesh>
        )
      })}
    </group>
  )
}

function OrbitNode({ position, active = false, color = '#00F0FF', scale = 1 }) {
  const ringRef = useRef()
  const haloRef = useRef()

  useFrame((state, delta) => {
    if (ringRef.current) ringRef.current.rotation.z += delta * (active ? 1.3 : 0.72)
    if (haloRef.current) {
      haloRef.current.rotation.y -= delta * 0.45
      const pulse = 0.88 + Math.sin(state.clock.elapsedTime * (active ? 2.2 : 1.3)) * 0.08
      haloRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <group position={position} scale={scale}>
      <mesh>
        <sphereGeometry args={[0.92, 18, 18]} />
        <meshStandardMaterial color={color} emissive={active ? '#dffcff' : color} emissiveIntensity={active ? 3.6 : 1.8} transparent opacity={0.92} />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.72, 0.06, 8, 64]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.8 : 0.48} />
      </mesh>
      <mesh ref={haloRef} rotation={[0.3, 0, 0]}>
        <torusGeometry args={[2.28, 0.045, 8, 96]} />
        <meshBasicMaterial color={active ? '#9aff2c' : '#18dfff'} transparent opacity={active ? 0.6 : 0.22} />
      </mesh>
    </group>
  )
}

function CardConnector({ start, end, active, color, curveOffset = [0, 0, 0], curveLift = 6, nodeScale = 1 }) {
  const pulseRef = useRef()

  const points = useMemo(() => {
    const a = toVec3(start)
    const b = toVec3(end)
    const offset = toVec3(curveOffset)
    const midA = a.clone().lerp(b, 0.26)
    midA.add(offset.clone().multiplyScalar(0.45))
    midA.y += curveLift
    const midB = a.clone().lerp(b, 0.72)
    midB.add(offset.clone())
    midB.y += curveLift * 0.42
    return [a, midA, midB, b]
  }, [start, end, curveOffset, curveLift])

  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points])
  const outerTube = useMemo(() => new THREE.TubeGeometry(curve, 56, active ? 0.102 : 0.072, 12, false), [curve, active])
  const innerTube = useMemo(() => new THREE.TubeGeometry(curve, 56, active ? 0.04 : 0.03, 10, false), [curve, active])

  useFrame((state) => {
    if (pulseRef.current) {
      pulseRef.current.opacity = (active ? 0.86 : 0.5) + Math.sin(state.clock.elapsedTime * (active ? 3.4 : 1.5)) * (active ? 0.1 : 0.04)
    }
  })

  return (
    <group>
      <mesh geometry={outerTube}>
        <meshBasicMaterial color={color} transparent opacity={active ? 0.14 : 0.06} />
      </mesh>
      <mesh geometry={innerTube}>
        <meshBasicMaterial ref={pulseRef} color={active ? '#dfffff' : color} transparent opacity={active ? 0.86 : 0.5} />
      </mesh>
      <OrbitNode position={end} active={active} color={color} scale={nodeScale} />
    </group>
  )
}

function MemoryCard({ section, layout, active, onSelect }) {
  const isSkills = section.id === 'skills'
  const cardClass = `${layout.width}${active ? ' active' : ''}`
  const skills = isSkills
    ? section.body.split(',').map((item) => item.trim()).filter(Boolean)
    : []

  return (
    <Html position={layout.cardPos} transform distanceFactor={10.2} rotation={layout.tilt ? layout.tilt.map((deg) => THREE.MathUtils.degToRad(deg)) : undefined}>
      <button type="button" className={cardClass} onClick={() => onSelect(section.id)}>
        <span className="section-about-card-grid" />
        <span className="section-about-card-scan" />
        <span className="section-about-card-accent" />
        <span className="section-about-card-brackets" />
        <div className="section-about-card-header">
          <span className="section-about-card-icon">{layout.icon}</span>
          <span className="section-about-card-title">{section.title}</span>
        </div>
        <div className="section-about-card-body">
          {isSkills ? (
            <div className="section-about-skill-list">
              {skills.map((skill) => (
                <div key={skill}>{skill.toUpperCase()}</div>
              ))}
            </div>
          ) : (
            <p>{section.body}</p>
          )}
        </div>
        <div className="section-about-card-footer">
          <span>{layout.kicker}</span>
          <span className="section-about-card-dots">•••</span>
        </div>
      </button>
    </Html>
  )
}

function IdentityCore({ texture, accentColor }) {
  const shellRef = useRef()
  const ringRef = useRef()
  const particlesRef = useRef()
  const shellMaterialRef = useRef()
  const atmosphereRef = useRef()

  const particlePositions = useMemo(() => {
    const positions = new Float32Array(220 * 3)
    for (let i = 0; i < 220; i++) {
      const r = 7.2 * Math.cbrt(Math.random())
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const sinPhi = Math.sin(phi)
      positions[i * 3] = Math.cos(theta) * sinPhi * r
      positions[i * 3 + 1] = Math.cos(phi) * r
      positions[i * 3 + 2] = Math.sin(theta) * sinPhi * r
    }
    return positions
  }, [])

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    if (shellRef.current) shellRef.current.rotation.y += delta * 0.12
    if (ringRef.current) ringRef.current.rotation.z -= delta * 0.18
    if (particlesRef.current) particlesRef.current.rotation.y += delta * 0.05
    if (shellMaterialRef.current) {
      shellMaterialRef.current.opacity = 0.5 + Math.sin(t * 1.4) * 0.05
    }
    if (atmosphereRef.current) {
      const pulse = 1.02 + Math.sin(t * 1.1) * 0.018
      atmosphereRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <group position={CORE_CENTER}>
      <group ref={shellRef}>
        <mesh>
          <sphereGeometry args={[11.6, 72, 72]} />
          <meshBasicMaterial ref={shellMaterialRef} map={texture} color="#7ef8ff" transparent opacity={0.52} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[11.9, 54, 54]} />
          <meshBasicMaterial color="#b0ffff" transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[12.25, 42, 42]} />
          <meshBasicMaterial color="#6deeff" wireframe transparent opacity={0.085} depthWrite={false} />
        </mesh>
      </group>

      <mesh>
        <sphereGeometry args={[9.4, 40, 40]} />
        <meshBasicMaterial color="#35dfff" transparent opacity={0.06} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <group ref={particlesRef}>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" array={particlePositions} count={particlePositions.length / 3} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial color="#c7ffff" size={0.22} transparent opacity={0.88} depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
      </group>

      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[13.7, 40, 40]} />
        <meshBasicMaterial color="#1fdcff" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[14.2, 0.17, 10, 240]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.9} />
      </mesh>
      <group ref={ringRef}>
        <mesh position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0.18, 0]}>
          <torusGeometry args={[16.3, 0.065, 8, 240]} />
          <meshBasicMaterial color="#00F0FF" transparent opacity={0.34} />
        </mesh>
        <mesh position={[0, -0.55, 0]} rotation={[Math.PI / 2, -0.22, 0]}>
          <torusGeometry args={[18.1, 0.05, 8, 240]} />
          <meshBasicMaterial color="#10dfff" transparent opacity={0.18} />
        </mesh>
      </group>
    </group>
  )
}

function SatelliteNodes() {
  const ref = useRef()

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.12
  })

  const nodes = [
    { angle: 0.24, radius: 28, y: 7.8, scale: 1.12 },
    { angle: 2.45, radius: 33, y: -2.2, scale: 1.36 },
    { angle: 4.95, radius: 24, y: 2.8, scale: 0.88 },
  ]

  return (
    <group ref={ref} position={[0, CORE_CENTER[1], 0]}>
      {nodes.map((node, index) => {
        const x = Math.cos(node.angle) * node.radius
        const z = Math.sin(node.angle) * node.radius
        return (
          <group key={index} position={[x, node.y, z]} scale={node.scale}>
            <mesh>
              <sphereGeometry args={[1.05, 18, 18]} />
              <meshStandardMaterial color="#0f4052" emissive="#39e7ff" emissiveIntensity={2.2} roughness={0.32} metalness={0.28} />
            </mesh>
            <mesh rotation={[Math.PI / 2.5, 0, 0]}>
              <torusGeometry args={[2.25, 0.08, 6, 54]} />
              <meshBasicMaterial color={index === 1 ? '#ff42b8' : '#00eeff'} transparent opacity={0.78} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function DataShards() {
  const ref = useRef()

  const shards = useMemo(() => {
    return Array.from({ length: 32 }).map((_, index) => {
      const angle = (index / 32) * Math.PI * 2
      const radius = 20 + (index % 5) * 3.1 + Math.random() * 2.8
      return {
        position: [
          Math.cos(angle) * radius,
          CORE_CENTER[1] - 3.5 + Math.sin(angle * 1.8) * 6.5,
          Math.sin(angle) * radius,
        ],
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
        scale: 0.6 + Math.random() * 1.1,
        color: index % 9 === 0 ? '#ff36b7' : '#22e8ff',
      }
    })
  }, [])

  useFrame((state, delta) => {
    if (!ref.current) return
    ref.current.rotation.y += delta * 0.04
    ref.current.children.forEach((child, index) => {
      child.rotation.x += delta * (0.18 + index * 0.002)
      child.rotation.y -= delta * (0.1 + (index % 4) * 0.03)
      const pulse = 0.72 + Math.sin(state.clock.elapsedTime * 1.8 + index) * 0.12
      child.scale.setScalar(shards[index].scale * pulse)
    })
  })

  return (
    <group ref={ref}>
      {shards.map((shard, index) => (
        <mesh key={index} position={shard.position} rotation={shard.rotation}>
          <boxGeometry args={[1.6, 0.16, 0.44]} />
          <meshBasicMaterial color={shard.color} transparent opacity={shard.color === '#ff36b7' ? 0.58 : 0.34} />
        </mesh>
      ))}
    </group>
  )
}

function HoloBase({ accentColor }) {
  const ringRef = useRef()
  const outerRef = useRef()
  const pulseRef = useRef()
  const { scene } = useGLTF(aboutBaseModelUrl)
  const baseScene = useMemo(() => scene.clone(), [scene])
  const fittedBase = useMemo(() => {
    const root = baseScene.clone()
    const box = new THREE.Box3().setFromObject(root)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    const targetWidth = 54
    const scale = size.x > 0 ? targetWidth / size.x : 1
    root.scale.setScalar(scale)

    const scaledBox = new THREE.Box3().setFromObject(root)
    const scaledCenter = new THREE.Vector3()
    const scaledMin = scaledBox.min.clone()
    scaledBox.getCenter(scaledCenter)

    root.position.set(-scaledCenter.x, -scaledMin.y, -scaledCenter.z)

    root.traverse((child) => {
      if (!child.isMesh) return
      child.castShadow = false
      child.receiveShadow = false
      if (child.material) {
        child.material = child.material.clone()
        if ('color' in child.material) child.material.color = new THREE.Color('#243342')
        if ('metalness' in child.material) child.material.metalness = 0.9
        if ('roughness' in child.material) child.material.roughness = 0.28
        if ('envMapIntensity' in child.material) child.material.envMapIntensity = 1.55
      }
    })

    return root
  }, [baseScene])

  useFrame((state, delta) => {
    if (ringRef.current) ringRef.current.rotation.z += delta * 0.09
    if (outerRef.current) outerRef.current.rotation.z -= delta * 0.04
    if (pulseRef.current) {
      pulseRef.current.opacity = 0.74 + Math.sin(state.clock.elapsedTime * 1.8) * 0.08
    }
  })

  return (
    <group position={[0, -13.4, 0]}>
      <primitive object={fittedBase} />

      <mesh position={[0, 11.4, 0]}>
        <cylinderGeometry args={[18.8, 20.8, 4.8, 56, 1, true]} />
        <meshStandardMaterial color="#14212d" emissive="#06253a" emissiveIntensity={0.28} metalness={0.82} roughness={0.34} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 13.75, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[12.2, 0.36, 10, 220]} />
        <meshBasicMaterial color="#00eaff" transparent opacity={0.32} />
      </mesh>
      <mesh position={[0, 13.98, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[16.9, 0.15, 10, 240]} />
        <meshBasicMaterial ref={pulseRef} color="#00F0FF" transparent opacity={0.76} />
      </mesh>
      <mesh ref={ringRef} position={[0, 14.34, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[22.6, 0.075, 8, 240]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.86} />
      </mesh>
      <mesh position={[0, 14.52, 0]} rotation={[Math.PI / 2, 0.18, 0]}>
        <torusGeometry args={[27.9, 0.05, 8, 240]} />
        <meshBasicMaterial color="#14dcff" transparent opacity={0.22} />
      </mesh>

      <group ref={outerRef} position={[0, 14.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        {Array.from({ length: 28 }).map((_, index) => {
          const angle = (index / 28) * Math.PI * 2
          const x = Math.cos(angle) * 19.8
          const y = Math.sin(angle) * 19.8
          const active = index % 7 === 0
          return (
            <mesh key={index} position={[x, y, 0]} rotation={[0, 0, angle]}>
              <boxGeometry args={[active ? 2.3 : 1.18, active ? 0.24 : 0.18, 0.14]} />
              <meshBasicMaterial color={active ? '#ff39b8' : '#10deff'} transparent opacity={active ? 0.64 : 0.28} />
            </mesh>
          )
        })}
      </group>

      {Array.from({ length: 10 }).map((_, index) => {
        const angle = (index / 10) * Math.PI * 2
        const radius = 15.4
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        return (
          <group key={index} position={[x, 13.25, z]} rotation={[0, -angle, 0]}>
            <mesh>
              <boxGeometry args={[1.4, 0.28, 2.4]} />
              <meshStandardMaterial color="#1c2a37" emissive="#08283a" emissiveIntensity={0.44} metalness={0.7} roughness={0.42} />
            </mesh>
            <mesh position={[0, 0.16, 0]}>
              <boxGeometry args={[1.0, 0.04, 1.2]} />
              <meshBasicMaterial color="#00efff" transparent opacity={0.82} />
            </mesh>
          </group>
        )
      })}

      <Html position={[0, 1.95, 0]} transform distanceFactor={12.4}>
        <div className="section-about-base-label">
          <div className="section-about-base-title">IDENTITY CORE</div>
          <div className="section-about-base-subtitle">Memory Orbit</div>
        </div>
      </Html>
    </group>
  )
}

function EnvironmentDecor() {
  return (
    <group>
      <mesh position={[70, 40, -78]}>
        <sphereGeometry args={[4.4, 28, 28]} />
        <meshStandardMaterial color="#101726" emissive="#6aa1ff" emissiveIntensity={0.08} roughness={0.98} />
      </mesh>
      <mesh position={[-74, 24, -88]}>
        <sphereGeometry args={[3.2, 24, 24]} />
        <meshStandardMaterial color="#10162a" emissive="#4e8bff" emissiveIntensity={0.06} roughness={0.99} />
      </mesh>
      <mesh position={[0, 8, -90]}>
        <sphereGeometry args={[54, 36, 36]} />
        <meshBasicMaterial color="#08111f" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
    </group>
  )
}

export default function AboutDestination({ zone, selectedId, onSelect }) {
  const selected = zone.content.sections.find((item) => item.id === selectedId) || zone.content.sections[0]
  const texture = useLoader(THREE.TextureLoader, aboutPlanetTextureUrl)

  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.needsUpdate = true
  }, [texture])

  const orbitNodes = useMemo(
    () => zone.content.sections.map((section) => ({
      ...section,
      ...(CARD_LAYOUT[section.id] || {}),
    })),
    [zone.content.sections]
  )

  return (
    <group position={zone.anchorPosition}>
      <ambientLight intensity={0.26} />
      <pointLight position={[0, 24, 22]} intensity={3.2} color="#73f8ff" distance={220} />
      <pointLight position={[0, 4, -18]} intensity={1.1} color="#0b5c92" distance={170} />
      <pointLight position={[-16, 6, 12]} intensity={0.8} color="#ff39b8" distance={130} />
      <pointLight position={[12, 10, 18]} intensity={0.42} color="#d9ff62" distance={90} />

      <EnvironmentDecor />
      <HoloBase accentColor={zone.accentColor} />

      <OrbitTrack radius={14.2} tube={0.15} y={CORE_CENTER[1] - 0.1} color={zone.accentColor} opacity={0.94} speed={0.14} />
      <OrbitTrack radius={24.8} tube={0.055} y={CORE_CENTER[1] - 1.8} rotation={[Math.PI / 2, 0.16, 0]} color="#00E8FF" opacity={0.28} speed={-0.045} />
      <OrbitTrack radius={35.8} tube={0.04} y={CORE_CENTER[1] + 3.4} rotation={[Math.PI / 2, -0.2, 0]} color="#09c8ff" opacity={0.16} speed={0.03} />
      <GlyphRing radius={20.3} count={72} y={CORE_CENTER[1] + 1.0} speed={0.05} color="#00F0FF" accentColor="#FF26A8" accentEvery={18} opacity={0.26} size={[1.2, 0.15, 0.12]} />
      <GlyphRing radius={30.2} count={48} y={CORE_CENTER[1] - 8.8} rotation={[Math.PI / 2, 0.04, 0]} speed={-0.018} color="#1edcff" accentColor="#b8ff3b" accentEvery={9999} opacity={0.14} size={[1.2, 0.12, 0.1]} />

      <SatelliteNodes />
      <DataShards />
      <IdentityCore texture={texture} accentColor={zone.accentColor} />

      {orbitNodes.map((item) => {
        const active = item.id === selected.id
        const anchor = item.anchorPos || [0, 0, 0]
        return (
          <group key={item.id}>
            <CardConnector
              start={CONNECTOR_ORIGIN}
              end={anchor}
              active={active}
              color={item.lineColor || zone.themeColor}
              curveOffset={item.curveOffset}
              curveLift={item.curveLift}
              nodeScale={item.nodeScale}
            />
            <MemoryCard section={item} layout={item} active={active} onSelect={onSelect} />
          </group>
        )
      })}
    </group>
  )
}
