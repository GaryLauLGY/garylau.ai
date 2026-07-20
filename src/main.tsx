import { useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

function AboutWindow() {
  return (
    <section className="about-window" aria-labelledby="about-name">
      <div className="retro-titlebar" aria-hidden="true">
        <div className="retro-title-left">
          <span className="retro-icon">G</span>
          <span>PROFILE.EXE</span>
        </div>

        <div className="retro-window-buttons">
          <span className="retro-window-button">_</span>
          <span className="retro-window-button">[]</span>
          <span className="retro-window-button">X</span>
        </div>
      </div>

      <div className="retro-window-body">
        <h1 id="about-name">Gary Lau｜刘耕宇</h1>

        <div className="retro-group-box">
          <span className="retro-group-title">Personal Information</span>

          <dl className="retro-profile-list">
            <div>
              <dt>EDUCATION</dt>
              <dd>华南理工大学</dd>
            </div>
            <div>
              <dt>ROLE</dt>
              <dd>AI co-founder</dd>
            </div>
            <div>
              <dt>FOCUS</dt>
              <dd>AI Agent、知识库、AI 工作流、GEO 优化</dd>
            </div>
          </dl>
        </div>

        <div className="retro-status-panel">
          <span>STATUS:</span>
          <strong>UPGRADING...</strong>
        </div>
      </div>

      <span className="retro-scanlines" aria-hidden="true" />
    </section>
  )
}

function ScrubVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const targetTimeRef = useRef(0)
  const previousXRef = useRef<number | null>(null)
  const seekingRef = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const sensitivity = 0.8
    const seekTolerance = 1 / 48
    const motionVideoUrl = '/assets/mainframe-robot-motion.mp4?v=dark-1'
    const preloadController = new AbortController()
    let objectUrl: string | null = null

    const seekToTarget = () => {
      if (seekingRef.current || !Number.isFinite(video.duration)) return
      if (Math.abs(video.currentTime - targetTimeRef.current) < seekTolerance) return
      seekingRef.current = true
      video.currentTime = targetTimeRef.current
    }

    const onMetadata = () => {
      video.pause()
      targetTimeRef.current = Math.min(video.duration, 1)
      seekingRef.current = true
      video.currentTime = targetTimeRef.current
    }

    const onSeeked = () => {
      seekingRef.current = false
      seekToTarget()
    }

    const moveToX = (currentX: number) => {
      const previousX = previousXRef.current
      previousXRef.current = currentX
      if (previousX === null || !Number.isFinite(video.duration)) return

      const delta = currentX - previousX
      const offset = (delta / window.innerWidth) * sensitivity * video.duration
      targetTimeRef.current = Math.min(video.duration, Math.max(0, targetTimeRef.current + offset))
      seekToTarget()
    }

    const onMouseMove = (event: MouseEvent) => moveToX(event.clientX)

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return
      previousXRef.current = touch.clientX
      if (video.readyState === HTMLMediaElement.HAVE_NOTHING) video.load()
    }

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (touch) moveToX(touch.clientX)
    }

    const resetPointer = () => {
      previousXRef.current = null
    }

    video.addEventListener('loadedmetadata', onMetadata)
    video.addEventListener('seeked', onSeeked)
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', resetPointer, { passive: true })
    window.addEventListener('touchcancel', resetPointer, { passive: true })
    window.addEventListener('blur', resetPointer)
    document.documentElement.addEventListener('mouseleave', resetPointer)

    const preloadVideo = async () => {
      try {
        const response = await fetch(motionVideoUrl, {
          cache: 'force-cache',
          signal: preloadController.signal,
        })

        if (!response.ok) throw new Error(`Video preload failed: ${response.status}`)

        const videoBlob = await response.blob()
        if (preloadController.signal.aborted) return

        objectUrl = URL.createObjectURL(videoBlob)
        video.src = objectUrl
        video.load()
      } catch {
        if (preloadController.signal.aborted) return
        video.src = motionVideoUrl
        video.load()
      }
    }

    void preloadVideo()

    return () => {
      preloadController.abort()
      video.removeEventListener('loadedmetadata', onMetadata)
      video.removeEventListener('seeked', onSeeked)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', resetPointer)
      window.removeEventListener('touchcancel', resetPointer)
      window.removeEventListener('blur', resetPointer)
      document.documentElement.removeEventListener('mouseleave', resetPointer)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [])

  return (
    <main className="hero-stage">
      <header className="site-header">
        <div className="site-header-inner">
          <div className="site-brand" aria-label="garylau.ai home">
            garylau.ai
          </div>

          <nav className="site-nav" aria-label="主导航">
            <button type="button">关于</button>
            <button type="button">联系我</button>
          </nav>
        </div>
      </header>

      <AboutWindow />

      <video
        ref={videoRef}
        className="hero-video"
        muted
        playsInline
        preload="auto"
        poster="/assets/mainframe-robot-poster.png"
        draggable={false}
        aria-label="GaryLau CRT-headed figure controlled by horizontal pointer movement"
      />
    </main>
  )
}

function App() {
  return <ScrubVideo />
}

createRoot(document.getElementById('root')!).render(<App />)
