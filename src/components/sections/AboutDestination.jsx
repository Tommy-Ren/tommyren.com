import { Html, useGLTF } from '@react-three/drei'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import aboutPlanetTextureUrl from '../../assets/planets/about me.jpg'
import aboutBaseModelUrl from '../../assets/3D/about_me_base.glb'

const CORE_CENTER = [0, 9.4, 0]
const CONNECTOR_ORIGIN = [0, 10.2, 0]

const CARD_LAYOUT = {
  who: {
    cardPos: [0, 22.6, 9],
    anchorPos: [0, 12.8, 3.8],
    width: 'section-about-card section-about-card-hero',
    kicker: 'Memory 01',
    icon: '◉',
    curveOffset: [0, 6.2, 16],
    curveLift: 11,
    lineColor: '#67f7ff',
    nodeScale: 1.22,
  },
  background: {
    cardPos: [-31, 10.5, 8],
    anchorPos: [-18, 8.4, 2],
    width: 'section-about-card',
    kicker: 'Memory 02',
    icon: '▣',
    curveOffset: [-9, 4.8, 10],
    curveLift: 6,
    lineColor: '#36dcff',
    nodeScale: 1.04,
  },
  skills: {
    cardPos: [31, 10.8, 8],
    anchorPos: [18, 8.2, 2],
    width: 'section-about-card',
    kicker: 'Memory 03',
    icon: '</>',
    curveOffset: [9, 4.8, 10],
    curveLift: 6,
    lineColor: '#3eeeff',
    nodeScale: 1.04,
  },
  philosophy: {
    cardPos: [-24.5, -16.5, 10],
    anchorPos: [-15.5, -6.6, 4],
    width: 'section-about-card section-about-card-wide',
    kicker: 'Memory 04',
    icon: '◈',
    curveOffset: [-10, -1.5, 13],
    curveLift: 4.5,
    lineColor: '#ff4fc5',
    nodeScale: 1.06,
  },
  notes: {
    cardPos: [24.5, -16.6, 10],
    anchorPos: [15.5, -6.8, 4],
    width: 'section-about-card section-about-card-wide',
    kicker: 'Memory 05',
    icon: '✎',
    curveOffset: [10, -1.4, 13],
    curveLift: 4.5,
    lineColor: '#b8ff3b',
    nodeScale: 1.06,
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

function GlyphRing({ radius, count = 64, y = 0, rotation = [Math.PI / 2, 0, 0], speed = 0, color = '#00F0FF', accentColor = '#FF26A8', accentEvery = 7, opacity = 0.58, size = [1.3, 0.22, 0.16] }) {
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
        const active = index % accentEvery === 0
        const length = active ? size[0] * 1.45 : size[0]
        return (
          <mesh key={index} position={[x, 0, z]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[length, size[1], size[2]]} />
            <meshBasicMaterial color={active ? accentColor : color} transparent opacity={active ? opacity + 0.14 : opacity} />
          </mesh>
        )
      })}
    </group>
  )
}

function OrbitNode({ position, active = false, color = '#00F0FF', scale = 1 }) {
  const ringRef = useRef()
  const haloRef = useRef()

  useFrame((_, delta) => {
    if (ringRef.current) ringRef.current.rotation.z += delta * (active ? 1.4 : 0.82)
    if (haloRef.current) haloRef.current.rotation.y -= delta * 0.52
  })

  const glow = active ? '#D8FF43' : color

  return (
    <group position={position} scale={scale}>
      <mesh>
        <sphereGeometry args={[1.05, 18, 18]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={active ? 3.8 : 2.2} transparent opacity={0.95} />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.86, 0.08, 8, 64]} />
        <meshBasicMaterial color={glow} transparent opacity={0.68} />
      </mesh>
      <mesh ref={haloRef} rotation={[0.3, 0, 0]}>
        <torusGeometry args={[2.46, 0.05, 8, 96]} />
        <meshBasicMaterial color={active ? '#FF26A8' : '#00F0FF'} transparent opacity={active ? 0.72 : 0.38} />
      </mesh>
    </group>
  )
}

function CardConnector({ start, end, active, color, curveOffset = [0, 0, 0], curveLift = 6, nodeScale = 1 }) {
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
  const outerTube = useMemo(() => new THREE.TubeGeometry(curve, 56, active ? 0.115 : 0.085, 12, false), [curve, active])
  const innerTube = useMemo(() => new THREE.TubeGeometry(curve, 56, active ? 0.048 : 0.036, 10, false), [curve, active])

  return (
    <group>
      <mesh geometry={outerTube}>
        <meshBasicMaterial color={color} transparent opacity={active ? 0.17 : 0.08} />
      </mesh>
      <mesh geometry={innerTube}>
        <meshBasicMaterial color={active ? '#F2FF75' : color} transparent opacity={active ? 0.98 : 0.62} />
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
    <Html position={layout.cardPos} transform sprite distanceFactor={10.8}>
      <button type="button" className={cardClass} onClick={() => onSelect(section.id)}>
        <span className="section-about-card-grid" />
        <span className="section-about-card-accent" />
        <div className="section-about-card-header">
          <span className="section-about-card-icon">{layout.icon}</span>
          <span className="section-about-card-title">{section.title}</span>
        </div>
        {isSkills ? (
          <div className="section-about-skill-list">
            {skills.map((skill) => (
              <div key={skill}>{skill.toUpperCase()}</div>
            ))}
          </div>
        ) : (
          <p>{section.body}</p>
        )}
        <div className="section-about-card-footer">
          <span>{layout.kicker}</span>
          <span>{active ? 'Synced' : 'Orbit'}</span>
        </div>
      </button>
    </Html>
  )
}

function IdentityCore({ texture, themeColor, accentColor }) {
  const shellRef = useRef()
  const orbitersRef = useRef()

  useFrame((_, delta) => {
    if (shellRef.current) shellRef.current.rotation.y += delta * 0.08
    if (orbitersRef.current) orbitersRef.current.rotation.y -= delta * 0.22
  })

  return (
    <group position={CORE_CENTER}>
      <group ref={shellRef}>
        <mesh>
          <sphereGeometry args={[10.6, 72, 72]} />
          <meshBasicMaterial map={texture} color="#ffffff" transparent opacity={1} />
        </mesh>
        <mesh>
          <sphereGeometry args={[10.86, 54, 54]} />
          <meshBasicMaterial color="#63efff" transparent opacity={0.05} />
        </mesh>
        <mesh>
          <sphereGeometry args={[11.04, 48, 48]} />
          <meshBasicMaterial color="#8dfcff" wireframe transparent opacity={0.01} />
        </mesh>
      </group>

      <mesh>
        <sphereGeometry args={[9.7, 44, 44]} />
        <meshBasicMaterial color="#53f5ff" transparent opacity={0.045} />
      </mesh>

      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[12.8, 0.18, 10, 220]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.88} />
      </mesh>
      <mesh position={[0, 0.4, 0]} rotation={[Math.PI / 2, 0.18, 0]}>
        <torusGeometry args={[14.7, 0.07, 8, 220]} />
        <meshBasicMaterial color="#00F0FF" transparent opacity={0.38} />
      </mesh>

      <group ref={orbitersRef}>
        {[
          [15.2, 3.6, 0],
          [-13.8, -3.5, 5.2],
          [5.4, -7.2, -14.6],
        ].map((position, index) => (
          <mesh key={index} position={position}>
            <sphereGeometry args={[0.56 + index * 0.12, 14, 14]} />
            <meshBasicMaterial color={index === 1 ? '#FF26A8' : '#00F0FF'} transparent opacity={0.78} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function HoloBase({ accentColor }) {
  const ringRef = useRef()
  const outerRef = useRef()
  const { scene } = useGLTF(aboutBaseModelUrl)
  const baseScene = useMemo(() => scene.clone(), [scene])
  const fittedBase = useMemo(() => {
    const root = baseScene.clone()
    const box = new THREE.Box3().setFromObject(root)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    const targetWidth = 48
    const scale = size.x > 0 ? targetWidth / size.x : 1
    root.scale.setScalar(scale)

    const scaledBox = new THREE.Box3().setFromObject(root)
    const scaledCenter = new THREE.Vector3()
    scaledBox.getCenter(scaledCenter)
    const scaledMin = scaledBox.min.clone()

    root.position.set(-scaledCenter.x, -scaledMin.y, -scaledCenter.z)

    root.traverse((child) => {
      if (!child.isMesh) return
      child.castShadow = false
      child.receiveShadow = false
      if (child.material) {
        child.material = child.material.clone()
        if ('metalness' in child.material) child.material.metalness = Math.max(child.material.metalness ?? 0, 0.78)
        if ('roughness' in child.material) child.material.roughness = Math.min(child.material.roughness ?? 1, 0.34)
        if ('envMapIntensity' in child.material) child.material.envMapIntensity = 1.4
      }
    })

    return root
  }, [baseScene])

  useFrame((_, delta) => {
    if (ringRef.current) ringRef.current.rotation.z += delta * 0.12
    if (outerRef.current) outerRef.current.rotation.z -= delta * 0.05
  })

  return (
    <group position={[0, -11.8, 0]}>
      <primitive object={fittedBase} />
      <mesh position={[0, 12.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[16.8, 0.18, 10, 240]} />
        <meshBasicMaterial color="#00F0FF" transparent opacity={1} />
      </mesh>
      <mesh ref={ringRef} position={[0, 12.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[23.8, 0.08, 8, 240]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.84} />
      </mesh>
      <group ref={outerRef} position={[0, 12.74, 0]} rotation={[Math.PI / 2, 0, 0]}>
        {Array.from({ length: 34 }).map((_, index) => {
          const angle = (index / 34) * Math.PI * 2
          const x = Math.cos(angle) * 20.8
          const y = Math.sin(angle) * 20.8
          const active = index % 4 === 0
          return (
            <mesh key={index} position={[x, y, 0]} rotation={[0, 0, angle]}>
              <boxGeometry args={[active ? 2.1 : 1.25, 0.24, 0.16]} />
              <meshBasicMaterial color={active ? '#FF26A8' : '#00E5FF'} transparent opacity={active ? 0.78 : 0.42} />
            </mesh>
          )
        })}
      </group>
      <Html position={[0, 2.4, 0]} transform distanceFactor={12.6}>
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
      <mesh position={[64, 38, -42]}>
        <sphereGeometry args={[6.8, 32, 32]} />
        <meshStandardMaterial color="#1c2435" emissive="#7f9dff" emissiveIntensity={0.12} roughness={0.96} />
      </mesh>
      <mesh position={[-82, -44, -28]}>
        <sphereGeometry args={[15.6, 32, 32]} />
        <meshStandardMaterial color="#1f1a2b" emissive="#ff9a52" emissiveIntensity={0.08} roughness={0.99} />
      </mesh>
      <mesh position={[35, 18, 14]}>
        <sphereGeometry args={[2.1, 18, 18]} />
        <meshStandardMaterial color="#12384a" emissive="#4af8ff" emissiveIntensity={0.72} transparent opacity={0.72} />
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
      <ambientLight intensity={0.32} />
      <pointLight position={[0, 22, 18]} intensity={2.8} color="#73f8ff" distance={200} />
      <pointLight position={[0, -8, -14]} intensity={1.05} color="#ff2da8" distance={140} />
      <pointLight position={[12, 6, 24]} intensity={0.86} color="#d6ff52" distance={120} />

      <EnvironmentDecor />
      <HoloBase accentColor={zone.accentColor} />

      <OrbitTrack radius={15.8} tube={0.2} y={CORE_CENTER[1] - 0.2} color={zone.accentColor} opacity={0.98} speed={0.18} />
      <OrbitTrack radius={25.4} tube={0.08} y={CORE_CENTER[1] - 2.4} rotation={[Math.PI / 2, 0.16, 0]} color="#00E8FF" opacity={0.34} speed={-0.06} />
      <OrbitTrack radius={36.8} tube={0.06} y={CORE_CENTER[1] + 3.9} rotation={[Math.PI / 2, -0.22, 0]} color="#09c8ff" opacity={0.2} speed={0.035} />
      <GlyphRing radius={20.4} count={92} y={CORE_CENTER[1] + 1.5} speed={0.065} color="#00F0FF" accentColor="#FF26A8" opacity={0.46} size={[1.45, 0.24, 0.16]} />
      <GlyphRing radius={29.6} count={72} y={CORE_CENTER[1] - 9.8} rotation={[Math.PI / 2, 0.02, 0]} speed={-0.025} color="#2ce8ff" accentColor="#ADFF00" opacity={0.34} size={[1.55, 0.2, 0.14]} />

      <IdentityCore texture={texture} themeColor={zone.themeColor} accentColor={zone.accentColor} />

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
