import { create } from 'zustand'

const useGameStore = create((set, get) => ({
  score: 0,
  autoCrawl: true,
  direction: { x: 1, y: 0 },
  snakeSegments: [{ x: 0, y: 0 }],
  food: { x: 5, y: 3 },
  gameOver: false,
  serpentinePhase: 0,

  setDirection: (dir) => set({ direction: dir }),
  incrementScore: () => set((s) => ({ score: s.score + 10 })),
  toggleAutoCrawl: () => set((s) => ({ autoCrawl: !s.autoCrawl })),
  setSnakeSegments: (segs) => set({ snakeSegments: segs }),
  setFood: (food) => set({ food }),
  setSerpentinePhase: (phase) => set({ serpentinePhase: phase }),
  resetGame: () => set({
    score: 0,
    snakeSegments: [{ x: 0, y: 0 }],
    direction: { x: 1, y: 0 },
    gameOver: false,
    serpentinePhase: 0,
  }),
}))

export default useGameStore
