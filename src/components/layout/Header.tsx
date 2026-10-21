import { useUI } from '../../store/store'
import { scrollToSection } from '../../hooks/useSmoothScroll'
import Magnetic from '../ui/Magnetic'
import { cn } from '../../utils/cn'

function Monogram() {
  return (
    <Magnetic strength={0.5} className="pointer-events-auto">
      <a
        href="#hero"
        onClick={(e) => {
          e.preventDefault()
          scrollToSection('#hero')
        }}
        data-cursor-variant="magnetic"
        data-cursor=""
        className="flex items-center gap-3"
      >
        <span
          className="grid size-10 place-items-center rounded-full bg-accent text-[13px] font-bold text-white no-select"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          TH
        </span>
        <span className="hidden flex-col leading-tight md:flex">
          <span className="text-[13px] font-semibold tracking-tight">S M Tanvir Hasan Hridoy</span>
          <span className="eyebrow" style={{ letterSpacing: '0.08em' }}>
            creative developer
          </span>
        </span>
      </a>
    </Magnetic>
  )
}

function SoundToggle() {
  const soundOn = useUI((s) => s.soundOn)
  const setSoundOn = useUI((s) => s.setSoundOn)
  const theme = useUI((s) => s.theme)

  return (
    <button
      type="button"
      data-cursor-variant="magnetic"
      data-cursor=""
      aria-label={soundOn ? 'Mute ambient sound' : 'Play ambient sound'}
      onClick={() => setSoundOn(!soundOn)}
      className={cn(
        'pill pointer-events-auto !gap-2.5 !px-4 btn-blank transition-colors',
        theme === 'dark' ? 'border-white/15' : '',
      )}
    >
      <span className={cn('eq', soundOn && 'is-on')} aria-hidden>
        <i /><i /><i /><i /><i />
      </span>
      <span className="eyebrow" style={{ color: 'inherit', letterSpacing: '0.1em' }}>
        {soundOn ? 'on' : 'off'}
      </span>
    </button>
  )
}

function TalkCTA() {
  return (
    <button
      type="button"
      data-cursor-variant="magnetic"
      data-cursor=""
      onClick={() => scrollToSection('#contact')}
      className="pill pointer-events-auto btn-sweep"
    >
      Let&apos;s talk
    </button>
  )
}

function MenuButton() {
  const menuOpen = useUI((s) => s.menuOpen)
  const setMenuOpen = useUI((s) => s.setMenuOpen)

  return (
    <button
      type="button"
      data-cursor-variant="magnetic"
      data-cursor=""
      aria-expanded={menuOpen}
      onClick={() => setMenuOpen(!menuOpen)}
      className="pill pointer-events-auto btn-sweep"
    >
      <span className="roll">
        <span className="roll-stack">
          <span>{menuOpen ? 'Close' : 'Menu'}</span>
          <span aria-hidden>{menuOpen ? 'Close' : 'Menu'}</span>
        </span>
      </span>
      <span
        className="grid size-3.5 place-items-center text-[10px] leading-none transition-transform duration-500"
        style={{ transitionTimingFunction: 'var(--e-io)', transform: menuOpen ? 'rotate(45deg)' : 'none' }}
        aria-hidden
      >
        ✛
      </span>
      <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
    </button>
  )
}

export default function Header() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between p-5 md:p-7">
      <Monogram />
      <div className="flex items-center gap-2 md:gap-2.5">
        <SoundToggle />
        <TalkCTA />
        <MenuButton />
      </div>
    </header>
  )
}
