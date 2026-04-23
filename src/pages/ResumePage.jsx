import { Link } from 'react-router-dom'

export default function ResumePage() {
  return (
    <div className="sub-page">
      <Link to="/" className="back-btn">← Back to Grid</Link>
      <h1>Resume</h1>
      <div className="divider" />
      <div className="content">
        <p>
          Experienced software engineer with a passion for building interactive,
          high-performance web applications. Proficient in modern JavaScript frameworks,
          3D rendering pipelines, and full-stack development.
        </p>
        <p>
          <strong style={{ color: '#FF0055' }}>Technical Skills:</strong><br />
          JavaScript / TypeScript, React, Three.js, Node.js, Python, Go, Docker, AWS, PostgreSQL, MongoDB
        </p>
        <p>
          <strong style={{ color: '#FF0055' }}>Experience:</strong><br />
          Senior Frontend Engineer — Building next-gen interactive experiences with WebGL and React.<br />
          Full-Stack Developer — Designed and shipped scalable microservices and SPAs.
        </p>
        <p>
          <strong style={{ color: '#FF0055' }}>Education:</strong><br />
          B.Sc. Computer Science — Focused on computer graphics and distributed systems.
        </p>
      </div>
    </div>
  )
}
