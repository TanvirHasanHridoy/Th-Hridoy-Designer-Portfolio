import { useUI } from './store/store'
import { useSmoothScroll } from './hooks/useSmoothScroll'
import { useAmbientAudio } from './hooks/useAmbientAudio'
import { useHoverSounds } from './hooks/useHoverSounds'
import { useThemeSync } from './hooks/useThemeSync'
import { useSectionTracking } from './hooks/useSectionTracking'
import CustomCursor from './components/cursor/CustomCursor'
import Grain from './components/ui/Grain'
import Header from './components/layout/Header'
import MenuOverlay from './components/layout/MenuOverlay'
import PortalOverlay from './components/layout/PortalOverlay'
import Preloader from './components/layout/Preloader'
import { SceneCanvas } from './canvas/SceneCanvas'
import Hero from './sections/Hero'
import About from './sections/About'
import FeaturedWork from './sections/FeaturedWork'
import Lab from './sections/Lab'
import Footer from './sections/Footer'

/**
 * Root composition.
 *
 * z-index map:
 *   0    persistent WebGL canvas (fixed, pointer-events: none)
 *   10   scrollable DOM sections
 *   30   film grain
 *   40   floating header
 *   50   menu overlay card
 *   65   about & labs portal
 *   70   preloader
 *   80   custom cursor
 *   95   keyboard skip link
 */
export default function App() {
  const ready = useUI((s) => s.ready)
  const soundOn = useUI((s) => s.soundOn)
  const portalOpen = useUI((s) => s.portalOpen)

  useSmoothScroll(!ready || portalOpen)
  useAmbientAudio(soundOn)
  useHoverSounds()
  useThemeSync()
  useSectionTracking()

  return (
    <>
      <a className="skip-link" href="#work">
        Skip to selected works
      </a>
      <SceneCanvas />
      <Grain />
      <CustomCursor />
      <Header />
      <MenuOverlay />
      <PortalOverlay />

      <main className="relative z-10">
        {/* DOM sections — anchors: #hero, #about, #work, #lab, #contact */}
        <Hero />
        <About />
        <FeaturedWork />
        <Lab />
        <Footer />
      </main>

      <Preloader />
    </>
  )
}
