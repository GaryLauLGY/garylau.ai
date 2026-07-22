import {
  CSSProperties,
  FormEvent,
  MouseEvent as ReactMouseEvent,
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
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

const currentProjects = [
  'WayneInsightSpring — Study Abroad Q&A Agent',
  'MedFlow — Knowledge Base Development',
  'MedFlow — GEO Optimization',
]

function CurrentProjectsWindow() {
  return (
    <aside className="current-window" aria-label="Current projects">
      <div className="retro-titlebar">
        <div className="retro-title-left">
          <span>CURRENT.LOG</span>
        </div>

        <div className="retro-window-buttons" aria-hidden="true">
          <span className="retro-window-button">_</span>
          <span className="retro-window-button">X</span>
        </div>
      </div>

      <div className="current-window-body">
        <p className="current-command">C:\GARY\PROJECTS&gt; list --active</p>
        <ul className="current-project-list">
          {currentProjects.map((project) => (
            <li key={project}>{project}</li>
          ))}
        </ul>
        <span className="current-cursor" aria-hidden="true">_</span>
      </div>

      <span className="retro-scanlines" aria-hidden="true" />
    </aside>
  )
}

const copyText = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

function OtherContactWindow() {
  const [copiedContact, setCopiedContact] = useState<'wechat' | 'qq' | null>(null)
  const copiedTimerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current)
    },
    [],
  )

  const handleContactCopy = async (value: string, contact: 'wechat' | 'qq') => {
    try {
      await copyText(value)
      setCopiedContact(contact)
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = window.setTimeout(() => setCopiedContact(null), 1800)
    } catch {
      setCopiedContact(null)
    }
  }

  return (
    <aside className="contact-links-window" aria-label="其他联系方式">
      <div className="retro-titlebar">
        <div className="retro-title-left">
          <span>CONTACT.LNK</span>
        </div>

        <div className="retro-window-buttons" aria-hidden="true">
          <span className="retro-window-button">_</span>
          <span className="retro-window-button">X</span>
        </div>
      </div>

      <div className="contact-links-body">
        <button
          className="other-contact-link"
          type="button"
          onClick={() => handleContactCopy('garylau_ai', 'wechat')}
        >
          <span className="other-contact-copy">
            <span>
              <strong>微信：</strong>
              <span className="other-contact-value">garylau_ai</span>
            </span>
            <small>请备注来意</small>
          </span>
          <span className="copy-state" aria-live="polite">
            {copiedContact === 'wechat' ? 'COPIED' : 'COPY'}
          </span>
        </button>

        <a className="other-contact-link" href="mailto:garylaulgy@gmail.com">
          <span className="other-contact-copy">
            <span>
              <strong>邮箱：</strong>
              <span className="other-contact-value">garylaulgy@gmail.com</span>
            </span>
          </span>
          <span aria-hidden="true">↗</span>
        </a>

        <button
          className="other-contact-link"
          type="button"
          onClick={() => handleContactCopy('1192575030', 'qq')}
        >
          <span className="other-contact-copy">
            <span>
              <strong>QQ：</strong>
              <span className="other-contact-value">1192575030</span>
            </span>
          </span>
          <span className="copy-state" aria-live="polite">
            {copiedContact === 'qq' ? 'COPIED' : 'COPY'}
          </span>
        </button>
      </div>

      <span className="retro-scanlines" aria-hidden="true" />
    </aside>
  )
}

function WechatQrWindow() {
  return (
    <aside className="qr-window" aria-label="微信二维码">
      <div className="retro-titlebar">
        <div className="retro-title-left">
          <span>WECHAT.QR</span>
        </div>

        <div className="retro-window-buttons" aria-hidden="true">
          <span className="retro-window-button">_</span>
          <span className="retro-window-button">X</span>
        </div>
      </div>

      <div className="qr-window-body">
        <div className="qr-crop">
          <img
            src="/assets/wechat-garylau-qr.webp"
            alt="GaryLau 微信二维码"
            width="384"
            height="384"
            decoding="async"
          />
        </div>
      </div>
    </aside>
  )
}

type ContactStatus =
  | 'incomplete'
  | 'ready'
  | 'verifying'
  | 'sending'
  | 'success'
  | 'error'
  | 'rate-limited'

const contactStatusCopy: Record<ContactStatus, string> = {
  incomplete: 'INCOMPLETE',
  ready: 'READY',
  verifying: 'VERIFYING...',
  sending: 'TRANSMITTING...',
  success: 'MESSAGE SENT',
  error: 'SEND FAILED — RETRY',
  'rate-limited': 'TOO MANY REQUESTS — WAIT',
}

const contactEndpoint =
  import.meta.env.VITE_CONTACT_ENDPOINT?.trim() || 'https://contact-api.garylau.ai'
const turnstileSiteKey =
  import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || '0x4AAAAAAD7PaKrpyPWrdkPZ'

function ContactWindow() {
  const [status, setStatus] = useState<ContactStatus>('incomplete')
  const [isComplete, setIsComplete] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const formStartedAtRef = useRef(Date.now())
  const turnstileContainerRef = useRef<HTMLDivElement>(null)
  const turnstileWidgetRef = useRef<string | null>(null)

  useEffect(() => {
    if (window.location.protocol === 'file:') return

    let cancelled = false
    let attempts = 0

    const renderTurnstile = () => {
      if (cancelled || turnstileWidgetRef.current || !turnstileContainerRef.current) return

      if (!window.turnstile) {
        attempts += 1
        if (attempts < 80) window.setTimeout(renderTurnstile, 100)
        return
      }

      turnstileWidgetRef.current = window.turnstile.render(turnstileContainerRef.current, {
        sitekey: turnstileSiteKey,
        action: 'contact',
        appearance: 'interaction-only',
        size: 'flexible',
        theme: 'light',
        callback: (token) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => setTurnstileToken(''),
      })
    }

    renderTurnstile()

    return () => {
      cancelled = true
      if (turnstileWidgetRef.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetRef.current)
      }
      turnstileWidgetRef.current = null
    }
  }, [])

  const updateCompletion = (form: HTMLFormElement) => {
    const complete = form.checkValidity()
    setIsComplete(complete)
    if (status !== 'sending') setStatus(complete ? 'ready' : 'incomplete')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget

    if (!form.checkValidity()) {
      setIsComplete(false)
      setStatus('incomplete')
      form.reportValidity()
      return
    }

    if (!turnstileToken) {
      setStatus('verifying')
      return
    }

    setStatus('sending')

    try {
      const formData = new FormData(form)
      const payload = {
        ...Object.fromEntries(formData.entries()),
        turnstileToken,
        startedAt: formStartedAtRef.current,
      }
      const response = await fetch(contactEndpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.status === 429) {
        setStatus('rate-limited')
        return
      }
      if (!response.ok) throw new Error(`Contact request failed: ${response.status}`)

      form.reset()
      setIsComplete(false)
      setStatus('success')
      setTurnstileToken('')
      formStartedAtRef.current = Date.now()
      if (turnstileWidgetRef.current && window.turnstile) {
        window.turnstile.reset(turnstileWidgetRef.current)
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <section className="contact-window" aria-labelledby="contact-title">
      <div className="retro-titlebar">
        <div className="retro-title-left">
          <span>CONTACT.EXE</span>
        </div>

        <div className="retro-window-buttons" aria-hidden="true">
          <span className="retro-window-button">_</span>
          <span className="retro-window-button">[]</span>
          <span className="retro-window-button">X</span>
        </div>
      </div>

      <form
        className="contact-window-body"
        onSubmit={handleSubmit}
        onInput={(event) => updateCompletion(event.currentTarget)}
        onChange={(event) => updateCompletion(event.currentTarget)}
      >
        <h1 id="contact-title">Start a project</h1>

        <fieldset className="contact-group-box">
          <legend>Project Brief</legend>

          <div className="contact-form-grid">
            <label className="contact-field">
              <span>NAME *</span>
              <input name="name" type="text" autoComplete="name" required maxLength={80} />
            </label>

            <label className="contact-field">
              <span>COMPANY *</span>
              <input
                name="company"
                type="text"
                autoComplete="organization"
                required
                maxLength={100}
              />
            </label>

            <label className="contact-field contact-field--wide">
              <span>EMAIL *</span>
              <input name="email" type="email" autoComplete="email" required maxLength={160} />
            </label>

            <label className="contact-field">
              <span>PROJECT STAGE *</span>
              <select name="stage" defaultValue="" required>
                <option value="" disabled>Select stage</option>
                <option value="idea">Early idea</option>
                <option value="planning">Planning</option>
                <option value="building">Already building</option>
                <option value="optimization">Optimization</option>
              </select>
            </label>

            <label className="contact-field">
              <span>BUDGET *</span>
              <select name="budget" defaultValue="" required>
                <option value="" disabled>Select range</option>
                <option value="under-10k">Under ¥10K</option>
                <option value="10k-30k">¥10K–30K</option>
                <option value="30k-100k">¥30K–100K</option>
                <option value="100k-plus">¥100K+</option>
                <option value="unsure">Not sure yet</option>
              </select>
            </label>

            <label className="contact-field contact-field--wide">
              <span>BRIEF *</span>
              <textarea
                name="brief"
                required
                maxLength={500}
                placeholder="What are you building, and where are you stuck?"
              />
            </label>

            <label className="contact-honeypot" aria-hidden="true">
              <span>WEBSITE</span>
              <input name="website" type="text" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
        </fieldset>

        <div
          ref={turnstileContainerRef}
          className="contact-turnstile"
          aria-label="Security verification"
        />

        <div className="contact-action-row">
          <button type="submit" disabled={!isComplete || status === 'sending'}>
            {status === 'sending' ? 'SENDING...' : 'SEND BRIEF'}
          </button>
          <div className={`contact-status contact-status--${status}`} aria-live="polite">
            <span>STATUS:</span>
            <strong>{contactStatusCopy[status]}</strong>
          </div>
        </div>
      </form>

      <span className="retro-scanlines" aria-hidden="true" />
    </section>
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

type CursorGuidePosition = {
  cycle: number
  fromX: number
  fromY: number
  toX: number
  toY: number
}

function MacCursorGuide({
  active,
  targetRef,
}: {
  active: boolean
  targetRef: RefObject<HTMLAnchorElement | null>
}) {
  const [position, setPosition] = useState<CursorGuidePosition | null>(null)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const finePointer = window.matchMedia('(pointer: fine)').matches

    if (!active || reducedMotion || !finePointer) {
      setPosition(null)
      return
    }

    let cycle = 0
    let intervalId: number | null = null

    const playGuide = () => {
      const target = targetRef.current?.getBoundingClientRect()
      if (!target) return

      cycle += 1
      setPosition({
        cycle,
        fromX: window.innerWidth + 48,
        fromY: window.innerHeight + 48,
        toX: target.left + target.width * 0.5,
        toY: target.top + target.height * 0.5,
      })
    }

    const initialId = window.setTimeout(() => {
      playGuide()
      intervalId = window.setInterval(playGuide, 20_000)
    }, 8_000)

    return () => {
      window.clearTimeout(initialId)
      if (intervalId) window.clearInterval(intervalId)
      setPosition(null)
    }
  }, [active, targetRef])

  if (!position) return null

  const style = {
    '--guide-from-x': `${position.fromX}px`,
    '--guide-from-y': `${position.fromY}px`,
    '--guide-to-x': `${position.toX}px`,
    '--guide-to-y': `${position.toY}px`,
  } as CSSProperties

  return (
    <span
      key={position.cycle}
      className="mac-cursor-guide"
      style={style}
      aria-hidden="true"
    >
      <svg className="mac-cursor-arrow" viewBox="0 0 32 40" focusable="false">
        <path d="M3 2.5v29.1l7.2-7 5.2 12.3 6.1-2.7-5.3-12.1h10.7L3 2.5Z" />
      </svg>

      <span className="mac-cursor-hand">
        <svg viewBox="-2 0 90 122" focusable="false">
          <g transform="scale(.68 1)">
            <path
              className="mac-cursor-hand-shape"
              d="M29 73V17C29 10 34 5 41 5s12 5 12 12v32h2V38c0-7 5-12 11-12s11 5 11 12v15h2v-7c0-7 5-12 11-12s11 5 11 12v12h2v-4c0-7 5-12 11-12s11 5 11 12v21c0 26-14 41-39 41H42c-11 0-18-5-24-15L3 76c-3-5-2-12 3-15s11-2 15 3l8 9Z"
            />
          </g>
        </svg>
        <span className="mac-cursor-click-ring" />
      </span>
    </span>
  )
}

function PortraitStage({ view, isSwitching, onNavigate }: PortraitStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const contactNavRef = useRef<HTMLAnchorElement>(null)
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
              ref={contactNavRef}
              href="#contact"
              aria-current={view === 'contact' ? 'page' : undefined}
              onClick={handleNavigation('contact')}
            >
              联系我
            </a>
          </nav>
        </div>
      </header>

      <div className={`profile-cluster profile-cluster--${view}`}>
        {view === 'about' ? (
          <>
            <AboutWindow />
            <div className="secondary-window-row">
              <SocialWindow />
              <CurrentProjectsWindow />
            </div>
          </>
        ) : (
          <>
            <ContactWindow />
            <div className="secondary-window-row secondary-window-row--contact">
              <OtherContactWindow />
              <WechatQrWindow />
            </div>
          </>
        )}
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

      <MacCursorGuide
        active={view === 'about' && !isSwitching}
        targetRef={contactNavRef}
      />
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
