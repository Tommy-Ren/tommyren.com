import { useEffect, useState } from 'react'
import useGameStore from '../store/gameStore'
import logo from '../assets/logo.png'
import { navCommandItems } from '../data/contentZones'

export default function TopNav() {
  const currentSection = useGameStore(s => s.currentSection)
  const targetSection = useGameStore(s => s.targetSection)
  const navigateToSection = useGameStore(s => s.navigateToSection)
  const returnHome = useGameStore(s => s.returnHome)
  const score = useGameStore(s => s.score)
  const gameplayState = useGameStore(s => s.gameplayState)
  const cameraMode = useGameStore(s => s.cameraMode)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const scoreText = Number(score || 0).toLocaleString('en-US')
  const highlightedId = targetSection || currentSection || 'home'

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [currentSection, targetSection])

  const issueNavCommand = (id) => {
    if (!id || id === 'home') {
      returnHome()
    } else {
      navigateToSection(id, 'topNav')
    }
    setMobileMenuOpen(false)
  }

  const statusText = gameplayState === 'transitioning'
    ? (cameraMode === 'warpTravel' ? 'WARP' : 'TRANSIT')
    : gameplayState === 'sectionViewing'
      ? (cameraMode === 'sectionFocus' ? 'FOCUS' : 'ORBIT')
      : 'LIVE'

  return (
    <>
      <nav className="top-nav" role="navigation" aria-label="Main navigation">
        <div className="top-nav-left">
          <button
            type="button"
            className={`top-nav-menu-toggle ${mobileMenuOpen ? 'open' : ''}`}
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(v => !v)}
          >
            <span />
            <span />
            <span />
          </button>
          <button
            type="button"
            className="top-nav-brand top-nav-brand-button"
            aria-label="Return to the central hub"
            onClick={returnHome}
          >
            <span className="top-nav-logo">
              <img src={logo} alt="Tommy Ren logo" className="top-nav-logo-img" />
            </span>
            <span className="top-nav-title">TOMMY REN</span>
          </button>
        </div>

        <ul className="top-nav-list">
          {navCommandItems.map((item) => (
            <li key={item.id}>
              <button
                className={`top-nav-link ${highlightedId === item.id ? 'active' : ''}`}
                onClick={() => issueNavCommand(item.id)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="top-nav-status">
          <div className="top-nav-score">SCORE: {scoreText}</div>
          <div className="top-nav-status-row">
            <div className="top-nav-autopilot">
              <span className="autopilot-dot" />
              {statusText}
            </div>
          </div>
        </div>
      </nav>

      <div className={`mobile-nav-backdrop ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)}>
        <aside className={`mobile-nav-drawer ${mobileMenuOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="mobile-nav-title">Cosmic Destinations</div>
          {navCommandItems.map((item) => (
            <button
              key={`m-${item.id}`}
              className={`mobile-nav-link ${highlightedId === item.id ? 'active' : ''}`}
              onClick={() => issueNavCommand(item.id)}
            >
              {item.label}
            </button>
          ))}
        </aside>
      </div>
    </>
  )
}