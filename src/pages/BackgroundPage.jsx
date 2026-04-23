import { Link } from 'react-router-dom'

export default function BackgroundPage() {
  return (
    <div className="sub-page">
      <Link to="/" className="back-btn">← Back to Grid</Link>
      <h1>Background</h1>
      <div className="divider" />
      <div className="content">
        <p>
          Born with a curiosity for how things work under the hood. Started coding at 14,
          building mods for games and small automation scripts. That spark evolved into a
          career in software engineering.
        </p>
        <p>
          Passionate about the intersection of art and technology — from generative art
          and creative coding to building immersive 3D web experiences. Always exploring
          new frontiers in WebGL, shaders, and real-time graphics.
        </p>
        <p>
          Outside of code: photography, cyberpunk fiction, mechanical keyboards, and
          exploring the Pacific Northwest.
        </p>
      </div>
    </div>
  )
}
