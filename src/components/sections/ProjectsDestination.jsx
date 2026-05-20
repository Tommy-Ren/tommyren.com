import { Html, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useEffect, useMemo, useRef, useState } from 'react'
import projectStationModelUrl from '../../assets/3D/project_station.glb'

const STATION_POSITION = [0, 0, 0]
const NODE_CENTER = [0, 8.8, 0]
const NODE_RING_RADIUS_X = 31
const NODE_RING_RADIUS_Z = 24
const DETAIL_PANEL_POSITION = [34, 14.5, 7]
const DETAIL_PANEL_ANCHOR = [24, 9.6, 5]
const TITLE_PLATE_POSITION = [0, 24.2, 1.5]

const PROJECT_ICONS = {
  'cyber-sphere-portfolio': '</>',
  'planetary-autopilot': '◎',
  'adaptive-experience-layer': '◫',
}

function toVec3(list) {
  return new THREE.Vector3(list[0], list[1], list[2])
}

function buildNodePosition(index, total) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2
  return [
    Math.cos(angle) * NODE_RING_RADIUS_X,
    8 + Math.sin(angle * 2) * 1.15,
    Math.sin(angle) * NODE_RING_RADIUS_Z,
  ]
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

function ProjectNode({ project, index, total, selected, onSelect, showDetails = true }) {
  const groupRef = useRef()
  const ringRef = useRef()
  const label = project.shortTitle || project.title
  const position = useMemo(() => buildNodePosition(index, total), [index, total])
  const icon = PROJECT_ICONS[project.id] || '◇'
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
      const baseScale = selected ? 1.12 : 1
      const pulse = 1 + Math.sin(state.clock.elapsedTime * (selected ? 3.0 : 1.55) + index) * (selected ? 0.04 : 0.015)
      groupRef.current.scale.lerp(new THREE.Vector3(baseScale * pulse, baseScale * pulse, baseScale * pulse), delta * 5)
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * (selected ? 0.88 : 0.38)
    }
  })

  return (
    <group ref={groupRef} position={position}>
      <ProjectConnector start={NODE_CENTER} end={position} active={selected} />

      <mesh onClick={handleSelect}>
        <cylinderGeometry args={[2.7, 3.28, 3.1, 10]} />
        <meshStandardMaterial color="#0f1724" emissive={selected ? '#ff36b7' : '#00ddff'} emissiveIntensity={selected ? 1.55 : 0.72} metalness={0.86} roughness={0.32} />
      </mesh>
      <mesh position={[0, 1.62, 0]} onClick={handleSelect}>
        <boxGeometry args={[2.95, 2.42, 2.42]} />
        <meshStandardMaterial color="#112130" emissive={selected ? '#ff36b7' : '#20e8ff'} emissiveIntensity={selected ? 1.08 : 0.48} metalness={0.66} roughness={0.27} />
      </mesh>
      <mesh position={[0, 1.66, 1.22]}>
        <planeGeometry args={[2.0, 1.62]} />
        <meshBasicMaterial color={selected ? '#ff9ce0' : '#adf4ff'} transparent opacity={0.84} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4.15, 0.09, 8, 84]} />
        <meshBasicMaterial color={selected ? '#ff36b7' : '#00deff'} transparent opacity={selected ? 0.92 : 0.4} />
      </mesh>

      <Html center position={[0, 1.66, 1.36]} transform sprite distanceFactor={12.5}>
        <button
          type="button"
          className={`section-project-node-face ${selected ? 'active' : ''}`}
          onClick={handleSelect}
          onPointerDown={stopHtmlPropagation}
          aria-label={`Open project ${project.title}`}
        >
          <span className="section-project-node-num">{number}</span>
          <span className="section-project-node-icon">{icon}</span>
        </button>
      </Html>

      {showDetails && (
        <Html center position={[0, 5.85, 0]} transform sprite distanceFactor={18}>
          <div className={`section-project-node-label ${selected ? 'active' : ''}`}>{label}</div>
        </Html>
      )}
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

function ProjectDetailPanel({ project }) {
  const featurePreview = project.features?.slice(0, 3) || []
  const actionMap = Object.fromEntries((project.actions || []).map((action) => [action.label.toLowerCase(), action]))
  const liveAction = actionMap['live site'] || actionMap.demo || project.actions?.[0] || null
  const sourceAction = actionMap.source || actionMap.github || project.actions?.[1] || null
  const hasAnyAction = Boolean(liveAction || sourceAction)

  return (
    <>
      <ProjectConnector start={DETAIL_PANEL_ANCHOR} end={DETAIL_PANEL_POSITION} active magenta={!!sourceAction} />
      <Html position={DETAIL_PANEL_POSITION} transform distanceFactor={15}>
        <div className="section-project-panel section-project-panel-world">
          <div className="section-project-panel-grid" />
          <div className="section-project-panel-header">
            <div>
              <div className="section-project-panel-kicker">Project Dockyard</div>
              <h3>{project.title}</h3>
            </div>
            <div className="section-project-panel-index">{String(project.index ?? 1).padStart(2, '0')}</div>
          </div>

          <p className="section-project-panel-summary">{project.summary}</p>

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
            {project.technologies.map((tech) => <span key={tech} className="section-mini-chip">{tech}</span>)}
          </div>

          <div className="section-action-row section-project-actions">
            {liveAction && (
              <a
                className="section-action-chip section-project-action-primary"
                href={liveAction.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${project.title} demo`}
              >
                Demo
              </a>
            )}
            {sourceAction && (
              <a
                className="section-action-chip section-project-action-secondary"
                href={sourceAction.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${project.title} GitHub repository`}
              >
                GitHub
              </a>
            )}
            {!hasAnyAction && (
              <span className="section-action-chip muted">Coming Soon</span>
            )}
          </div>
        </div>
      </Html>
    </>
  )
}

export default function ProjectsDestination({ zone, selectedId, onSelect, lowSpec = false }) {
  const [keyboardIndex, setKeyboardIndex] = useState(0)
  const projects = zone.content.projects
  const selectedProject = selectedId ? projects.find((item) => item.id === selectedId) || null : null
  const activeProject = selectedProject || projects[keyboardIndex] || projects[0] || null

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

      {projects.map((project, index) => (
        <ProjectNode
          key={project.id}
          project={{ ...project, index: index + 1 }}
          index={index}
          total={projects.length}
          selected={project.id === selectedId}
          onSelect={onSelect}
          showDetails={!lowSpec}
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
          project={{
            ...selectedProject,
            index: Math.max(1, projects.findIndex((item) => item.id === selectedProject.id) + 1),
          }}
        />
      )}
    </group>
  )
}

useGLTF.preload(projectStationModelUrl)
