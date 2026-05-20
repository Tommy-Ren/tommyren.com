import { Html, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useEffect, useMemo, useRef, useState } from 'react'
import projectStationModelUrl from '../../assets/3D/project_station.glb'
import projectIconAtlasUrl from '../../assets/icon.png'
import { getProjectLinks, getProjectStatusLabel, PROJECT_NODE_LAYOUT } from '../../data/projects'
import { getProjectIconStyle, getProjectIconUv } from '../projects/projectIcons'

const STATION_POSITION = [0, 0, 0]
const NODE_CENTER = [0, 8.8, 0]
const TITLE_PLATE_POSITION = [0, 24.2, 1.5]
const PROJECT_NODE_FALLBACK = [0, 12, -18]

function toVec3(list) {
  return new THREE.Vector3(list[0], list[1], list[2])
}

function addVec3(base, offset = [0, 0, 0]) {
  return [
    (base?.[0] || 0) + (offset?.[0] || 0),
    (base?.[1] || 0) + (offset?.[1] || 0),
    (base?.[2] || 0) + (offset?.[2] || 0),
  ]
}

function ProjectIconSprite({ icon, className = '' }) {
  return (
    <span
      className={className}
      style={getProjectIconStyle(icon)}
      aria-hidden="true"
    />
  )
}

function useIconAtlasTexture() {
  return useMemo(() => {
    const texture = new THREE.TextureLoader().load(projectIconAtlasUrl)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.magFilter = THREE.LinearFilter
    texture.minFilter = THREE.LinearMipMapLinearFilter
    return texture
  }, [])
}

function StarBackdrop({ lowSpec = false }) {
  const stars = useMemo(() => {
    const count = lowSpec ? 1400 : 2600
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const radius = 190 + Math.random() * 230
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const sinPhi = Math.sin(phi)
      const idx = i * 3
      positions[idx] = Math.cos(theta) * sinPhi * radius
      positions[idx + 1] = Math.cos(phi) * radius
      positions[idx + 2] = Math.sin(theta) * sinPhi * radius

      const whiteMix = 0.78 + Math.random() * 0.22
      colors[idx] = 0.56 * whiteMix
      colors[idx + 1] = 0.78 * whiteMix
      colors[idx + 2] = 1.0 * whiteMix
    }
    return { positions, colors }
  }, [lowSpec])

  return (
    <group>
      <mesh>
        <sphereGeometry args={[380, 40, 40]} />
        <meshBasicMaterial color="#030816" side={THREE.BackSide} fog={false} depthWrite={false} />
      </mesh>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={stars.positions} count={stars.positions.length / 3} itemSize={3} />
          <bufferAttribute attach="attributes-color" array={stars.colors} count={stars.colors.length / 3} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={lowSpec ? 0.78 : 0.96} sizeAttenuation vertexColors transparent opacity={0.94} depthWrite={false} />
      </points>
      <mesh position={[0, 16, -145]}>
        <sphereGeometry args={[104, 28, 28]} />
        <meshBasicMaterial color="#08203c" transparent opacity={0.05} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  )
}

function OrbitEnergyBand({ radius = 31.5, opacity = 0.42, speed = 0.06, y = 6.8, color = '#00e4ff', segments = 240 }) {
  const ref = useRef()

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.z += delta * speed
  })

  return (
    <group ref={ref} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh>
        <torusGeometry args={[radius, 0.08, 8, segments]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
    </group>
  )
}

function OrbitTicks({ radius = 30.8, count = 64, y = 6.8 }) {
  return (
    <group position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      {Array.from({ length: count }).map((_, index) => {
        const angle = (index / count) * Math.PI * 2
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        const bright = index % 8 === 0
        return (
          <mesh key={index} position={[x, 0, z]} rotation={[0, 0, angle]}>
            <boxGeometry args={[bright ? 2.1 : 1.1, bright ? 0.2 : 0.12, 0.12]} />
            <meshBasicMaterial color={bright ? '#ff40bd' : '#18dbff'} transparent opacity={bright ? 0.5 : 0.18} />
          </mesh>
        )
      })}
    </group>
  )
}

function HoloReactor({ accentColor = '#00F0FF', lowSpec = false }) {
  const crystalRef = useRef()
  const shellRef = useRef()
  const pulseRef = useRef()
  const ringRef = useRef()

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    if (crystalRef.current) {
      crystalRef.current.rotation.y += delta * 0.24
      crystalRef.current.position.y = 0.85 + Math.sin(t * 1.25) * 0.16
    }
    if (shellRef.current) shellRef.current.rotation.y -= delta * 0.08
    if (ringRef.current) ringRef.current.rotation.z += delta * 0.2
    if (pulseRef.current) {
      pulseRef.current.opacity = 0.6 + Math.sin(t * 1.7) * 0.12
    }
  })

  return (
    <group position={[0, 11.8, 0]}>
      <group ref={shellRef}>
        <mesh>
          <cylinderGeometry args={[6.9, 6.9, 11.8, lowSpec ? 22 : 36, 1, true]} />
          <meshBasicMaterial color="#14e4ff" transparent opacity={0.14} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[6.15, 6.15, 11.4, lowSpec ? 18 : 28, 1, true]} />
          <meshBasicMaterial color="#5ef4ff" wireframe transparent opacity={0.18} depthWrite={false} />
        </mesh>
      </group>

      <mesh ref={ringRef} position={[0, -4.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[8.8, 0.14, 10, 240]} />
        <meshBasicMaterial ref={pulseRef} color="#00F0FF" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 3.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[7.6, 0.07, 10, 220]} />
        <meshBasicMaterial color="#ff46c1" transparent opacity={0.26} />
      </mesh>
      <mesh ref={crystalRef} position={[0, 0.85, 0]}>
        <octahedronGeometry args={[5.3, 0]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.82} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <octahedronGeometry args={[6.55, 0]} />
        <meshBasicMaterial color="#c4fdff" wireframe transparent opacity={0.24} depthWrite={false} />
      </mesh>
      {!lowSpec && (
        <mesh position={[0, 0.9, 0]}>
          <sphereGeometry args={[8.5, 26, 26]} />
          <meshBasicMaterial color="#1ae6ff" transparent opacity={0.05} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      )}
    </group>
  )
}

function DockyardParticles({ lowSpec = false }) {
  const ref = useRef()
  const particles = useMemo(() => {
    const count = lowSpec ? 24 : 48
    return Array.from({ length: count }).map((_, index) => {
      const angle = (index / count) * Math.PI * 2
      const radius = 16 + (index % 6) * 2.6 + Math.random() * 2.2
      return {
        base: [Math.cos(angle) * radius, 7.4 + Math.sin(angle * 1.85) * 6.2, Math.sin(angle) * radius],
        color: index % 9 === 0 ? '#ff44bf' : '#18e6ff',
        size: 0.2 + Math.random() * 0.3,
      }
    })
  }, [lowSpec])

  useFrame((state) => {
    if (!ref.current) return
    ref.current.children.forEach((child, index) => {
      const particle = particles[index]
      const t = state.clock.elapsedTime * 0.42 + index * 0.58
      child.position.set(
        particle.base[0] + Math.sin(t) * 0.85,
        particle.base[1] + Math.cos(t * 1.15) * 0.75,
        particle.base[2] + Math.sin(t * 0.86) * 0.82,
      )
      child.rotation.x += 0.01
      child.rotation.y += 0.013
    })
  })

  return (
    <group ref={ref}>
      {particles.map((particle, index) => (
        <mesh key={index} position={particle.base}>
          <boxGeometry args={[particle.size * 2.8, particle.size * 0.5, particle.size]} />
          <meshBasicMaterial color={particle.color} transparent opacity={particle.color === '#ff44bf' ? 0.5 : 0.26} />
        </mesh>
      ))}
    </group>
  )
}

function ProjectConnector({ start, end, active = false, magenta = false }) {
  const lineMaterialRef = useRef()

  const curve = useMemo(() => {
    const a = toVec3(start)
    const b = toVec3(end)
    const midA = a.clone().lerp(b, 0.28)
    const midB = a.clone().lerp(b, 0.72)
    midA.y += 2.8
    midB.y += 1.2
    return new THREE.CatmullRomCurve3([a, midA, midB, b])
  }, [start, end])

  const tube = useMemo(
    () => new THREE.TubeGeometry(curve, 52, active ? 0.095 : 0.05, 8, false),
    [curve, active]
  )

  useFrame((state) => {
    if (lineMaterialRef.current) {
      lineMaterialRef.current.opacity = (active ? 0.78 : 0.22) + Math.sin(state.clock.elapsedTime * 2.2) * (active ? 0.08 : 0.03)
    }
  })

  return (
    <mesh geometry={tube}>
      <meshBasicMaterial
        ref={lineMaterialRef}
        color={magenta ? '#ff43bb' : (active ? '#dbffff' : '#16ddff')}
        transparent
        opacity={active ? 0.78 : 0.22}
      />
    </mesh>
  )
}

function ProjectNodeScreen({ icon, selected, hovered }) {
  const atlasTexture = useIconAtlasTexture()
  const tileTexture = useMemo(() => {
    const texture = atlasTexture.clone()
    const uv = getProjectIconUv(icon)
    texture.offset.set(uv.offsetX, uv.offsetY)
    texture.repeat.set(uv.repeatX, uv.repeatY)
    texture.needsUpdate = true
    return texture
  }, [atlasTexture, icon])

  return (
    <group position={[0, 1.64, 1.38]}>
      <mesh>
        <planeGeometry args={[2.6, 2.6]} />
        <meshBasicMaterial
          color={selected ? '#11111a' : '#08111a'}
          transparent
          opacity={selected ? 0.98 : 0.92}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[2.08, 2.08]} />
        <meshBasicMaterial
          map={tileTexture}
          transparent
          opacity={selected ? 1 : hovered ? 0.98 : 0.92}
          color={selected ? '#ffffff' : hovered ? '#dbffff' : '#9ff5ff'}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[2.28, 2.28]} />
        <meshBasicMaterial
          color={selected ? '#ff53c8' : hovered ? '#7cf4ff' : '#18dcff'}
          transparent
          opacity={selected ? 0.22 : hovered ? 0.16 : 0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

function ProjectNode({
  project,
  index,
  position,
  selected,
  hovered,
  onSelect,
  onHoverStart,
  onHoverEnd,
}) {
  const groupRef = useRef()
  const ringRef = useRef()
  const label = project.shortTitle || project.title
  const number = String(index + 1).padStart(2, '0')

  const handleSelect = (event) => {
    event?.stopPropagation?.()
    onSelect(project.id)
  }

  const stopHtmlPropagation = (event) => {
    event.stopPropagation()
  }

  useFrame((state, delta) => {
    if (groupRef.current) {
      const baseScale = selected ? 1.12 : (hovered ? 1.05 : 1)
      const pulse = 1 + Math.sin(state.clock.elapsedTime * (selected ? 3.0 : hovered ? 2.1 : 1.55) + index) * (selected ? 0.04 : hovered ? 0.022 : 0.015)
      groupRef.current.scale.lerp(new THREE.Vector3(baseScale * pulse, baseScale * pulse, baseScale * pulse), delta * 5)
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * (selected ? 0.88 : hovered ? 0.52 : 0.38)
    }
  })

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerEnter={onHoverStart}
      onPointerLeave={onHoverEnd}
    >
      <ProjectConnector start={NODE_CENTER} end={position} active={selected || hovered} />

      <mesh onClick={handleSelect}>
        <cylinderGeometry args={[1.64, 1.9, 0.82, 18]} />
        <meshStandardMaterial color="#121520" emissive={selected ? '#ff36b7' : hovered ? '#59eeff' : '#00ddff'} emissiveIntensity={selected ? 1.3 : hovered ? 0.82 : 0.52} metalness={0.9} roughness={0.24} />
      </mesh>
      <mesh position={[0, 0.38, 0]} onClick={handleSelect}>
        <cylinderGeometry args={[1.98, 2.28, 0.46, 18]} />
        <meshStandardMaterial color="#181c28" emissive={selected ? '#ff36b7' : hovered ? '#59eeff' : '#1bdcff'} emissiveIntensity={selected ? 0.82 : hovered ? 0.42 : 0.22} metalness={0.84} roughness={0.3} />
      </mesh>
      <ProjectNodeScreen icon={project.icon} selected={selected} hovered={hovered} />
      <mesh ref={ringRef} position={[0, -0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.78, 0.08, 8, 84]} />
        <meshBasicMaterial color={selected ? '#ff36b7' : hovered ? '#7cf4ff' : '#00deff'} transparent opacity={selected ? 0.94 : hovered ? 0.54 : 0.24} />
      </mesh>

      <mesh
        position={[0, 1.56, 1.58]}
        onClick={handleSelect}
        onPointerEnter={onHoverStart}
        onPointerLeave={onHoverEnd}
      >
        <planeGeometry args={[2.3, 2.3]} />
        <meshBasicMaterial transparent opacity={0.01} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <Html center position={[0, 3.12, 0.28]} transform sprite distanceFactor={22}>
        <button
          type="button"
          className={`section-project-node-face section-project-node-face-chip ${selected ? 'active' : ''} ${hovered ? 'hovered' : ''}`}
          onClick={handleSelect}
          onPointerDown={stopHtmlPropagation}
          onPointerEnter={onHoverStart}
          onPointerLeave={onHoverEnd}
          aria-label={`Open project ${project.title}`}
          aria-pressed={selected}
        >
          <span className="section-project-node-chip-title">{label}</span>
        </button>
      </Html>
    </group>
  )
}

function ProjectStationModel({ lowSpec = false }) {
  const stationRef = useRef()
  const { scene } = useGLTF(projectStationModelUrl)

  const fittedScene = useMemo(() => {
    const root = scene.clone()
    const box = new THREE.Box3().setFromObject(root)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)

    const targetWidth = 112
    const scale = size.x > 0 ? targetWidth / size.x : 1
    root.scale.setScalar(scale)

    const scaledBox = new THREE.Box3().setFromObject(root)
    const scaledCenter = new THREE.Vector3()
    const scaledMin = scaledBox.min.clone()
    scaledBox.getCenter(scaledCenter)

    root.position.set(-scaledCenter.x, -scaledMin.y - 2.4, -scaledCenter.z)

    root.traverse((child) => {
      if (!child.isMesh) return
      child.castShadow = false
      child.receiveShadow = false
      if (child.material) {
        child.material = child.material.clone()
        if ('metalness' in child.material) child.material.metalness = Math.max(child.material.metalness ?? 0, 0.44)
        if ('roughness' in child.material) child.material.roughness = Math.min(child.material.roughness ?? 1, 0.76)
        if ('envMapIntensity' in child.material) child.material.envMapIntensity = 1.1
        if ('emissiveIntensity' in child.material) child.material.emissiveIntensity = Math.max(child.material.emissiveIntensity ?? 0, 0.18)
      }
    })

    return root
  }, [scene])

  useFrame((state) => {
    if (stationRef.current) {
      stationRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.11) * 0.028
      stationRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.42) * 0.34
    }
  })

  return (
    <group ref={stationRef} position={STATION_POSITION}>
      <primitive object={fittedScene} />
      <OrbitEnergyBand radius={31.8} opacity={0.42} speed={0.055} y={7.2} color="#00e4ff" />
      <OrbitEnergyBand radius={27.1} opacity={0.16} speed={-0.025} y={6.9} color="#18dcff" />
      <OrbitTicks radius={31.0} y={7.2} />
      <HoloReactor accentColor="#00F0FF" lowSpec={lowSpec} />
      <DockyardParticles lowSpec={lowSpec} />
    </group>
  )
}

function ProjectDetailPanel({ project, selectedNodePosition, panelAnchor, onClose, isMobile = false }) {
  const featurePreview = project.highlights?.slice(0, 3) || []
  const actions = getProjectLinks(project)
  const hasAnyAction = actions.length > 0
  const actionTone = actions.some((action) => action.id === 'github')
  const statusLabel = getProjectStatusLabel(project)
  const panelPosition = panelAnchor || selectedNodePosition || PROJECT_NODE_FALLBACK
  const panelDotPosition = panelAnchor
    ? [panelAnchor[0] - 1.5, panelAnchor[1] + 0.8, panelAnchor[2] - 0.2]
    : panelPosition

  return (
    <>
      {selectedNodePosition && panelPosition && (
        <ProjectConnector start={selectedNodePosition} end={panelDotPosition} active magenta={actionTone} />
      )}
      <mesh position={panelDotPosition}>
        <sphereGeometry args={[0.34, 18, 18]} />
        <meshBasicMaterial color={actionTone ? '#ff43bb' : '#00deff'} transparent opacity={0.92} />
      </mesh>
      {isMobile ? (
        <Html fullscreen zIndexRange={[2600, 2600]}>
          <div className="section-project-panel-shell mobile">
            <div className="section-project-panel section-project-panel-dock mobile">
              <div className="section-project-panel-grid" />
              <div className="section-project-panel-header">
                <div className="section-project-panel-lead">
                  <ProjectIconSprite icon={project.icon} className="section-project-panel-icon" />
                  <div>
                    <div className="section-project-panel-kicker">Project Dockyard</div>
                    <h3>{project.title}</h3>
                  </div>
                </div>
                <div className="section-project-panel-header-meta">
                  <div className="section-project-panel-index">{String(project.index ?? 1).padStart(2, '0')}</div>
                  <button
                    type="button"
                    className="section-project-panel-close"
                    onClick={onClose}
                    aria-label={`Close ${project.title} panel`}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="section-project-panel-meta-row">
                <span className="section-project-status">{statusLabel}</span>
                {project.shortTitle && <span className="section-project-shorttitle">{project.shortTitle}</span>}
              </div>

              <p className="section-project-panel-summary">{project.description}</p>

              {project.role && (
                <div className="section-project-panel-block">
                  <div className="section-project-panel-label">Role</div>
                  <div className="section-project-panel-copy">{project.role}</div>
                </div>
              )}

              {featurePreview.length > 0 && (
                <div className="section-project-panel-block">
                  <div className="section-project-panel-label">Highlights</div>
                  <ul className="section-project-panel-list">
                    {featurePreview.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="section-chip-row section-project-chip-row">
                {(project.tech || []).map((tech) => <span key={tech} className="section-mini-chip">{tech}</span>)}
              </div>

              <div className="section-action-row section-project-actions">
                {actions.map((action) => (
                  <a
                    key={action.id}
                    className={`section-action-chip ${action.id === 'github' ? 'section-project-action-secondary' : 'section-project-action-primary'}`}
                    href={action.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${project.title} ${action.label}`}
                  >
                    {action.id === 'github' ? 'Code' : action.label}
                  </a>
                ))}
                {!hasAnyAction && (
                  <span className="section-action-chip muted">Coming Soon</span>
                )}
              </div>
            </div>
          </div>
        </Html>
      ) : (
        <Html fullscreen zIndexRange={[2600, 2600]}>
          <div className="section-project-panel-shell desktop">
            <div className="section-project-panel section-project-panel-dock desktop">
              <div className="section-project-panel-grid" />
              <div className="section-project-panel-header">
                <div className="section-project-panel-lead">
                  <ProjectIconSprite icon={project.icon} className="section-project-panel-icon" />
                  <div>
                    <div className="section-project-panel-kicker">Project Dockyard</div>
                    <h3>{project.title}</h3>
                  </div>
                </div>
                <div className="section-project-panel-header-meta">
                  <div className="section-project-panel-index">{String(project.index ?? 1).padStart(2, '0')}</div>
                  <button
                    type="button"
                    className="section-project-panel-close"
                    onClick={onClose}
                    aria-label={`Close ${project.title} panel`}
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="section-project-panel-meta-row">
                <span className="section-project-status">{statusLabel}</span>
                {project.shortTitle && <span className="section-project-shorttitle">{project.shortTitle}</span>}
              </div>

              <p className="section-project-panel-summary">{project.description}</p>

              {project.role && (
                <div className="section-project-panel-block">
                  <div className="section-project-panel-label">Role</div>
                  <div className="section-project-panel-copy">{project.role}</div>
                </div>
              )}

              {featurePreview.length > 0 && (
                <div className="section-project-panel-block">
                  <div className="section-project-panel-label">Highlights</div>
                  <ul className="section-project-panel-list">
                    {featurePreview.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="section-chip-row section-project-chip-row">
                {(project.tech || []).map((tech) => <span key={tech} className="section-mini-chip">{tech}</span>)}
              </div>

              <div className="section-action-row section-project-actions">
                {actions.map((action) => (
                  <a
                    key={action.id}
                    className={`section-action-chip ${action.id === 'github' ? 'section-project-action-secondary' : 'section-project-action-primary'}`}
                    href={action.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${project.title} ${action.label}`}
                  >
                    {action.id === 'github' ? 'Code' : action.label}
                  </a>
                ))}
                {!hasAnyAction && (
                  <span className="section-action-chip muted">Coming Soon</span>
                )}
              </div>
            </div>
          </div>
        </Html>
      )}
    </>
  )
}

export default function ProjectsDestination({ zone, selectedId, onSelect, lowSpec = false }) {
  const [keyboardIndex, setKeyboardIndex] = useState(0)
  const [hoveredProjectId, setHoveredProjectId] = useState(null)
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(max-width: 900px)').matches
  })
  const projects = zone.content.projects || []
  const dockNodes = useMemo(() => {
    const projectById = Object.fromEntries(projects.map((project) => [project.id, project]))
    return PROJECT_NODE_LAYOUT
      .map((node, index) => ({
        id: node.id,
        index,
        position: node.position,
        panelOffset: node.panelOffset || [0, 6, 8],
        project: projectById[node.id] || null,
      }))
      .filter((node) => node.project)
  }, [projects])
  const nodePositions = useMemo(
    () => Object.fromEntries(
      dockNodes.map((node) => [node.id, node.position])
    ),
    [dockNodes]
  )
  const selectedProject = selectedId ? projects.find((item) => item.id === selectedId) || null : null
  const selectedDockNode = selectedProject ? dockNodes.find((node) => node.project.id === selectedProject.id) || null : null
  const selectedNodePosition = selectedProject ? (nodePositions[selectedProject.id] || PROJECT_NODE_FALLBACK) : null
  const selectedPanelAnchor = selectedDockNode && selectedNodePosition
    ? addVec3(selectedNodePosition, selectedDockNode.panelOffset)
    : null
  const activeProject = selectedProject || projects[keyboardIndex] || projects[0] || null

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const media = window.matchMedia('(max-width: 900px)')
    const sync = (event) => setIsMobile(event.matches)

    setIsMobile(media.matches)
    if (media.addEventListener) {
      media.addEventListener('change', sync)
      return () => media.removeEventListener('change', sync)
    }
    media.addListener(sync)
    return () => media.removeListener(sync)
  }, [])

  useEffect(() => {
    const selectedIndex = projects.findIndex((item) => item.id === selectedId)
    if (selectedIndex >= 0) {
      setKeyboardIndex(selectedIndex)
      return
    }
    setKeyboardIndex((currentIndex) => {
      if (!projects.length) return 0
      return Math.min(currentIndex, projects.length - 1)
    })
  }, [projects, selectedId])

  useEffect(() => {
    let touchStartX = 0
    let touchStartY = 0

    const onTouchStart = (event) => {
      if (!event.touches || event.touches.length !== 1) return
      touchStartX = event.touches[0].clientX
      touchStartY = event.touches[0].clientY
    }

    const onTouchEnd = (event) => {
      if (!projects.length || !event.changedTouches || event.changedTouches.length !== 1) return
      const dx = event.changedTouches[0].clientX - touchStartX
      const dy = event.changedTouches[0].clientY - touchStartY
      if (Math.abs(dx) < 36 || Math.abs(dx) < Math.abs(dy) * 1.15) return
      const current = selectedId
        ? Math.max(0, projects.findIndex((item) => item.id === selectedId))
        : keyboardIndex
      const next = dx < 0
        ? (current + 1) % projects.length
        : (current - 1 + projects.length) % projects.length
      setKeyboardIndex(next)
      onSelect(projects[next].id)
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [keyboardIndex, onSelect, projects, selectedId])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!projects.length) return
      const current = selectedId
        ? Math.max(0, projects.findIndex((item) => item.id === selectedId))
        : keyboardIndex
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        const next = (current + 1) % projects.length
        setKeyboardIndex(next)
        onSelect(projects[next].id)
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        const next = (current - 1 + projects.length) % projects.length
        setKeyboardIndex(next)
        onSelect(projects[next].id)
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        const targetProject = projects[keyboardIndex] || activeProject
        if (targetProject) onSelect(targetProject.id)
      }
      if (event.key === 'Escape' && selectedId) {
        event.preventDefault()
        onSelect(selectedId)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeProject, keyboardIndex, onSelect, projects, selectedId])

  return (
    <group position={zone.anchorPosition}>
      <ambientLight intensity={0.34} />
      <directionalLight position={[18, 22, 18]} intensity={1.45} color="#e7fbff" />
      <pointLight position={[0, 13, 9]} intensity={2.1} color="#00F0FF" distance={150} />
      <pointLight position={[22, 10, 18]} intensity={1.05} color="#ff35b6" distance={95} />
      <pointLight position={[-18, 11, 6]} intensity={0.72} color="#5fe9ff" distance={90} />

      <StarBackdrop lowSpec={lowSpec} />
      <ProjectStationModel lowSpec={lowSpec} />

      {dockNodes.map((node) => (
        <ProjectNode
          key={node.project.id}
          project={node.project}
          index={node.index}
          position={node.position}
          selected={node.project.id === selectedId}
          hovered={node.project.id === hoveredProjectId}
          onSelect={onSelect}
          onHoverStart={() => setHoveredProjectId(node.project.id)}
          onHoverEnd={() => setHoveredProjectId((current) => (current === node.project.id ? null : current))}
        />
      ))}

      <Html position={TITLE_PLATE_POSITION} transform sprite distanceFactor={14}>
        <div className="section-project-titleplate">
          <div className="section-project-title">PROJECT DOCKYARD</div>
          <div className="section-project-subtitle">Creation Yard</div>
        </div>
      </Html>

      {selectedProject && (
        <ProjectDetailPanel
          project={selectedProject}
          selectedNodePosition={selectedNodePosition}
          panelAnchor={selectedPanelAnchor}
          onClose={() => onSelect(selectedProject.id)}
          isMobile={isMobile}
        />
      )}
    </group>
  )
}

useGLTF.preload(projectStationModelUrl)
