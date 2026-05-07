import { Html } from '@react-three/drei'

function LayerNode({ node, active, onSelect }) {
  return (
    <group position={node.position}>
      <mesh onClick={() => onSelect(node.id)}>
        <cylinderGeometry args={[2.2, 2.2, 2.6, 24]} />
        <meshStandardMaterial color={active ? '#FF0055' : '#00F0FF'} emissive={active ? '#FF0055' : '#00F0FF'} emissiveIntensity={active ? 1.8 : 0.75} />
      </mesh>
      <Html center distanceFactor={18}>
        <button className={`section-node-chip ${active ? 'active' : ''}`} onClick={() => onSelect(node.id)}>
          {node.label}
        </button>
      </Html>
    </group>
  )
}

function renderResumeCopy(zone, selectedId) {
  if (selectedId === 'experience') return zone.content.experience.join(' ')
  if (selectedId === 'education') return zone.content.education.join(' ')
  if (selectedId === 'skills') return zone.content.skills.join(' · ')
  if (selectedId === 'highlights') return zone.content.highlights.join(' ')
  return 'Extract a resume capsule to download a practical snapshot.'
}

export default function ResumeDestination({ zone, selectedId, onSelect }) {
  const activeId = selectedId || 'experience'

  return (
    <group>
      <mesh position={zone.anchorPosition}>
        <cylinderGeometry args={[6, 10, 68, 10]} />
        <meshStandardMaterial color={'#071321'} emissive={zone.themeColor} emissiveIntensity={0.8} metalness={0.65} roughness={0.24} />
      </mesh>
      {zone.focusTargets.map((target) => (
        <LayerNode key={target.id} node={target} active={target.id === activeId} onSelect={onSelect} />
      ))}
      <Html position={[zone.anchorPosition[0] + 18, zone.anchorPosition[1] + 14, zone.anchorPosition[2] + 10]} distanceFactor={12} transform sprite>
        <div className="section-floating-copy tall">
          <div className="section-floating-kicker">Resume</div>
          <h3>{zone.focusTargets.find((item) => item.id === activeId)?.label || 'Archive Layer'}</h3>
          <p>{renderResumeCopy(zone, activeId)}</p>
          {activeId === 'download' && (
            <a className="section-action-chip" href={zone.content.resumeUrl} download>
              {zone.content.downloadLabel}
            </a>
          )}
        </div>
      </Html>
    </group>
  )
}
