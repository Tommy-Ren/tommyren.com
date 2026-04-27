import { useEffect, useRef, useState } from 'react'

const BGM_TRACKS = Array.from({ length: 11 }, (_, i) => `/music/bgm_${i + 1}.mp3`)
const CLICK_SOUNDS = [
  '/sounds/button_click.mp3',
  '/sounds/button_click_2.mp3',
  '/sounds/button_click_3.mp3',
]

function playClickSound() {
  const src = CLICK_SOUNDS[Math.floor(Math.random() * CLICK_SOUNDS.length)]
  const sfx = new Audio(src)
  sfx.volume = 0.35
  sfx.play().catch(() => {})
}

function shuffleTracks(avoidFirst = null) {
  const shuffled = [...BGM_TRACKS]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  if (avoidFirst && shuffled.length > 1 && shuffled[0] === avoidFirst) {
    const swapIndex = shuffled.findIndex((track) => track !== avoidFirst)
    if (swapIndex > 0) {
      ;[shuffled[0], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[0]]
    }
  }

  return shuffled
}

export default function MusicToggle() {
  const audioRef = useRef(null)
  const queueRef = useRef([])
  const queueIndexRef = useRef(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    queueRef.current = shuffleTracks()
    queueIndexRef.current = 0

    const audio = new Audio(queueRef.current[queueIndexRef.current])
    audioRef.current = audio
    audio.preload = 'auto'
    audio.loop = false
    audio.volume = 0.55

    const playNextTrack = () => {
      const previousTrack = queueRef.current[queueIndexRef.current]
      queueIndexRef.current += 1

      if (queueIndexRef.current >= queueRef.current.length) {
        queueRef.current = shuffleTracks(previousTrack)
        queueIndexRef.current = 0
      }

      audio.src = queueRef.current[queueIndexRef.current]
      audio.play().catch(() => {})
    }

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => playNextTrack()
    const onError = () => playNextTrack()

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    audio.play().catch(() => {
      setIsMuted(true)
      setIsPlaying(false)
    })

    return () => {
      audio.pause()
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audio.src = ''
    }
  }, [])

  const toggleMute = async () => {
    playClickSound()
    const audio = audioRef.current
    if (!audio) return

    const nextMuted = !isMuted
    audio.muted = nextMuted
    setIsMuted(nextMuted)

    if (!nextMuted) {
      await audio.play().catch(() => {})
    }
  }

  const animated = isPlaying && !isMuted

  return (
    <div className="music-toggle-wrap">
      <button
        type="button"
        className={`music-toggle ${animated ? 'is-playing' : 'is-muted'}`}
        aria-label={animated ? 'Mute background music' : 'Unmute background music'}
        onClick={toggleMute}
      >
        <span className="music-wave" aria-hidden="true">
          <span className="wave-bar bar-1" />
          <span className="wave-bar bar-2" />
          <span className="wave-bar bar-3" />
          <span className="wave-bar bar-4" />
        </span>
      </button>
    </div>
  )
}
