import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ArrowUpRight } from 'lucide-react'
import { useUI } from '../../store/store'
import { scrollToSection } from '../../hooks/useSmoothScroll'
import { cn } from '../../utils/cn'
import { GithubMark, LinkedinMark, XMark } from '../ui/BrandIcons'

const MENU_ITEMS = [
  { index: '01', label: 'Home', target: '#hero' },
  { index: '02', label: 'About', target: '#about' },
  { index: '03', label: 'Projects', target: '#work' },
  { index: '04', label: 'Labs', target: '#lab' },
  { index: '05', label: 'Contact', target: '#contact' },
] as const

const SOCIALS = [
  { label: 'GitHub', href: 'https://github.com/TanvirHasanHridoy/' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/th-hridoy/' },
] as const

/**
 * Floating navigation card anchored top-right under the header pills.
 * Visibility is React-authoritative (inline `visibility` from menuOpen) so
 * the card can never ghost-stay open; gsap only runs entrance/exit tweens.
 */
export default function MenuOverlay() {
  const menuOpen = useUI((s) => s.menuOpen)
  const setMenuOpen = useUI((s) => s.setMenuOpen)
  const cardRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef<HTMLElement[]>([])

  /* Escape closes */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setMenuOpen])

  /* Entrance / exit tweens (visibility itself stays with React) */
  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    /* dedupe ref-collection (StrictMode remounts can double-register) */
    const items = Array.from(new Set(itemsRef.current))

    card.style.pointerEvents = menuOpen ? 'auto' : 'none'

    if (menuOpen) {
      /* card arrives fast so the item masks never read as empty rows */
      gsap.fromTo(
        card,
        { y: 26, scale: 0.92, autoAlpha: 0 },
        { y: 0, scale: 1, autoAlpha: 1, duration: 0.42, ease: 'expo.out' },
      )
      gsap.fromTo(
        items,
        { yPercent: 118 },
        {
          yPercent: 0,
          duration: 0.55,
          ease: 'expo.out',
          stagger: 0.04,
          delay: 0.05,
        },
      )
    } else {
      gsap.to(card, {
        y: 18,
        scale: 0.94,
        autoAlpha: 0,
        duration: 0.4,
        ease: 'power2.in',
      })
    }
  }, [menuOpen])

  const onNavigate = (target: string) => {
    setMenuOpen(false)
    window.setTimeout(() => scrollToSection(target), 80)
  }

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label="Site navigation"
      aria-hidden={!menuOpen}
      className={cn(
        'fixed right-5 top-[84px] z-50 w-[min(92vw,420px)] overflow-hidden rounded-[28px] border border-line shadow-[0_24px_72px_-24px_rgb(10_10_14/0.3)] md:right-7 md:top-[92px]',
      )}
      style={{
        background: 'color-mix(in srgb, var(--c-bg) 90%, transparent)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        visibility: menuOpen ? 'visible' : 'hidden',
      }}
      data-menu-card
    >
      <div className="flex flex-col px-6 pb-5 pt-4 md:px-8 md:pt-5">
        <nav className="flex flex-col">
          {MENU_ITEMS.map((item) => (
            <div
              key={item.index}
              className="line-mask border-b border-line last:border-b-0"
            >
              <a
                ref={(el) => {
                  if (el) itemsRef.current[itemsRef.current.length] = el
                }}
                href={item.target}
                data-menu-item
                data-cursor-variant="magnetic"
                data-cursor=""
                onClick={(e) => {
                  e.preventDefault()
                  onNavigate(item.target)
                }}
                className="group flex items-baseline gap-4 py-2.5 md:py-3"
              >
                <span className="eyebrow shrink-0" style={{ color: 'var(--c-accent)' }}>
                  {item.index}
                </span>
                <span
                  className="font-display text-[clamp(1.7rem,4.5vw,2.3rem)] font-semibold tracking-tight"
                  style={{ lineHeight: 1.1 }}
                >
                  {item.label}
                </span>
                <ArrowUpRight
                  size={22}
                  className="ml-auto shrink-0 self-center text-muted opacity-0 transition-all duration-500 group-hover:rotate-45 group-hover:text-accent group-hover:opacity-100"
                  style={{ transitionTimingFunction: 'var(--e-io)' }}
                />
              </a>
            </div>
          ))}
        </nav>

        <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
          <span className="eyebrow">Chemnitz · Germany</span>
          <div className="flex items-center gap-1.5">
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                data-cursor-variant="magnetic"
                data-cursor={social.label === 'GitHub' ? 'GIT' : undefined}
                aria-label={social.label}
                className="grid size-9 place-items-center rounded-full border border-line text-muted transition-colors duration-300 hover:border-accent hover:text-accent"
              >
                {social.label === 'GitHub' ? (
                  <GithubMark />
                ) : social.label === 'LinkedIn' ? (
                  <LinkedinMark />
                ) : (
                  <XMark />
                )}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
