import * as THREE from 'three'
import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

function toVector3(value, fallback = [0, 0, 0]) {
  const source = Array.isArray(value) ? value : fallback
  return new THREE.Vector3(source[0] || 0, source[1] || 0, source[2] || 0)
}

function getFocusField(focusAnchor, key, fallback = null) {
  if (!focusAnchor || Array.isArray(focusAnchor) || typeof focusAnchor !== 'object') return fallback
  return focusAnchor[key] ?? fallback
}

export default function CameraRig({
  mode,
  gameplayAnchor,
  gameplayLookTarget,
  locomotionMode,
  homeReturnAnchor,
  destinationAnchor,
  destinationOrbit,
  focusAnchor,
  transitionPhase,
  transitionProgress = 0,
  reducedMotion = false,
  orbitYaw = 0,
  orbitPitch = 0.08,
  orbitDistance = 72,
}) {
  const { camera } = useThree()
  const worldOrigin = useMemo(() => new THREE.Vector3(0, 0, 0), [])

  useFrame((_, delta) => {
    const gameplayPos = toVector3(gameplayAnchor, [0, 18, 30])
    const gameplayTarget = toVector3(gameplayLookTarget, [0, 0, 0])
    const homePos = toVector3(homeReturnAnchor, [0, 18, 30])
    const destinationTarget = toVector3(destinationAnchor, [0, 16, 26])
    const orbitPos = toVector3(destinationOrbit, [0, 14, 26])
    const focusedTarget = toVector3(
      Array.isArray(focusAnchor) ? focusAnchor : getFocusField(focusAnchor, 'position', destinationAnchor),
      destinationAnchor || [0, 16, 26],
    )
    const explicitFocusCamera = getFocusField(focusAnchor, 'cameraPosition')
    const explicitFocusLookAt = getFocusField(focusAnchor, 'lookAt')
    const orbitOffset = new THREE.Vector3(
      Math.cos(orbitPitch) * Math.sin(orbitYaw) * orbitDistance,
      Math.sin(orbitPitch) * orbitDistance,
      Math.cos(orbitPitch) * Math.cos(orbitYaw) * orbitDistance,
    )
    const orbitCameraPos = destinationTarget.clone().add(orbitOffset)
    const focusBias = focusedTarget.clone().sub(destinationTarget)
    const focusLookTarget = destinationTarget.clone().lerp(focusedTarget, 0.12)
    const focusCameraPos = orbitCameraPos.clone()
      .add(focusBias.clone().multiplyScalar(0.04))
      .add(new THREE.Vector3(0, Math.max(0.4, orbitDistance * 0.008), 0))
    const resolvedFocusCameraPos = explicitFocusCamera
      ? toVector3(explicitFocusCamera, explicitFocusCamera)
      : focusCameraPos
    const resolvedFocusLookTarget = explicitFocusLookAt
      ? toVector3(explicitFocusLookAt, explicitFocusLookAt)
      : focusLookTarget

    if (mode === 'followSnake') {
      camera.position.lerp(gameplayPos, delta * (locomotionMode === 'space' ? 3.2 : 2.5))
      camera.lookAt(locomotionMode === 'space' ? gameplayTarget : worldOrigin)
      return
    }

    if (mode === 'cinematicPullback') {
      const pullbackTarget = gameplayPos.clone().multiplyScalar(reducedMotion ? 1.8 : 3.4)
      pullbackTarget.y += reducedMotion ? 16 : 24
      camera.position.lerp(pullbackTarget, delta * 1.8)
      camera.lookAt(worldOrigin)
      return
    }

    if (mode === 'warpTravel') {
      const warpBlend = Math.max(0, Math.min(1, (transitionProgress - 0.22) / 0.58))
      const warpTarget = gameplayPos.clone().lerp(orbitPos, warpBlend)
      warpTarget.multiplyScalar(reducedMotion ? 1.08 : 1.32)
      warpTarget.y += reducedMotion ? 10 : 18
      camera.position.lerp(warpTarget, delta * 2.6)
      camera.lookAt(destinationTarget)
      return
    }

    if (mode === 'sectionArrival') {
      const arrivalStart = orbitCameraPos.clone().sub(destinationTarget).multiplyScalar(reducedMotion ? 1.16 : 1.72).add(destinationTarget)
      const current = arrivalStart.lerp(orbitCameraPos, transitionProgress)
      camera.position.lerp(current, delta * 2.4)
      camera.lookAt(destinationTarget)
      return
    }

    if (mode === 'sectionFocus') {
      camera.position.lerp(resolvedFocusCameraPos, delta * 2.7)
      camera.lookAt(resolvedFocusLookTarget)
      return
    }

    if (mode === 'sectionOrbit') {
      camera.position.lerp(orbitCameraPos, delta * 1.6)
      camera.lookAt(destinationTarget)
      return
    }

    if (transitionPhase === 'arrival') {
      camera.position.lerp(orbitCameraPos, delta * 1.8)
      camera.lookAt(destinationTarget)
      return
    }

    camera.position.lerp(homePos, delta * 2)
    camera.lookAt(worldOrigin)
  })

  return null
}
