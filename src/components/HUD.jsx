import useGameStore from '../store/gameStore'

export default function HUD() {
  const score = useGameStore(s => s.score)
  const autopilot = useGameStore(s => s.autopilot)
  const colliding = useGameStore(s => s.colliding)
  const collidingBlock = useGameStore(s => s.collidingBlock)

  return (
    <div className={`hud ${colliding ? 'hud-collision' : ''}`}>
      <div className="scanlines" />

      {/* Title */}
      <div className="hud-title">
        Tommy Ren
        <span className="hud-subtitle">Software Engineer</span>
      </div>

      {/* Scoreboard */}
      <div className="hud-score">
        SCORE: {String(score).padStart(6, '0')}
      </div>

      {/* Autopilot indicator */}
      <div className={`autopilot-indicator ${autopilot ? 'active' : ''}`}>
        <span className="autopilot-dot" />
        {autopilot ? 'AUTOPILOT' : 'MANUAL'}
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
        [ A/D or ←/→ to steer ] &nbsp;&middot;&nbsp; [ Autopilot resumes after 3s idle ]
        &nbsp;&middot;&nbsp; [ Collide with blocks to navigate ]
      </div>
    </div>
  )
}
