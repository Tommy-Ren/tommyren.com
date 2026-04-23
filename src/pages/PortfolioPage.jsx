import { Link } from 'react-router-dom'

export default function PortfolioPage() {
  return (
    <div className="sub-page">
      <Link to="/" className="back-btn">← Back to Grid</Link>
      <h1>Portfolio</h1>
      <div className="divider" />
      <div className="content">
        <p>
          A curated collection of interactive experiences, web applications, and
          creative experiments built over the years.
        </p>
        <p>
          <strong style={{ color: '#ADFF00' }}>Cyber-Snake Portfolio</strong> — This very site.
          A gamified portfolio using Three.js, React Three Fiber, and post-processing bloom effects.
        </p>
        <p>
          <strong style={{ color: '#ADFF00' }}>Real-Time Dashboard</strong> — A WebSocket-powered
          analytics dashboard with live data visualization using D3.js and React.
        </p>
        <p>
          <strong style={{ color: '#ADFF00' }}>Shader Playground</strong> — An interactive GLSL
          shader editor with real-time preview, built with CodeMirror and Three.js.
        </p>
      </div>
    </div>
  )
}
