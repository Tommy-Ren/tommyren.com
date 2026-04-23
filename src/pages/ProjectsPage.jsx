import { Link } from 'react-router-dom'

export default function ProjectsPage() {
  return (
    <div className="sub-page">
      <Link to="/" className="back-btn">← Back to Grid</Link>
      <h1>Projects</h1>
      <div className="divider" />
      <div className="content">
        <p>
          Open-source contributions and personal projects that push the boundaries
          of what's possible on the web.
        </p>
        <p>
          <strong style={{ color: '#ADFF00' }}>NeonUI</strong> — A cyberpunk-themed React component
          library with glassmorphism, neon glows, and glitch animations.
        </p>
        <p>
          <strong style={{ color: '#ADFF00' }}>VoxelEngine</strong> — A browser-based voxel
          rendering engine built from scratch with WebGL2 and custom shaders.
        </p>
        <p>
          <strong style={{ color: '#ADFF00' }}>CloudDeploy CLI</strong> — A zero-config deployment
          tool for containerized applications on major cloud providers.
        </p>
      </div>
    </div>
  )
}
