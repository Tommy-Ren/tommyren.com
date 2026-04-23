import useGameStore from '../store/gameStore'

export default function HUD() {
  const score = useGameStore(s => s.score)
  const autoCrawl = useGameStore(s => s.autoCrawl)
  const toggleAutoCrawl = useGameStore(s => s.toggleAutoCrawl)

  return (
    <div className="hud">
      <div className="scanlines" />

      {/* Title */}
      <div className="hud-title">
        Tommy Ren
        <span className="hud-subtitle">Software Engineer</span>
      </div>

      {/* Scoreboard */}
      <div className={`hud-score ${!autoCrawl ? 'hidden' : ''}`}>
        SCORE: {String(score).padStart(6, '0')}
      </div>

      {/* Toggle */}
      <div className="toggle-container" onClick={toggleAutoCrawl}>
        <span className="toggle-label">Auto-Crawl</span>
        <div className={`toggle-switch ${autoCrawl ? 'active' : ''}`}>
          <div className="toggle-knob" />
        </div>
      </div>

      {/* Instructions */}
      {autoCrawl && (
        <div className="hud-instructions">
          [ WASD / Arrow Keys to steer ] &nbsp;&middot;&nbsp; [ Hit a block to navigate ]
        </div>
      )}
      {!autoCrawl && (
        <div className="hud-instructions">
          [ Click any block to navigate ] &nbsp;&middot;&nbsp; [ Toggle auto-crawl to play ]
        </div>
      )}
    </div>
  )
}
