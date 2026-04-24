import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Glitch } from '@react-three/postprocessing'
import { GlitchMode } from 'postprocessing'
import * as THREE from 'three'
import GameScene from '../components/GameScene'
import HUD from '../components/HUD'
import useGameStore from '../store/gameStore'

export default function HomePage() {
  const colliding = useGameStore(s => s.colliding)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 12, 16], fov: 50, near: 0.1, far: 200 }}
        gl={{
          antialias: true,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
        }}
        style={{ background: '#050505' }}
      >
        <color attach="background" args={['#050505']} />
        <fog attach="fog" args={['#050505', 30, 60]} />
        <GameScene />
        <EffectComposer>
          <Bloom
            intensity={1.5}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          {colliding && (
            <Glitch
              delay={[0, 0]}
              duration={[0.5, 0.5]}
              strength={[0.4, 0.8]}
              mode={GlitchMode.CONSTANT_WILD}
              active={true}
            />
          )}
        </EffectComposer>
      </Canvas>
      <HUD />
    </div>
  )
}
