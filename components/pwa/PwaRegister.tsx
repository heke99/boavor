'use client'

import { useEffect } from 'react'

/** Registers the service worker (production only; dev builds reload too often). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed', error)
    })
  }, [])

  return null
}
