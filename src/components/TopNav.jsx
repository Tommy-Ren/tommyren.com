import useGameStore from '../store/gameStore'
import logo from '../assets/logo.png'

const NAV_ITEMS = [
  { label: 'Home', id: null },
  { label: 'About Me', id: 'about' },
  { label: 'Projects', id: 'projects' },
  { label: 'Resume', id: 'resume' },
  { label: 'Contact', id: 'contact' },
]

export default function TopNav() {
  const activeOverlay = useGameStore(s => s.activeOverlay)
  const setActiveOverlay = useGameStore(s => s.setActiveOverlay)
  const score = useGameStore(s => s.score)
  const autopilot = useGameStore(s => s.autopilot)

  return (
    <nav className="top-nav" role="navigation" aria-label="Main navigation">
      <a
        className="top-nav-brand"
        href="https://tianzeren.com"
        aria-label="Go to tianzeren.com"
      >
        <span className="top-nav-logo">
          <img src={logo} alt="Tommy Ren logo" className="top-nav-logo-img" />
        </span>
        <span className="top-nav-title">TOMMY REN</span>
      </a>
      <ul className="top-nav-list">
        {NAV_ITEMS.map((item) => (
          <li key={item.id ?? 'home'}>
            <button
              className={`top-nav-link ${activeOverlay === item.id ? 'active' : ''}`}
              onClick={() => setActiveOverlay(item.id)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="top-nav-status">
        <div className="top-nav-score">
          SCORE: {String(score).padStart(6, '0')}
        </div>
        {autopilot && (
          <div className="top-nav-autopilot">
            <span className="autopilot-dot" />
            AUTOPILOT
          </div>
        )}
      </div>
    </nav>
  )
}
