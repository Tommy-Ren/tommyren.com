import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Glitch } from '@react-three/postprocessing'
import { GlitchMode } from 'postprocessing'
import * as THREE from 'three'
import GameScene from '../components/GameScene'
import HUD from '../components/HUD'
import TopNav from '../components/TopNav'
import OverlayPanel from '../components/OverlayPanel'
import MusicToggle from '../components/MusicToggle'
import useGameStore from '../store/gameStore'

export default function HomePage({ lowSpec = false }) {
  const colliding = useGameStore(s => s.colliding)
  const activeOverlay = useGameStore(s => s.activeOverlay)

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <TopNav />
      <Canvas
        camera={{
          position: [0, 55, 70],
          fov: 50,
          near: 0.1,
          far: lowSpec ? 900 : 500000,
        }}
        dpr={lowSpec ? [0.65, 1] : [1, 2]}
        gl={{
          antialias: !lowSpec,
          alpha: false,
          logarithmicDepthBuffer: !lowSpec,
          powerPreference: lowSpec ? 'low-power' : 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: lowSpec ? 1.05 : 1.2,
        }}
        style={{ background: '#020817' }}
      >
        <color attach="background" args={['#020817']} />
        <fog attach="fog" args={lowSpec ? ['#020817', 120, 900] : ['#020817', 24000, 320000]} />
        <GameScene lowSpec={lowSpec} />
        {!lowSpec && (
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
        )}
      </Canvas>
      {!activeOverlay && <HUD />}
      <OverlayPanel />
      <MusicToggle />
    </div>
  )
}
