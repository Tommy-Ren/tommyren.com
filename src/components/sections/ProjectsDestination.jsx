import { Html } from '@react-three/drei'

function ProjectModule({ project, anchor, active, onSelect }) {
  const color = active ? '#00F0FF' : '#FF0055'
  return (
    <group position={anchor.position}>
      <mesh onClick={() => onSelect(project.id)}>
        <boxGeometry args={[8, 4.6, 8]} />
        <meshStandardMaterial color={'#08111f'} emissive={color} emissiveIntensity={active ? 1.5 : 0.7} metalness={0.45} roughness={0.28} />
      </mesh>
      <mesh rotation={[0, 0.6, 0]}>
        <octahedronGeometry args={[3.4, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 1.2 : 0.5} wireframe />
      </mesh>
      <Html center distanceFactor={18}>
        <button className={`section-node-chip ${active ? 'active' : ''}`} onClick={() => onSelect(project.id)}>
          {project.title}
        </button>
      </Html>
    </group>
  )
}

export default function ProjectsDestination({ zone, selectedId, onSelect }) {
  const selected = zone.content.projects.find((item) => item.id === selectedId) || zone.content.projects[0]

  return (
    <group>
      <mesh position={zone.anchorPosition}>
        <torusKnotGeometry args={[7, 1.4, 160, 24]} />
        <meshStandardMaterial color={zone.themeColor} emissive={zone.themeColor} emissiveIntensity={0.8} roughness={0.24} metalness={0.6} />
      </mesh>
      {zone.focusTargets.map((target, index) => (
        <ProjectModule
          key={target.id}
          anchor={target}
          project={zone.content.projects[index]}
          active={zone.content.projects[index].id === selected.id}
          onSelect={onSelect}
        />
      ))}
      <Html position={[zone.anchorPosition[0], zone.anchorPosition[1] + 12, zone.anchorPosition[2]]} distanceFactor={11} transform sprite>
        <div className="section-floating-copy wide">
          <div className="section-floating-kicker">Projects</div>
          <h3>{selected.title}</h3>
          <p>{selected.summary}</p>
          <div className="section-chip-row">
            {selected.technologies.map((tech) => <span key={tech} className="section-mini-chip">{tech}</span>)}
          </div>
          <div className="section-action-row">
            {selected.actions.length > 0
              ? selected.actions.map((action) => (
                <a key={action.label} className="section-action-chip" href={action.href} target="_blank" rel="noreferrer">{action.label}</a>
              ))
              : <span className="section-action-chip muted">Docked Module</span>}
          </div>
        </div>
      </Html>
    </group>
  )
}
