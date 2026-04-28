import useGameStore from '../store/gameStore'

export default function HUD() {
  const colliding = useGameStore(s => s.colliding)
  const collidingBlock = useGameStore(s => s.collidingBlock)
  const currentSpeed = useGameStore(s => s.currentSpeed)
  const vMin = useGameStore(s => s.vMin)
  const vBase = useGameStore(s => s.vBase)
  const vMax = useGameStore(s => s.vMax)

  const BASE_CRUISE_PCT = 10
  const minBand = 1
  const aboveBaseRange = Math.max(0.0001, vMax - vBase)
  const belowBaseRange = Math.max(0.0001, vBase - vMin)
  const speedPctRaw = currentSpeed >= vBase
    ? BASE_CRUISE_PCT + ((currentSpeed - vBase) / aboveBaseRange) * (100 - BASE_CRUISE_PCT)
    : BASE_CRUISE_PCT - ((vBase - currentSpeed) / belowBaseRange) * (BASE_CRUISE_PCT - minBand)
  const speedPct = Math.round(Math.max(minBand, Math.min(100, speedPctRaw)))

  return (
    <div className={`hud ${colliding ? 'hud-collision' : ''}`}>
      <div className="scanlines" />

      {/* Speed gauge */}
      <div className="speed-gauge">
        <div className="speed-label">SPD</div>
        <div className="speed-bar-track">
          <div
            className="speed-bar-fill"
            style={{ width: `${speedPct}%` }}
          />
        </div>
        <div className="speed-value">{speedPct}%</div>
      </div>

      {/* Collision flash overlay */}
      {colliding && (
        <div className="collision-overlay">
          <div className="collision-text">
            {'>> '}{collidingBlock?.toUpperCase?.() || collidingBlock}{' <<'}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="hud-instructions">
        A/D or ←/→ Steer · W/S or ↑/↓ Speed
      </div>
    </div>
  )
}
