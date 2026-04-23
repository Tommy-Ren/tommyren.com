import { Link } from 'react-router-dom'

export default function CVPage() {
  return (
    <div className="sub-page">
      <Link to="/" className="back-btn">← Back to Grid</Link>
      <h1>CV</h1>
      <div className="divider" />
      <div className="content">
        <p>
          <strong style={{ color: '#FF0055' }}>Tommy Ren</strong><br />
          Software Engineer &middot; Creative Technologist
        </p>
        <p>
          <strong style={{ color: '#FF0055' }}>Contact:</strong><br />
          Email: [email]@example.com<br />
          GitHub: github.com/tommyren<br />
          LinkedIn: linkedin.com/in/tommyren
        </p>
        <p>
          <strong style={{ color: '#FF0055' }}>Summary:</strong><br />
          Full-stack engineer with 5+ years of experience building performant,
          interactive web applications. Specialized in 3D web technologies,
          real-time systems, and developer tooling.
        </p>
        <p>
          <strong style={{ color: '#FF0055' }}>Certifications:</strong><br />
          AWS Solutions Architect &middot; Google Cloud Professional
        </p>
      </div>
    </div>
  )
}
