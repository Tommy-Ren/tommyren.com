import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Analytics } from '@vercel/analytics/react'
import HomePage from './pages/HomePage'
import LoadingScreen from './components/LoadingScreen'
import earthTextureUrl from './assets/planets/earth.jpg'
import earthNightTextureUrl from './assets/planets/earth_night.jpg'
import earthLowTextureUrl from './assets/planets/low/earth_low.jpg'
import saturnTextureUrl from './assets/planets/saturn.jpg'
import jupiterTextureUrl from './assets/planets/jupiter.jpg'
import ceresTextureUrl from './assets/planets/ceres.jpg'
import haumeaTextureUrl from './assets/planets/haumea.jpg'
import erisTextureUrl from './assets/planets/eris.jpg'
import makemakeTextureUrl from './assets/planets/makemake.jpg'
import marsTextureUrl from './assets/planets/mars.jpg'
import mercuryTextureUrl from './assets/planets/mercury.jpg'
import moonTextureUrl from './assets/planets/moon.jpg'
import sunTextureUrl from './assets/planets/sun.jpg'
import venusTextureUrl from './assets/planets/venus.jpg'

const FULL_TEXTURES = [
  earthTextureUrl,
  earthNightTextureUrl,
  saturnTextureUrl,
  jupiterTextureUrl,
  ceresTextureUrl,
  haumeaTextureUrl,
  erisTextureUrl,
  makemakeTextureUrl,
  marsTextureUrl,
  mercuryTextureUrl,
  moonTextureUrl,
  sunTextureUrl,
  venusTextureUrl,
]

const LOW_SPEC_TEXTURES = [
  earthLowTextureUrl,
]

export default function App() {
  const [renderMode, setRenderMode] = useState('standard')
  const [ready, setReady] = useState(false)
  const [progress, setProgress] = useState(0)
  const runIdRef = useRef(0)
  const lowSpec = renderMode === 'low'

  const textureList = useMemo(
    () => (lowSpec ? LOW_SPEC_TEXTURES : FULL_TEXTURES),
    [lowSpec]
  )

  useEffect(() => {
    const runId = ++runIdRef.current
    const urls = [...new Set(textureList)]
    const total = urls.length
    const loader = new THREE.TextureLoader()
    let loaded = 0

    setReady(false)
    setProgress(0)

    const markDone = () => {
      if (runId !== runIdRef.current) return
      loaded += 1
      const next = Math.round((loaded / total) * 100)
      setProgress(next)
      if (loaded >= total) {
        setTimeout(() => {
          if (runId === runIdRef.current) {
            setProgress(100)
            setReady(true)
          }
        }, 140)
      }
    }

    if (total === 0) {
      setProgress(100)
      setReady(true)
      return
    }

    urls.forEach((url) => {
      loader.load(url, markDone, undefined, markDone)
    })
  }, [textureList])

  return (
    <>
      {ready ? (
        <HomePage lowSpec={lowSpec} />
      ) : (
        <LoadingScreen
          progress={progress}
          mode={renderMode}
          onPickLowSpec={() => setRenderMode('low')}
          onPickStandard={() => setRenderMode('standard')}
        />
      )}
      <Analytics />
    </>
  )
}
