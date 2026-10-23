import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from 'react'
import gsap from 'gsap'
import { ArrowUpRight, Send } from 'lucide-react'
import MaskedLines from '../components/ui/MaskedLines'
import Magnetic from '../components/ui/Magnetic'
import RollLink from '../components/ui/RollLink'
import { GithubMark, LinkedinMark } from '../components/ui/BrandIcons'
import { useUI } from '../store/store'
import { damp } from '../store/scrollStore'
import { CONTACT_ENDPOINT, PROFILE } from '../data/profile'

/* smoothed-fill holder lives on the bar element itself */
type FillEl = HTMLSpanElement & { __smooth?: number }

/**
 * Footer — massive CTA, structured info grid with a live Europe/Berlin clock,
 * and the "CONTINUE TO SCROLL" progress portal. Pushing the wheel past the
 * bottom of the document fills the bar; at 100% the About/Labs portal opens.
 */
export default function Footer() {
  const setPortalOpen = useUI((s) => s.setPortalOpen)
  const portalOpen = useUI((s) => s.portalOpen)
  const footerRef = useRef<HTMLElement>(null)
  const barWrapRef = useRef<HTMLDivElement>(null)
  const barFillRef = useRef<FillEl>(null)
  const [now, setNow] = useState(() => new Date())
  const portalProgress = useRef(0)

  /* The portal bar is a bottom-of-page gesture, not a general footer
     chrome. Keep it hidden while the contact details / form are being read,
     then reveal it at the same near-bottom threshold the wheel charge uses.
     Checked on a timer so browser-restored scroll positions and dynamic
     mobile viewports settle correctly. */
  useEffect(() => {
    const wrap = barWrapRef.current
    if (!wrap) return
    let visible = false
    const check = () => {
      const limit = document.documentElement.scrollHeight - window.innerHeight
      const slack = Math.min(120, Math.max(32, window.innerHeight * 0.1))
      const want = window.scrollY >= limit - slack
      if (want !== visible) {
        visible = want
        wrap.style.opacity = want ? '1' : '0'
        /* visibility (not just opacity) removes the invisible bar from
           pointer hit-testing, tab order and the accessibility tree */
        wrap.style.visibility = want ? 'visible' : 'hidden'
      }
    }
    check()
    /* re-check on task-level delays too (fonts, HMR) */
    const id = window.setInterval(check, 350)
    return () => window.clearInterval(id)
  }, [])

  /* live clock — Chemnitz runs on Europe/Berlin */
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const timeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now)

  /* contact form — posts to a private form endpoint, so no personal email
     address is exposed. The submit stays disabled until the endpoint is
     supplied via VITE_CONTACT_ENDPOINT; LinkedIn is the fallback. */
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [trap, setTrap] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const inboxReady = CONTACT_ENDPOINT.length > 0

  const setField =
    (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }))
      if (status !== 'idle' && status !== 'sending') setStatus('idle')
    }

  const onFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!inboxReady || status === 'sending') return
    /* honeypot — silently accept without forwarding obvious bots */
    if (trap) {
      setStatus('sent')
      return
    }
    setStatus('sending')
    try {
      const res = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
          _subject: `Portfolio inquiry — ${form.name.trim() || 'someone from the site'}`,
          source: 'portfolio',
        }),
      })
      if (!res.ok) throw new Error(`Contact endpoint returned ${res.status}`)
      setForm({ name: '', email: '', message: '' })
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  /* push-past-bottom detection → portal charge. Mouse: repeated wheel
     spins past the bottom of the document. Touch: repeated up-swipes at
     the bottom (wheel events don't exist there — mobile bug).
     Mobile browsers often stop a few dozen px short of the computed
     scroll limit (dynamic URL bar / viewport), so accept a near-bottom
     band instead of requiring an exact 4px hit. Touch also fills faster
     and bleeds slower so multiple thumb swipes can accumulate. */
  useEffect(() => {
    if (portalOpen) return
    const nearBottom = () => {
      const limit = document.documentElement.scrollHeight - window.innerHeight
      const slack = Math.min(120, Math.max(32, window.innerHeight * 0.1))
      return window.scrollY >= limit - slack
    }
    const charge = (delta: number) => {
      if (!nearBottom()) return
      portalProgress.current = Math.min(portalProgress.current + delta, 1)
      if (portalProgress.current >= 1) {
        portalProgress.current = 0
        setPortalOpen(true)
      }
    }
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) charge(e.deltaY / 2000)
    }
    let lastTouchY = 0
    const onTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0]?.clientY ?? 0
    }
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? lastTouchY
      const dy = lastTouchY - y /* up-swipe → positive */
      lastTouchY = y
      if (dy > 0) charge(dy / 400)
    }
    /* slow self-bleed so the bar is a deliberate gesture, not an accident */
    const decay = (time: number) => {
      void time
      if (portalProgress.current > 0) {
        portalProgress.current = Math.max(0, portalProgress.current - 0.0011)
      }
      const bar = barFillRef.current
      if (bar) {
        bar.__smooth = damp(bar.__smooth ?? 0, portalProgress.current, 9, 0.016)
        bar.style.transform = `scaleX(${bar.__smooth})`
      }
    }
    gsap.ticker.add(decay)
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      gsap.ticker.remove(decay)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
    }
  }, [portalOpen, setPortalOpen])

  /* reset the charge when the portal closes again */
  useEffect(() => {
    if (!portalOpen) {
      portalProgress.current = 0
      if (barFillRef.current) barFillRef.current.__smooth = 0
    }
  }, [portalOpen])

  return (
    <footer
      ref={footerRef}
      id="contact"
      className="relative flex min-h-[100svh] flex-col justify-between px-5 pb-24 pt-[16vh] md:px-10"
    >
      {/* CTA */}
      <div>
        <span className="eyebrow">04 — contact</span>
        <MaskedLines
          as="h2"
          start="top 86%"
          lines={["Let's Build", 'Something Great.']}
          className="display-xl mt-6"
        />
        <div className="mt-10 flex flex-wrap items-center gap-5">
          <Magnetic strength={0.5}>
            <a
              href="https://www.linkedin.com/in/th-hridoy/"
              target="_blank"
              rel="noreferrer"
              data-cursor="SAY HI"
              data-cursor-variant="view"
              className="pill btn-sweep btn-blank !px-9 !py-5 !text-[1.05rem]"
            >
              Say hi!
              <ArrowUpRight size={18} />
            </a>
          </Magnetic>
          <span className="eyebrow">open to working-student & entry-level roles in Germany</span>
        </div>
      </div>

      {/* info grid — located / socials / direct-message form */}
      <div className="mt-[10vh] grid gap-10 border-t border-line pt-8 md:grid-cols-4">
        <div>
          <span className="eyebrow">located</span>
          <p className="mt-3 text-[0.95rem] font-semibold">Chemnitz, Germany</p>
          <p className="eyebrow mt-1">{PROFILE.timezone}</p>
          <p
            className="mt-2 font-mono text-[1.15rem] font-bold tracking-tight"
            style={{ color: 'var(--c-accent-ink)', fontVariantNumeric: 'tabular-nums' }}
          >
            {timeStr}
          </p>
        </div>

        <div>
          <span className="eyebrow">socials</span>
          <div className="mt-3 flex flex-col items-start gap-2">
            <RollLink
              label="GitHub"
              href="https://github.com/TanvirHasanHridoy/"
              target="_blank"
              rel="noreferrer"
              className="text-[0.95rem] font-semibold"
            />
            <RollLink
              label="LinkedIn"
              href="https://www.linkedin.com/in/th-hridoy/"
              target="_blank"
              rel="noreferrer"
              className="text-[0.95rem] font-semibold"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <a
              href="https://github.com/TanvirHasanHridoy/"
              target="_blank"
              rel="noreferrer"
              data-cursor-variant="magnetic"
              data-cursor=""
              aria-label="GitHub"
              className="grid size-9 place-items-center rounded-full border border-line text-muted transition-colors duration-300 hover:border-accent hover:text-accent-ink"
            >
              <GithubMark />
            </a>
            <a
              href="https://www.linkedin.com/in/th-hridoy/"
              target="_blank"
              rel="noreferrer"
              data-cursor-variant="magnetic"
              data-cursor=""
              aria-label="LinkedIn"
              className="grid size-9 place-items-center rounded-full border border-line text-muted transition-colors duration-300 hover:border-accent hover:text-accent-ink"
            >
              <LinkedinMark />
            </a>
          </div>
          <span className="eyebrow mt-6 hidden md:block">© 2026 S M Tanvir Hasan Hridoy</span>
        </div>

        {/* direct-message form — private endpoint, no email exposed */}
        <div className="md:col-span-2">
          <span className="eyebrow">direct message</span>
          <div
            className="mt-3 rounded-[20px] border border-line p-5 md:p-6"
            style={{
              background: 'color-mix(in srgb, var(--c-bg) 74%, transparent)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <form onSubmit={onFormSubmit} className="grid gap-3.5">
              {/* honeypot: visually hidden, never tabbable */}
              <label
                aria-hidden="true"
                className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
              >
                <span>Website</span>
                <input
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={trap}
                  onChange={(e) => setTrap(e.target.value)}
                />
              </label>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="eyebrow">name</span>
                  <input
                    name="name"
                    required
                    value={form.name}
                    onChange={setField('name')}
                    autoComplete="name"
                    placeholder="Your name"
                    className="field"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="eyebrow">email</span>
                  <input
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={setField('email')}
                    autoComplete="email"
                    placeholder="you@company.com"
                    className="field"
                  />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="eyebrow">message</span>
                <textarea
                  name="message"
                  required
                  rows={4}
                  value={form.message}
                  onChange={setField('message')}
                  placeholder="What should we build together?"
                  className="field resize-none"
                />
              </label>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={!inboxReady || status === 'sending'}
                  data-cursor={inboxReady ? 'SEND' : undefined}
                  data-cursor-variant="magnetic"
                  className="pill btn-sweep !py-3.5 !text-[0.9rem] !px-6 disabled:!opacity-40"
                >
                  {status === 'sending' ? 'Sending…' : 'Send message'}
                  <Send size={15} />
                </button>
                {(!inboxReady || status === 'error') && (
                  <a
                    href={PROFILE.links.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    data-cursor="OPEN"
                    data-cursor-variant="magnetic"
                    className="pill !px-5 !py-3.5 !text-[0.9rem]"
                  >
                    Message on LinkedIn
                    <LinkedinMark />
                  </a>
                )}
                <span className="eyebrow" role="status" aria-live="polite">
                  {!inboxReady
                    ? 'direct form is offline — the fastest path right now is LinkedIn.'
                    : status === 'sending'
                      ? 'sending your message…'
                      : status === 'sent'
                        ? 'message received — thanks for reaching out.'
                        : status === 'error'
                          ? 'could not send — please use LinkedIn instead.'
                          : 'sends through a private form endpoint — no email address exposed.'}
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* mobile legal line — the socials column carries it on md+ */}
      <span className="eyebrow mt-8 md:hidden">© 2026 S M Tanvir Hasan Hridoy</span>

      {/* CONTINUE TO SCROLL portal bar — tap to open (essential on touch,
          where the push-past-bottom wheel gesture doesn't exist) */}
      <div
        ref={barWrapRef}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-5 pb-3 opacity-0 transition-opacity duration-500 md:px-10"
        style={{ visibility: 'hidden' }}
      >
        <button
          type="button"
          onClick={() => setPortalOpen(true)}
          aria-label="Open the labs portal"
          data-cursor="OPEN"
          data-cursor-variant="magnetic"
          className="pointer-events-auto flex w-full touch-manipulation items-center justify-between gap-4 rounded-full px-2 py-2.5 transition-colors duration-300 hover:bg-[color-mix(in_srgb,var(--c-fg)_6%,transparent)] md:gap-6 md:px-4"
        >
          <span className="eyebrow">continue to scroll</span>
          <span
            className="relative h-[3px] flex-1 overflow-hidden"
            style={{ background: 'color-mix(in srgb, var(--c-fg) 14%, transparent)', borderRadius: 4 }}
          >
            <span
              ref={barFillRef}
              className="absolute inset-y-0 left-0 block w-full origin-left"
              style={{ background: 'var(--c-accent)', transform: 'scaleX(0)' }}
            />
          </span>
          <span className="eyebrow">labs portal</span>
        </button>
      </div>
    </footer>
  )
}
