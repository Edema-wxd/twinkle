'use client'

import { useEffect, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Minimal dialog focus management: on open, remember the trigger, focus the
 * first control and keep Tab inside the panel; on close, return focus.
 */
export function useDialogFocus(ref: RefObject<HTMLElement | null>, open: boolean) {
  useEffect(() => {
    if (!open) return
    const panel = ref.current
    if (!panel) return
    const previous = document.activeElement as HTMLElement | null

    const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
    // Wait a frame so `inert` has been removed before focusing
    const raf = requestAnimationFrame(() => focusables()[0]?.focus())

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    panel.addEventListener('keydown', onKeyDown)

    return () => {
      cancelAnimationFrame(raf)
      panel.removeEventListener('keydown', onKeyDown)
      previous?.focus?.()
    }
  }, [ref, open])
}
