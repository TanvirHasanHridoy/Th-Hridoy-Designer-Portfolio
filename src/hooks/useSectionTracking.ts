import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { scrollStore } from '../store/scrollStore'
import { useUI } from '../store/store'

gsap.registerPlugin(ScrollTrigger)

/**
 * Ordered scroll anchors — index matches `scrollStore.activeSection` and the
 * camera choreography in `CameraRig`.
 */
export const SECTION_SELECTORS = ['#hero', '#vision', '#work', '#lab', '#contact'] as const

/**
 * Watches which section owns the viewport middle and writes the index into
 * the per-frame store so the WebGL choreography follows along.
 *
 * Every boundary crossing re-evaluates ALL triggers (deepmost active wins):
 * a pure "last toggled" model goes stale when the browser restores a
 * mid-page scroll position on reload and toggles happen out of order.
 */
export function useSectionTracking(): void {
  useEffect(() => {
    const triggers: ScrollTrigger[] = []

    /** Deepest active trigger wins; sections' ranges overlap slightly. */
    const recomputeOwner = () => {
      for (let i = triggers.length - 1; i >= 0; i -= 1) {
        if (triggers[i].isActive) {
          scrollStore.activeSection = i
          return
        }
      }
    }

    SECTION_SELECTORS.forEach((selector, index) => {
      const el = document.querySelector(selector)
      if (!el) return // section not rendered yet (build phase) — skip quietly
      triggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: 'top 60%',
          end: 'bottom 40%',
          onToggle: (self) => {
            /* the physics pit mounts only while the Lab arena owns the viewport */
            if (index === 3) {
              useUI.getState().setPitActive(self.isActive ?? false)
            }
            /* heading toward the lab: warm the rapier chunk while reading work */
            if (index === 2) {
              void import('../canvas/PhysicsPit')
            }
            /* work-carousel turntable visibility follows the #work section */
            if (index === 2) {
              useUI.getState().setCarouselActive(self.isActive ?? false)
            }
            recomputeOwner()
          },
        }),
      )
    })

    /* Sync initial state: triggers whose range already contains the restored
       scroll position never fire onToggle after creation. */
    const syncInitial = () => {
      recomputeOwner()
      triggers.forEach((trigger, index) => {
        if (index === 3) useUI.getState().setPitActive(trigger.isActive)
        if (index === 2) {
          useUI.getState().setCarouselActive(trigger.isActive)
          if (trigger.isActive) void import('../canvas/PhysicsPit')
        }
      })
    }
    syncInitial()

    /* re-measure once webfonts have swapped in, then re-sync */
    document.fonts?.ready.then(() => {
      ScrollTrigger.refresh()
      syncInitial()
    })

    return () => triggers.forEach((t) => t.kill())
  }, [])
}
