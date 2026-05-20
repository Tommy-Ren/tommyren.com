import projectIconAtlasUrl from '../../assets/icon.png'

const ATLAS_COLUMNS = 4
const ATLAS_ROWS = 4

const ICON_SPRITES = {
  code: { col: 0, row: 0 },
  cube: { col: 1, row: 0 },
  image: { col: 2, row: 0 },
  globe: { col: 3, row: 0 },
  waveform: { col: 0, row: 1 },
  ai: { col: 1, row: 1 },
  database: { col: 2, row: 1 },
  lock: { col: 3, row: 1 },
  game: { col: 0, row: 2 },
  shield: { col: 1, row: 2 },
  terminal: { col: 2, row: 2 },
  rocket: { col: 3, row: 2 },
  chart: { col: 0, row: 3 },
  tool: { col: 1, row: 3 },
  cloud: { col: 2, row: 3 },
  camera: { col: 3, row: 3 },
}

export const DEFAULT_PROJECT_ICON = 'code'

export function getProjectIconSprite(iconType) {
  return ICON_SPRITES[iconType] || ICON_SPRITES[DEFAULT_PROJECT_ICON]
}

export function getProjectIconStyle(iconType) {
  const sprite = getProjectIconSprite(iconType)
  const x = (sprite.col / (ATLAS_COLUMNS - 1)) * 100
  const y = (sprite.row / (ATLAS_ROWS - 1)) * 100

  return {
    backgroundImage: `url(${projectIconAtlasUrl})`,
    backgroundSize: `${ATLAS_COLUMNS * 100}% ${ATLAS_ROWS * 100}%`,
    backgroundPosition: `${x}% ${y}%`,
  }
}

export function getProjectIconUv(iconType) {
  const sprite = getProjectIconSprite(iconType)
  const tileWidth = 1 / ATLAS_COLUMNS
  const tileHeight = 1 / ATLAS_ROWS

  return {
    offsetX: sprite.col * tileWidth,
    offsetY: 1 - (sprite.row + 1) * tileHeight,
    repeatX: tileWidth,
    repeatY: tileHeight,
  }
}
