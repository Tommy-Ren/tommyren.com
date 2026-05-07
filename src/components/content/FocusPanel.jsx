import useGameStore from '../../store/gameStore'
import { contentZonesById } from '../../data/contentZones'

function ActionLink({ action }) {
  if (!action?.href) {
    return (
      <span className="focus-action disabled">{action?.label || 'Unavailable'}</span>
    )
  }

  return (
    <a
      className="focus-action"
      href={action.href}
      target="_blank"
      rel="noreferrer"
    >
      {action.label}
    </a>
  )
}

function AboutZone({ zone }) {
  return (
    <div className="focus-section-grid">
      {zone.content.sections.map((section) => (
        <section key={section.title} className="focus-copy-card">
          <h3>{section.title}</h3>
          <p>{section.body}</p>
        </section>
      ))}
    </div>
  )
}

function ProjectsZone({ zone }) {
  return (
    <div className="focus-project-list">
      {zone.content.projects.map((project) => (
        <article key={project.title} className="focus-project-card">
          <div className="focus-project-top">
            <div>
              <div className="focus-chip">Featured System</div>
              <h3>{project.title}</h3>
            </div>
            <div className="focus-project-role">{project.role}</div>
          </div>
          <p>{project.summary}</p>
          <div className="focus-tag-row">
            {project.technologies.map((tech) => (
              <span key={tech} className="focus-tag">{tech}</span>
            ))}
          </div>
          <ul className="focus-layer-list">
            {project.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <div className="focus-action-row">
            {project.actions.length > 0
              ? project.actions.map((action) => <ActionLink key={action.label} action={action} />)
              : <span className="focus-action ghost">In-world showcase active</span>}
          </div>
        </article>
      ))}
    </div>
  )
}

function ResumeZone({ zone }) {
  const { experience, education, skills, highlights, resumeUrl, downloadLabel } = zone.content

  return (
    <div className="focus-resume-grid">
      <section className="focus-layer">
        <h3>Experience</h3>
        <ul className="focus-layer-list">
          {experience.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
      <section className="focus-layer">
        <h3>Education</h3>
        <ul className="focus-layer-list">
          {education.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
      <section className="focus-layer">
        <h3>Skills</h3>
        <div className="focus-tag-row">
          {skills.map((skill) => <span key={skill} className="focus-tag">{skill}</span>)}
        </div>
      </section>
      <section className="focus-layer">
        <h3>Highlights</h3>
        <ul className="focus-layer-list">
          {highlights.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
      <section className="focus-layer focus-layer-accent">
        <h3>Download Channel</h3>
        <p>A practical export for recruiters who want a quick snapshot outside the 3D scene.</p>
        <div className="focus-action-row">
          <a className="focus-action" href={resumeUrl} download>
            {downloadLabel}
          </a>
        </div>
      </section>
    </div>
  )
}

function ContactZone({ zone }) {
  return (
    <div className="focus-contact-grid">
      {zone.content.channels.map((channel) => (
        <article key={channel.label} className="focus-channel">
          <div className="focus-channel-label">{channel.label}</div>
          <div className="focus-channel-value">{channel.value}</div>
          <div className="focus-action-row">
            {channel.href
              ? <ActionLink action={{ label: 'Open Channel', href: channel.href }} />
              : <span className="focus-action disabled">Pending</span>}
          </div>
        </article>
      ))}
    </div>
  )
}

function ZoneBody({ zone }) {
  if (zone.type === 'identityCore') return <AboutZone zone={zone} />
  if (zone.type === 'projectCluster') return <ProjectsZone zone={zone} />
  if (zone.type === 'resumeArchive') return <ResumeZone zone={zone} />
  if (zone.type === 'contactRelay') return <ContactZone zone={zone} />
  return null
}

export default function FocusPanel() {
  const activeZoneId = useGameStore((s) => s.activeZoneId)
  const returnHome = useGameStore((s) => s.returnHome)
  const score = useGameStore((s) => s.score)
  const evolutionLevel = useGameStore((s) => s.evolutionLevel)
  const activePlanetName = useGameStore((s) => s.activePlanetName)

  const zone = activeZoneId ? contentZonesById[activeZoneId] : null
  if (!zone) return null

  return (
    <div className="focus-shell">
      <div className="focus-panel">
        <div className="focus-panel-header">
          <div>
            <div className="focus-panel-kicker">{zone.label}</div>
            <h1 className="focus-panel-title">{zone.displayName}</h1>
            <p className="focus-panel-summary">{zone.summary}</p>
          </div>
          <div className="focus-close-row">
            <button type="button" className="focus-close-btn" onClick={returnHome}>
              Return to Hub
            </button>
          </div>
        </div>

        <div className="focus-metadata">
          <span className="focus-meta-chip">Planet // {activePlanetName}</span>
          <span className="focus-meta-chip">Score // {Number(score || 0).toLocaleString('en-US')}</span>
          <span className="focus-meta-chip">Evolution // L{evolutionLevel}</span>
        </div>

        <div className="focus-content">
          <ZoneBody zone={zone} />
        </div>
      </div>
    </div>
  )
}
