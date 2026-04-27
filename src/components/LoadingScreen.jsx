export default function LoadingScreen({
  progress = 0,
  mode = 'standard',
  onPickLowSpec,
  onPickStandard,
}) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)))

  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-panel">
        <div className="loading-title">Initializing Cyber Sphere</div>
        <div className="loading-subtitle">
          {mode === 'low'
            ? 'Preparing low-spec rendering profile...'
            : 'Loading planetary textures and scene assets...'}
        </div>

        <div className="loading-bar-track" aria-label={`Loading ${pct}%`}>
          <div className="loading-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="loading-percent">{pct}%</div>

        <div className="loading-actions">
          <button
            type="button"
            className={`loading-btn ${mode === 'low' ? 'active' : ''}`}
            onClick={onPickLowSpec}
          >
            Low-spec Version
          </button>
          <button
            type="button"
            className={`loading-btn ghost ${mode === 'standard' ? 'active' : ''}`}
            onClick={onPickStandard}
          >
            Full Experience
          </button>
        </div>
      </div>
    </div>
  )
}
