import { Link } from 'react-router-dom'

export default function ContactPage() {
  return (
    <div className="sub-page">
      <Link to="/" className="back-btn">← Back</Link>
      <h1>Contact</h1>
      <div className="divider" />
      <div className="content">
        <p>Get in touch — I'd love to hear from you.</p>
        <p>Email: [email]</p>
        <p>LinkedIn: [linkedin_url]</p>
        <p>GitHub: [github_url]</p>
      </div>
    </div>
  )
}
