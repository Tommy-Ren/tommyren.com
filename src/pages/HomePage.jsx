import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import GameScene from '../components/GameScene'
import HUD from '../components/HUD'

export default function HomePage() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 18, 14], fov: 50, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#050505' }}
      >
        <color attach="background" args={['#050505']} />
        <fog attach="fog" args={['#050505', 25, 50]} />
        <GameScene />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
        />
        <EffectComposer>
          <Bloom
            intensity={1.2}
            luminanceThreshold={0.1}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
      <HUD />
    </div>
  )
}
