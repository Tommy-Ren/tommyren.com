export const PROJECT_LINK_STATUS = {
  TEMPLATE: 'template',
  LIVE: 'live',
  COMING_SOON: 'coming-soon',
}

export const projects = [
  {
    id: 'cyber-sphere-portfolio',
    index: 1,
    title: 'Cyber-Sphere Portfolio',
    shortTitle: 'Cyber Sphere',
    icon: 'code',
    description:
      'A playable 3D portfolio universe that blends navigation, game feel, and recruiter-friendly access inside one continuous scene.',
    tech: ['React', 'Three.js', 'React Three Fiber', 'Zustand', 'Vite'],
    role: 'Concept, interaction design, frontend engineering, rendering, and systems integration.',
    highlights: [
      'Spherical locomotion with camera-aware presentation',
      'Autopilot navigation inside a persistent 3D world',
      'Low-spec rendering mode and mobile gesture support',
    ],
    demoUrl: 'https://tianzeren.com',
    githubUrl: 'https://github.com/Tommy-Ren/tommyren.com',
    featured: true,
    status: PROJECT_LINK_STATUS.LIVE,
  },
  {
    id: 'orbital-foundry-node',
    index: 2,
    title: 'Orbital Foundry Node',
    shortTitle: 'Foundry Node',
    icon: 'cube',
    description:
      'Template launch bay reserved for a future systems build, giving the dockyard a complete station layout today without fake links.',
    tech: ['Template', 'React', 'Three.js'],
    role: 'Reserved dock node for future portfolio work.',
    highlights: [
      'Prepared as a reusable project slot inside the dockyard',
      'Supports future Demo and GitHub links without UI rewrites',
      'Keeps the station visually complete while content grows',
    ],
    status: PROJECT_LINK_STATUS.TEMPLATE,
  },
  {
    id: 'visual-memory-atlas',
    index: 3,
    title: 'Visual Memory Atlas',
    shortTitle: 'Memory Atlas',
    icon: 'image',
    description:
      'Template project node reserved for future visual storytelling, environment art, and interface-image driven experiments.',
    tech: ['Template', 'Textures', 'Realtime UI'],
    role: 'Placeholder gallery bay for future visual system work.',
    highlights: [
      'Ready for image-heavy portfolio content',
      'Uses the same interaction and panel system as live projects',
      'Keeps missing links gracefully in a coming-soon state',
    ],
    status: PROJECT_LINK_STATUS.TEMPLATE,
  },
  {
    id: 'world-interface-index',
    index: 4,
    title: 'World Interface Index',
    shortTitle: 'World Index',
    icon: 'globe',
    description:
      'Template node for future world-scale interfaces, maps, connected navigation systems, or web experiences with a global layer.',
    tech: ['Template', 'WebGL', 'Interaction Design'],
    role: 'Reserved slot for large-scale spatial interface work.',
    highlights: [
      'Matches the dockyard node system out of the box',
      'Supports future external links with no structural changes',
      'Helps the station read as a real project browser now',
    ],
    status: PROJECT_LINK_STATUS.TEMPLATE,
  },
  {
    id: 'planetary-autopilot',
    index: 5,
    title: 'Planetary Autopilot',
    shortTitle: 'Autopilot',
    icon: 'waveform',
    description:
      'A movement system that uses spherical math and obstacle-aware pathfinding to steer the snake through a curved world without traditional page routing.',
    tech: ['Three.js', 'A* Pathfinding', 'Vector Math', 'React Three Fiber'],
    role: 'Gameplay systems, math utilities, camera tuning, and steering logic.',
    highlights: [
      'Great-circle movement and heading transport',
      'Obstacle clearance around landmarks and body segments',
      'Recovery behavior for difficult paths and near-collision turns',
    ],
    featured: true,
    status: PROJECT_LINK_STATUS.COMING_SOON,
  },
  {
    id: 'signal-cli',
    index: 6,
    title: 'Signal CLI',
    shortTitle: 'Signal CLI',
    icon: 'ai',
    description:
      'Developer CLI for boosting productivity with smart automation and workflow shortcuts.',
    tech: ['Node.js', 'TypeScript', 'Inquirer', 'CLI UX'],
    role: 'Template command-line product slot prepared for future tooling work.',
    highlights: [
      'Reserved for future developer tooling and automation work',
      'Panel supports both Demo and Code actions when links are ready',
      'Uses the same dockyard interaction system as every other node',
    ],
    status: PROJECT_LINK_STATUS.TEMPLATE,
  },
  {
    id: 'play-mechanics-sandbox',
    index: 7,
    title: 'Play Mechanics Sandbox',
    shortTitle: 'Play Sandbox',
    icon: 'database',
    description:
      'Template node reserved for future gameplay prototypes, input experiments, and small interactive systems built around feel and motion.',
    tech: ['Template', 'Gameplay', 'Input Systems'],
    role: 'Reserved build slot for future interactive experiments.',
    highlights: [
      'Designed to hold future playable prototypes',
      'Works with the same single-panel selection flow',
      'Maintains clean coming-soon behavior until links exist',
    ],
    status: PROJECT_LINK_STATUS.TEMPLATE,
  },
  {
    id: 'adaptive-experience-layer',
    index: 8,
    title: 'Adaptive Experience Layer',
    shortTitle: 'Adaptive Layer',
    icon: 'shield',
    description:
      'A presentation layer focused on preserving access across low-spec devices, touch input, and reduced-motion preferences.',
    tech: ['React', 'CSS', 'Device Capability Detection'],
    role: 'Responsive UX, performance tuning, and accessibility-oriented interaction design.',
    highlights: [
      'Low-spec render profile with lighter scene costs',
      'Touch gestures for steering, zoom, and focus interactions',
      'Readable content flow that stays inside the same universe',
    ],
    status: PROJECT_LINK_STATUS.TEMPLATE,
  },
  {
    id: 'secure-access-relay',
    index: 9,
    title: 'Secure Access Relay',
    shortTitle: 'Access Relay',
    icon: 'lock',
    description:
      'Template node prepared for future authentication, privacy, or security-adjacent work that belongs in the portfolio station.',
    tech: ['Template', 'Security', 'Frontend Systems'],
    role: 'Reserved node for future secure workflow projects.',
    highlights: [
      'Provides a clean placeholder without dead links',
      'Keeps the dockyard balanced with a full outer ring',
      'Uses the same conditional action logic as live projects',
    ],
    status: PROJECT_LINK_STATUS.TEMPLATE,
  },
]

export const projectsById = Object.fromEntries(projects.map((project) => [project.id, project]))

const PROJECT_PANEL_RADIAL_OFFSET = 12.5
const PROJECT_PANEL_VERTICAL_OFFSET = 6.2
const PROJECT_CAMERA_RADIAL_OFFSET = 39
const PROJECT_CAMERA_VERTICAL_OFFSET = 11.5
const PROJECT_LOOKAT_VERTICAL_OFFSET = 0.5

function roundTo(value, digits = 2) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function addVec3(base, offset = [0, 0, 0]) {
  return [
    roundTo(base[0] + offset[0]),
    roundTo(base[1] + offset[1]),
    roundTo(base[2] + offset[2]),
  ]
}

function createProjectNodeLayout(id, position) {
  const radialLength = Math.hypot(position[0], position[2]) || 1
  const radialX = position[0] / radialLength
  const radialZ = position[2] / radialLength

  return {
    id,
    position,
    panelOffset: [
      roundTo(radialX * PROJECT_PANEL_RADIAL_OFFSET),
      PROJECT_PANEL_VERTICAL_OFFSET,
      roundTo(radialZ * PROJECT_PANEL_RADIAL_OFFSET),
    ],
    cameraOffset: [
      roundTo(radialX * PROJECT_CAMERA_RADIAL_OFFSET),
      PROJECT_CAMERA_VERTICAL_OFFSET,
      roundTo(radialZ * PROJECT_CAMERA_RADIAL_OFFSET),
    ],
    lookAtOffset: [0, PROJECT_LOOKAT_VERTICAL_OFFSET, 0],
  }
}

export const PROJECT_NODE_LAYOUT = [
  createProjectNodeLayout('cyber-sphere-portfolio', [-18.84, 21.26, -49.34]),
  createProjectNodeLayout('orbital-foundry-node', [-42.87, 21.13, -33.96]),
  createProjectNodeLayout('visual-memory-atlas', [-42.09, 21.16, 35.08]),
  createProjectNodeLayout('signal-cli', [-17.63, 21.25, 49.73]),
  createProjectNodeLayout('play-mechanics-sandbox', [22.78, 21.18, 46.1]),
  createProjectNodeLayout('adaptive-experience-layer', [43.85, 21.2, 23.8]),
  createProjectNodeLayout('secure-access-relay', [49.8, 21.16, -0.03]),
  createProjectNodeLayout('planetary-autopilot', [43.19, 21.2, -25.24]),
  createProjectNodeLayout('world-interface-index', [21.6, 21.19, -46.94]),
]

export const projectNodeLayoutById = Object.fromEntries(PROJECT_NODE_LAYOUT.map((node) => [node.id, node]))

export function buildProjectFocusTarget(anchorPosition, node, label = 'Project Node') {
  const position = addVec3(anchorPosition, node.position)
  const panelPosition = addVec3(position, node.panelOffset)

  return {
    id: node.id,
    label,
    position,
    panelPosition,
    cameraPosition: addVec3(panelPosition, node.cameraOffset),
    lookAt: addVec3(panelPosition, node.lookAtOffset),
  }
}

export function getProjectLinks(project) {
  if (!project) return []

  return [
    project.demoUrl
      ? {
          id: 'demo',
          label: 'Demo',
          href: project.demoUrl,
        }
      : null,
    project.githubUrl
      ? {
          id: 'github',
          label: 'GitHub',
          href: project.githubUrl,
        }
      : null,
  ].filter(Boolean)
}

export function getProjectStatusLabel(project) {
  if (!project) return 'Unknown'
  if (project.status === PROJECT_LINK_STATUS.LIVE) return 'Live Build'
  if (project.status === PROJECT_LINK_STATUS.TEMPLATE) return 'Template Node'
  return 'Coming Soon'
}
