import { MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

function AboutWindow() {
  return (
    <section className="about-window" aria-labelledby="about-name">
      <div className="retro-titlebar" aria-hidden="true">
        <div className="retro-title-left">
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
              <dd className="retro-list-lines">
                <span>AI co-founder</span>
                <span>Google 认证 AI 教育家</span>
                <span>Anthropic 官方认证 AI 应用专家</span>
              </dd>
            </div>
            <div>
              <dt>FOCUS</dt>
              <dd className="retro-list-lines">
                <span>AI Agent 部署</span>
                <span>知识库搭建</span>
                <span>AI 工作流搭建</span>
                <span>GEO 优化</span>
              </dd>
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

const socialLinks = [
  { platform: 'X', account: 'Gary', href: 'https://x.com/GaryLau0101' },
  { platform: '抖音', account: 'Claude最严厉的Father', href: 'https://v.douyin.com/RJE8xC9wAvI/' },
  {
    platform: '小红书',
    account: 'Claude最严厉的Father',
    href: 'https://www.xiaohongshu.com/user/profile/60c395d00000000001007109',
  },
]

function SocialWindow() {
  return (
    <aside className="social-window" aria-label="社交媒体账号">
      <div className="retro-titlebar">
        <div className="retro-title-left">
          <span>SOCIAL.LNK</span>
        </div>

        <div className="retro-window-buttons" aria-hidden="true">
          <span className="retro-window-button">_</span>
          <span className="retro-window-button">X</span>
        </div>
      </div>

      <div className="social-window-body">
        {socialLinks.map((link) => (
          <a key={link.platform} className="social-link" href={link.href} target="_blank" rel="noreferrer">
            <span className="social-link-copy">
              <strong>{link.platform}：</strong>
              <span className="social-account">{link.account}</span>
            </span>
            <span aria-hidden="true">↗</span>
          </a>
        ))}
      </div>

      <span className="retro-scanlines" aria-hidden="true" />
    </aside>
  )
}

type ViewMode = 'about' | 'contact'

const videoConfig: Record<
  ViewMode,
  { src: string; poster: string; initialTime: number; label: string }
> = {
  about: {
    src: '/assets/mainframe-robot-motion.mp4?v=white-2',
    poster: '/assets/mainframe-robot-poster.png',
    initialTime: 1,
    label: '跟随横向鼠标移动转动的 GaryLau 电脑头人物',
  },
  contact: {
    src: '/assets/garylau-crt-smile-scrub.mp4?v=1',
    poster: '/assets/garylau-crt-smile-scrub-poster.png',
    initialTime: 1,
    label: '跟随横向鼠标移动闪烁的绿色 GaryLau CRT 肖像',
  },
}

type PortraitStageProps = {
  view: ViewMode
  isSwitching: boolean
  onNavigate: (view: ViewMode) => void
}

function PortraitStage({ view, isSwitching, onNavigate }: PortraitStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const targetTimeRef = useRef(0)
  const previousXRef = useRef<number | null>(null)
  const seekingRef = useRef(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const config = videoConfig[view]
    const sensitivity = 0.8
    const seekTolerance = 1 / 48
    const preloadController = new AbortController()
    let objectUrl: string | null = null

    previousXRef.current = null
    targetTimeRef.current = 0
    seekingRef.current = false

    const seekToTarget = () => {
      if (seekingRef.current || !Number.isFinite(video.duration)) return
      if (Math.abs(video.currentTime - targetTimeRef.current) < seekTolerance) return
      seekingRef.current = true
      video.currentTime = targetTimeRef.current
    }

    const onMetadata = () => {
      video.pause()
      targetTimeRef.current = Math.min(video.duration, config.initialTime)
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
      targetTimeRef.current = Math.min(
        video.duration,
        Math.max(0, targetTimeRef.current + offset),
      )
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

    const resetScrubPointer = () => {
      previousXRef.current = null
    }

    video.addEventListener('loadedmetadata', onMetadata)
    video.addEventListener('seeked', onSeeked)
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', resetScrubPointer, { passive: true })
    window.addEventListener('touchcancel', resetScrubPointer, { passive: true })
    window.addEventListener('blur', resetScrubPointer)
    document.documentElement.addEventListener('mouseleave', resetScrubPointer)

    const preloadVideo = async () => {
      try {
        const response = await fetch(config.src, {
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
        video.src = config.src
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
      window.removeEventListener('touchend', resetScrubPointer)
      window.removeEventListener('touchcancel', resetScrubPointer)
      window.removeEventListener('blur', resetScrubPointer)
      document.documentElement.removeEventListener('mouseleave', resetScrubPointer)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [view])

  const handleNavigation =
    (nextView: ViewMode) => (event: ReactMouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()
      onNavigate(nextView)
    }

  return (
    <main className="hero-stage">
      <header className="site-header">
        <div className="site-header-inner">
          <a
            className="site-brand"
            href="#about"
            aria-label="garylau.ai home"
            onClick={handleNavigation('about')}
          >
            garylau.ai
          </a>

          <nav className="site-nav" aria-label="主导航">
            <a
              href="#about"
              aria-current={view === 'about' ? 'page' : undefined}
              onClick={handleNavigation('about')}
            >
              关于
            </a>
            <a
              href="#contact"
              aria-current={view === 'contact' ? 'page' : undefined}
              onClick={handleNavigation('contact')}
            >
              联系我
            </a>
          </nav>
        </div>
      </header>

      <div className="profile-cluster">
        <AboutWindow />
        <SocialWindow />
      </div>

      <div
        className={`hero-portrait hero-portrait--${view}${isSwitching ? ' is-switching' : ''}`}
      >
        <video
          key={view}
          ref={videoRef}
          className="hero-portrait-video"
          muted
          playsInline
          preload="auto"
          poster={videoConfig[view].poster}
          aria-label={videoConfig[view].label}
          draggable={false}
        />
        <span className="crt-screen-effect" aria-hidden="true">
          <span className="crt-screen-noise" />
          <span className="crt-signal-line" />
        </span>
      </div>
    </main>
  )
}

function App() {
  const [view, setView] = useState<ViewMode>(() =>
    window.location.hash === '#contact' ? 'contact' : 'about',
  )
  const [isSwitching, setIsSwitching] = useState(false)
  const viewRef = useRef(view)
  const switchingRef = useRef(false)
  const timersRef = useRef<number[]>([])

  const clearTransitionTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer))
    timersRef.current = []
  }, [])

  const transitionTo = useCallback(
    (nextView: ViewMode, updateHash: boolean) => {
      if (nextView === viewRef.current && !switchingRef.current) return

      clearTransitionTimers()
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      if (updateHash && window.location.hash !== `#${nextView}`) {
        window.history.pushState(null, '', `#${nextView}`)
      }

      if (reducedMotion) {
        viewRef.current = nextView
        setView(nextView)
        setIsSwitching(false)
        switchingRef.current = false
        return
      }

      switchingRef.current = true
      setIsSwitching(true)

      timersRef.current = [
        window.setTimeout(() => {
          viewRef.current = nextView
          setView(nextView)
        }, 140),
        window.setTimeout(() => {
          switchingRef.current = false
          setIsSwitching(false)
          timersRef.current = []
        }, 320),
      ]
    },
    [clearTransitionTimers],
  )

  useEffect(() => {
    const syncViewToHash = () => {
      transitionTo(window.location.hash === '#contact' ? 'contact' : 'about', false)
    }

    window.addEventListener('hashchange', syncViewToHash)
    return () => {
      window.removeEventListener('hashchange', syncViewToHash)
      clearTransitionTimers()
    }
  }, [clearTransitionTimers, transitionTo])

  return (
    <PortraitStage
      view={view}
      isSwitching={isSwitching}
      onNavigate={(nextView) => transitionTo(nextView, true)}
    />
  )
}

createRoot(document.getElementById('root')!).render(<App />)
