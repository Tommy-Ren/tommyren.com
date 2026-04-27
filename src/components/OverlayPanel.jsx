import { useEffect, useState } from 'react'
import useGameStore from '../store/gameStore'

const OVERLAY_CONTENT = {
  about: {
    title: 'About Me',
    content: (
      <>
        <p>
          Creative software engineer with a passion for building interactive,
          high-performance web experiences. Specializing in 3D graphics, real-time
          rendering, and modern frontend architectures.
        </p>
        <p>
          I thrive at the intersection of design and engineering, crafting immersive
          digital experiences that push the boundaries of what's possible on the web.
        </p>
      </>
    ),
  },
  projects: {
    title: 'Projects',
    content: (
      <>
        <p>
          <span className="project-tag">Cyber-Sphere Portfolio</span> — This very site.
          A 3D spherical world with A* pathfinding, physics-based snake game, and
          cyberpunk aesthetics built with Three.js + React.
        </p>
        <p>
          <span className="project-tag">Project Alpha</span> — Real-time collaborative
          code editor with WebSocket sync and syntax highlighting.
        </p>
        <p>
          <span className="project-tag">Project Beta</span> — ML-powered image
          classification pipeline deployed on serverless infrastructure.
        </p>
      </>
    ),
  },
  resume: {
    title: 'Resume',
    content: (
      <>
        <p>
          <span className="resume-label">Technical Skills:</span><br />
          JavaScript / TypeScript, React, Three.js, Node.js, Python, Go, Docker, AWS, PostgreSQL, MongoDB
        </p>
        <p>
          <span className="resume-label">Experience:</span><br />
          Senior Frontend Engineer — Building next-gen interactive experiences with WebGL and React.<br />
          Full-Stack Developer — Designed and shipped scalable microservices and SPAs.
        </p>
        <p>
          <span className="resume-label">Education:</span><br />
          B.Sc. Computer Science — Focused on computer graphics and distributed systems.
        </p>
      </>
    ),
  },
  contact: {
    title: 'Contact',
    content: (
      <>
        <p>Get in touch — I'd love to hear from you.</p>
        <p>Email: [email]</p>
        <p>LinkedIn: [linkedin_url]</p>
        <p>GitHub: [github_url]</p>
      </>
    ),
  },
}

export default function OverlayPanel() {
  const activeOverlay = useGameStore(s => s.activeOverlay)
  const setActiveOverlay = useGameStore(s => s.setActiveOverlay)
  const [visible, setVisible] = useState(false)
  const [currentContent, setCurrentContent] = useState(null)

  useEffect(() => {
    if (activeOverlay && OVERLAY_CONTENT[activeOverlay]) {
      setCurrentContent(OVERLAY_CONTENT[activeOverlay])
      // Small delay to trigger CSS transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
      // Clear content after fade-out
      const timer = setTimeout(() => setCurrentContent(null), 400)
      return () => clearTimeout(timer)
    }
  }, [activeOverlay])

  if (!currentContent && !visible) return null

  return (
    <div
      className={`overlay-backdrop ${visible ? 'visible' : ''}`}
      onClick={() => setActiveOverlay(null)}
    >
      <div
        className={`overlay-panel ${visible ? 'visible' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="overlay-close"
          onClick={() => setActiveOverlay(null)}
          aria-label="Close overlay"
        >
          ✕
        </button>
        {currentContent && (
          <>
            <h1 className="overlay-title">{currentContent.title}</h1>
            <div className="overlay-divider" />
            <div className="overlay-content">
              {currentContent.content}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
