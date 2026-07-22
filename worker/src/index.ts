type RateLimitBinding = {
  limit(input: { key: string }): Promise<{ success: boolean }>
}

type EmailBinding = {
  send(message: {
    to: string
    from: string
    subject: string
    html: string
    text: string
    replyTo: string
  }): Promise<{ messageId: string }>
}

type Env = {
  ALLOWED_ORIGINS: string
  RECIPIENT_EMAIL: string
  SENDER_EMAIL: string
  TURNSTILE_SECRET_KEY: string
  EMAIL: EmailBinding
  IP_RATE_LIMITER: RateLimitBinding
  EMAIL_RATE_LIMITER: RateLimitBinding
}

type ContactPayload = {
  name?: unknown
  company?: unknown
  email?: unknown
  stage?: unknown
  budget?: unknown
  brief?: unknown
  website?: unknown
  turnstileToken?: unknown
  startedAt?: unknown
}

const MAX_BODY_BYTES = 20_000

const json = (body: Record<string, unknown>, status: number, origin: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Content-Type': 'application/json; charset=utf-8',
      'Referrer-Policy': 'no-referrer',
      Vary: 'Origin',
    },
  })

const cleanText = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    }
    return entities[character]
  })

const hash = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const verifyTurnstile = async (
  token: string,
  remoteIp: string,
  secret: string,
  allowedHostnames: Set<string>,
) => {
  const formData = new FormData()
  formData.append('secret', secret)
  formData.append('response', token)
  formData.append('remoteip', remoteIp)

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  })
  const result = (await response.json()) as {
    success?: boolean
    hostname?: string
    action?: string
  }

  return Boolean(
    result.success &&
      result.hostname &&
      allowedHostnames.has(result.hostname) &&
      result.action === 'contact',
  )
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || ''
    const allowedOrigins = new Set(env.ALLOWED_ORIGINS.split(',').map((value) => value.trim()))

    if (!allowedOrigins.has(origin)) {
      return new Response('Forbidden', { status: 403 })
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin',
        },
      })
    }
    if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405, origin)

    const contentLength = Number(request.headers.get('Content-Length') || '0')
    if (contentLength > MAX_BODY_BYTES) {
      return json({ ok: false, error: 'Request too large' }, 413, origin)
    }

    const remoteIp = request.headers.get('CF-Connecting-IP') || 'unknown'
    const ipLimit = await env.IP_RATE_LIMITER.limit({ key: await hash(remoteIp) })
    if (!ipLimit.success) {
      return json({ ok: false, error: 'Too many requests' }, 429, origin)
    }

    let payload: ContactPayload
    try {
      payload = (await request.json()) as ContactPayload
    } catch {
      return json({ ok: false, error: 'Invalid JSON' }, 400, origin)
    }

    const name = cleanText(payload.name, 80)
    const company = cleanText(payload.company, 100)
    const email = cleanText(payload.email, 160).toLowerCase()
    const stage = cleanText(payload.stage, 40)
    const budget = cleanText(payload.budget, 40)
    const brief = cleanText(payload.brief, 500)
    const honeypot = cleanText(payload.website, 200)
    const turnstileToken = cleanText(payload.turnstileToken, 2048)
    const startedAt = typeof payload.startedAt === 'number' ? payload.startedAt : 0

    if (honeypot) return json({ ok: true }, 200, origin)

    if (
      !name ||
      !company ||
      !email ||
      !stage ||
      !budget ||
      !brief ||
      !turnstileToken ||
      !/^\S+@\S+\.\S+$/.test(email)
    ) {
      return json({ ok: false, error: 'Missing or invalid fields' }, 400, origin)
    }

    if (!startedAt || Date.now() - startedAt < 2_000) {
      return json({ ok: false, error: 'Form submitted too quickly' }, 400, origin)
    }

    const emailLimit = await env.EMAIL_RATE_LIMITER.limit({ key: await hash(email) })
    if (!emailLimit.success) {
      return json({ ok: false, error: 'Too many requests' }, 429, origin)
    }

    const allowedHostnames = new Set(
      Array.from(allowedOrigins, (value) => new URL(value).hostname),
    )
    const turnstileValid = await verifyTurnstile(
      turnstileToken,
      remoteIp,
      env.TURNSTILE_SECRET_KEY,
      allowedHostnames,
    )

    if (!turnstileValid) {
      return json({ ok: false, error: 'Verification failed' }, 403, origin)
    }

    const safe = {
      name: escapeHtml(name),
      company: escapeHtml(company),
      email: escapeHtml(email),
      stage: escapeHtml(stage),
      budget: escapeHtml(budget),
      brief: escapeHtml(brief).replace(/\n/g, '<br />'),
    }

    await env.EMAIL.send({
      to: env.RECIPIENT_EMAIL,
      from: env.SENDER_EMAIL,
      replyTo: email,
      subject: `[garylau.ai] New project brief from ${name}`,
      text: [
        `Name: ${name}`,
        `Company: ${company}`,
        `Email: ${email}`,
        `Project stage: ${stage}`,
        `Budget: ${budget}`,
        '',
        'Brief:',
        brief,
      ].join('\n'),
      html: `
        <h2>New project brief</h2>
        <p><strong>Name:</strong> ${safe.name}</p>
        <p><strong>Company:</strong> ${safe.company}</p>
        <p><strong>Email:</strong> ${safe.email}</p>
        <p><strong>Project stage:</strong> ${safe.stage}</p>
        <p><strong>Budget:</strong> ${safe.budget}</p>
        <hr />
        <p><strong>Brief:</strong><br />${safe.brief}</p>
      `,
    })

    return json({ ok: true }, 200, origin)
  },
}
