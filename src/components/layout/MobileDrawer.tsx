'use client'

import { useEffect, useRef } from 'react'
import { useDialogFocus } from '@/lib/useDialogFocus'

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  label?: string
}

export function MobileDrawer({ isOpen, onClose, children, label = 'Navigation menu' }: MobileDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogFocus(panelRef, isOpen)

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <>
      {/* Backdrop — z-[60] sits above the floating WhatsApp button (z-50) */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-[60] bg-forest/60 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      {/* Drawer panel — inert while closed so it leaves the tab order and a11y tree */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        inert={!isOpen}
        className={`fixed inset-y-0 left-0 z-[61] w-80 max-w-[85vw] overflow-y-auto bg-cream flex flex-col p-6 shadow-xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {children}
      </div>
    </>
  )
}
