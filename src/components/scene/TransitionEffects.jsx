import * as THREE from 'three'

function stretchColor(intensity) {
  return new THREE.Color().setHSL(0.55 + intensity * 0.08, 0.9, 0.55)
}

export default function TransitionEffects({ cameraMode, transitionPhase, transitionProgress = 0, warpIntensity = 0 }) {
  if (cameraMode !== 'warpTravel' && transitionPhase !== 'pullback' && transitionPhase !== 'arrival') {
    return null
  }

  const ringScale = 10 + transitionProgress * 54
  const opacity = transitionPhase === 'pullback'
    ? 0.18 + transitionProgress * 0.22
    : transitionPhase === 'warp'
      ? 0.52
      : Math.max(0, 0.48 - transitionProgress * 0.4)
  const color = stretchColor(Math.min(1.2, warpIntensity || 0.4))

  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <torusGeometry args={[ringScale, 1.2 + warpIntensity * 1.2, 18, 120]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <ringGeometry args={[ringScale * 0.84, ringScale * 1.08, 96]} />
        <meshBasicMaterial color={'#ffffff'} transparent opacity={opacity * 0.18} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
