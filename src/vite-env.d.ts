/// <reference types="vite/client" />

interface TurnstileRenderOptions {
  sitekey: string
  action?: string
  appearance?: 'always' | 'execute' | 'interaction-only'
  size?: 'normal' | 'flexible' | 'compact'
  theme?: 'auto' | 'light' | 'dark'
  callback?: (token: string) => void
  'expired-callback'?: () => void
  'error-callback'?: () => void
}

interface Window {
  turnstile?: {
    render(container: HTMLElement, options: TurnstileRenderOptions): string
    reset(widgetId?: string): void
    remove(widgetId: string): void
  }
}
