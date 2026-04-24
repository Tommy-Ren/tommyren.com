import * as THREE from 'three'

const SPHERE_RADIUS = 8

// ── Convert spherical (theta, phi) to Cartesian position on sphere ──
export function sphericalToCartesian(theta, phi, radius = SPHERE_RADIUS) {
  return new THREE.Vector3(
    radius * Math.sin(theta) * Math.cos(phi),
    radius * Math.cos(theta),
    radius * Math.sin(theta) * Math.sin(phi)
  )
}

// ── Get the surface normal at a point (just the normalized position) ──
export function getSurfaceNormal(theta, phi) {
  return sphericalToCartesian(theta, phi, 1).normalize()
}

// ── Build a quaternion that orients an object to stand on the sphere surface ──
export function getOrientationOnSphere(theta, phi, heading = 0) {
  const pos = sphericalToCartesian(theta, phi)
  const normal = pos.clone().normalize()

  // Create a basis on the tangent plane
  // "up" on sphere is the normal
  const up = normal.clone()

  // "east" direction (tangent along phi)
  const east = new THREE.Vector3(
    -Math.sin(phi),
    0,
    Math.cos(phi)
  ).normalize()

  // "north" direction (tangent along -theta)
  const north = new THREE.Vector3().crossVectors(east, up).normalize()

  // Forward direction based on heading
  const forward = new THREE.Vector3()
    .addScaledVector(north, Math.cos(heading))
    .addScaledVector(east, Math.sin(heading))
    .normalize()

  const right = new THREE.Vector3().crossVectors(forward, up).normalize()

  // Build rotation matrix
  const m = new THREE.Matrix4()
  m.makeBasis(right, up, forward.clone().negate())
  m.setPosition(pos)

  const quat = new THREE.Quaternion().setFromRotationMatrix(m)
  return { position: pos, quaternion: quat, normal: up }
}

// ── Move forward on sphere by a given arc distance ──
export function moveOnSphere(theta, phi, heading, arcDist, radius = SPHERE_RADIUS) {
  const angularDist = arcDist / radius

  // Current position as unit vector
  const p = sphericalToCartesian(theta, phi, 1)

  // Tangent vectors at current position
  const east = new THREE.Vector3(-Math.sin(phi), 0, Math.cos(phi)).normalize()
  const north = new THREE.Vector3().crossVectors(east, p).normalize()

  // Direction of movement in tangent plane
  const dir = new THREE.Vector3()
    .addScaledVector(north, Math.cos(heading))
    .addScaledVector(east, Math.sin(heading))
    .normalize()

  // New position on unit sphere using Rodrigues' rotation
  const newP = new THREE.Vector3()
    .addScaledVector(p, Math.cos(angularDist))
    .addScaledVector(dir, Math.sin(angularDist))
    .normalize()

  // Convert back to spherical
  let newTheta = Math.acos(THREE.MathUtils.clamp(newP.y, -1, 1))
  let newPhi = Math.atan2(newP.z, newP.x)
  if (newPhi < 0) newPhi += Math.PI * 2

  // Compute new heading by parallel transport
  // The new tangent vectors at the new position
  const newEast = new THREE.Vector3(-Math.sin(newPhi), 0, Math.cos(newPhi)).normalize()
  const newNorth = new THREE.Vector3().crossVectors(newEast, newP).normalize()

  // Project the direction onto new tangent basis to get new heading
  const projN = dir.dot(newNorth)
  const projE = dir.dot(newEast)
  const newHeading = Math.atan2(projE, projN)

  return { theta: newTheta, phi: newPhi, heading: newHeading }
}

// ── Great circle distance between two points on sphere ──
export function greatCircleDistance(t1, p1, t2, p2, radius = SPHERE_RADIUS) {
  const v1 = sphericalToCartesian(t1, p1, 1)
  const v2 = sphericalToCartesian(t2, p2, 1)
  const dot = THREE.MathUtils.clamp(v1.dot(v2), -1, 1)
  return Math.acos(dot) * radius
}

// ── Spawn a random point on sphere (avoiding poles and existing blocks) ──
export function randomSpherePoint(avoidPoints = [], minDist = 1.5) {
  let theta, phi, valid
  let attempts = 0
  do {
    // Uniform distribution on sphere
    theta = Math.acos(1 - 2 * Math.random()) // [0, PI]
    phi = Math.random() * Math.PI * 2 // [0, 2PI]
    valid = true
    for (const pt of avoidPoints) {
      if (greatCircleDistance(theta, phi, pt.theta, pt.phi) < minDist) {
        valid = false
        break
      }
    }
    attempts++
  } while (!valid && attempts < 100)
  return { theta, phi }
}

// ── A* Pathfinding on Sphere ──
const GRID_RES = 24 // grid resolution for A*

function coordToGrid(theta, phi) {
  const row = Math.round((theta / Math.PI) * (GRID_RES - 1))
  const col = Math.round((phi / (Math.PI * 2)) * GRID_RES) % GRID_RES
  return { row: THREE.MathUtils.clamp(row, 0, GRID_RES - 1), col: ((col % GRID_RES) + GRID_RES) % GRID_RES }
}

function gridToCoord(row, col) {
  const theta = (row / (GRID_RES - 1)) * Math.PI
  const phi = (col / GRID_RES) * Math.PI * 2
  return { theta, phi }
}

function gridKey(row, col) {
  return `${row},${col}`
}

function getNeighbors(row, col) {
  const neighbors = []
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]
  for (const [dr, dc] of dirs) {
    const nr = row + dr
    const nc = ((col + dc) % GRID_RES + GRID_RES) % GRID_RES // wrap phi
    if (nr >= 0 && nr < GRID_RES) {
      neighbors.push({ row: nr, col: nc })
    }
  }
  return neighbors
}

export function findPathAStar(startTheta, startPhi, goalTheta, goalPhi, obstacles = []) {
  // Guard against NaN/undefined inputs
  if (!isFinite(startTheta) || !isFinite(startPhi) || !isFinite(goalTheta) || !isFinite(goalPhi)) {
    return [{ theta: goalTheta || Math.PI / 2, phi: goalPhi || 0 }]
  }

  const start = coordToGrid(startTheta, startPhi)
  const goal = coordToGrid(goalTheta, goalPhi)

  if (!start || !goal) {
    return [{ theta: goalTheta, phi: goalPhi }]
  }

  // Build obstacle set
  const obstacleSet = new Set()
  for (const obs of obstacles) {
    const g = coordToGrid(obs.theta, obs.phi)
    // Block a wider area around each obstacle to prevent snake suicide
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const nr = g.row + dr
        const nc = ((g.col + dc) % GRID_RES + GRID_RES) % GRID_RES
        if (nr >= 0 && nr < GRID_RES) {
          obstacleSet.add(gridKey(nr, nc))
        }
      }
    }
  }

  const openSet = new Map()
  const closedSet = new Set()
  const gScore = new Map()
  const fScore = new Map()
  const cameFrom = new Map()

  const startKey = gridKey(start.row, start.col)
  const goalKey = gridKey(goal.row, goal.col)

  gScore.set(startKey, 0)
  const goalCoord = gridToCoord(goal.row, goal.col)
  const startCoord = gridToCoord(start.row, start.col)
  const h = greatCircleDistance(startCoord.theta, startCoord.phi, goalCoord.theta, goalCoord.phi)
  fScore.set(startKey, h)
  openSet.set(startKey, start)

  let iterations = 0
  const maxIterations = GRID_RES * GRID_RES * 2

  while (openSet.size > 0 && iterations < maxIterations) {
    iterations++

    // Find node with lowest fScore in openSet
    let currentKey = null
    let currentF = Infinity
    for (const [key] of openSet) {
      const f = fScore.get(key) || Infinity
      if (f < currentF) {
        currentF = f
        currentKey = key
      }
    }

    if (currentKey === goalKey) {
      // Reconstruct path
      const path = []
      let key = goalKey
      while (key && key !== startKey) {
        const [r, c] = key.split(',').map(Number)
        const coord = gridToCoord(r, c)
        path.unshift(coord)
        key = cameFrom.get(key)
      }
      return path
    }

    if (!currentKey) break

    const current = openSet.get(currentKey)
    if (!current) break

    openSet.delete(currentKey)
    closedSet.add(currentKey)

    const neighbors = getNeighbors(current.row, current.col)
    for (const neighbor of neighbors) {
      const nKey = gridKey(neighbor.row, neighbor.col)
      if (closedSet.has(nKey) || obstacleSet.has(nKey)) continue

      const currentCoord = gridToCoord(current.row, current.col)
      const neighborCoord = gridToCoord(neighbor.row, neighbor.col)
      const tentativeG = (gScore.get(currentKey) || 0) +
        greatCircleDistance(currentCoord.theta, currentCoord.phi, neighborCoord.theta, neighborCoord.phi)

      if (tentativeG < (gScore.get(nKey) || Infinity)) {
        cameFrom.set(nKey, currentKey)
        gScore.set(nKey, tentativeG)
        const nGoalDist = greatCircleDistance(neighborCoord.theta, neighborCoord.phi, goalCoord.theta, goalCoord.phi)
        fScore.set(nKey, tentativeG + nGoalDist)
        if (!openSet.has(nKey)) {
          openSet.set(nKey, neighbor)
        }
      }
    }
  }

  // No path found, return direct heading
  return [{ theta: goalTheta, phi: goalPhi }]
}

// ── Compute heading from current position toward a target on sphere ──
export function headingToward(fromTheta, fromPhi, toTheta, toPhi) {
  const from = sphericalToCartesian(fromTheta, fromPhi, 1)
  const to = sphericalToCartesian(toTheta, toPhi, 1)

  // Direction vector from -> to projected onto tangent plane
  const dir = to.clone().sub(from.clone().multiplyScalar(from.dot(to))).normalize()

  // Tangent basis at from
  const east = new THREE.Vector3(-Math.sin(fromPhi), 0, Math.cos(fromPhi)).normalize()
  const north = new THREE.Vector3().crossVectors(east, from).normalize()

  const projN = dir.dot(north)
  const projE = dir.dot(east)

  return Math.atan2(projE, projN)
}
