import { Html } from '@react-three/drei'

function ChannelNode({ channel, target, active, onSelect }) {
  return (
    <group position={target.position}>
      <mesh onClick={() => onSelect(channel.id)}>
        <octahedronGeometry args={[2.2, 0]} />
        <meshStandardMaterial color={active ? '#00F0FF' : '#FF0055'} emissive={active ? '#00F0FF' : '#FF0055'} emissiveIntensity={active ? 1.7 : 0.82} />
      </mesh>
      <Html center distanceFactor={18}>
        <button className={`section-node-chip ${active ? 'active' : ''}`} onClick={() => onSelect(channel.id)}>
          {channel.label}
        </button>
      </Html>
    </group>
  )
}

export default function ContactDestination({ zone, selectedId, onSelect }) {
  const selected = zone.content.channels.find((item) => item.id === selectedId) || zone.content.channels[0]

  return (
    <group>
      <mesh position={zone.anchorPosition}>
        <cylinderGeometry args={[1.8, 4.6, 24, 16]} />
        <meshStandardMaterial color={'#07111c'} emissive={zone.themeColor} emissiveIntensity={0.9} metalness={0.35} roughness={0.28} />
      </mesh>
      <mesh position={zone.anchorPosition} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[10, 0.2, 18, 96]} />
        <meshBasicMaterial color={zone.themeColor} transparent opacity={0.44} />
      </mesh>
      {zone.focusTargets.map((target, index) => (
        <ChannelNode
          key={target.id}
          target={target}
          channel={zone.content.channels[index]}
          active={zone.content.channels[index].id === selected.id}
          onSelect={onSelect}
        />
      ))}
      <Html position={[zone.anchorPosition[0], zone.anchorPosition[1] + 12, zone.anchorPosition[2] + 10]} distanceFactor={11} transform sprite>
        <div className="section-floating-copy">
          <div className="section-floating-kicker">Contact</div>
          <h3>{selected.label}</h3>
          <p>{selected.value}</p>
          <div className="section-action-row">
            {selected.href
              ? <a className="section-action-chip" href={selected.href} target="_blank" rel="noreferrer">Open Channel</a>
              : <span className="section-action-chip muted">Pending</span>}
          </div>
        </div>
      </Html>
    </group>
  )
}
