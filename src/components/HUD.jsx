import useGameStore from '../store/gameStore'

export default function HUD() {
  const colliding = useGameStore(s => s.colliding)
  const collidingBlock = useGameStore(s => s.collidingBlock)
  const currentSpeed = useGameStore(s => s.currentSpeed)
  const vMax = useGameStore(s => s.vMax)

  const speedPct = Math.round((currentSpeed / vMax) * 100)

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
