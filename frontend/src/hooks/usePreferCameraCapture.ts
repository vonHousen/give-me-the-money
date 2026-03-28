import { useEffect, useState } from 'react'

/**
 * Touch-first devices: prefer the native camera capture input.
 * Fine pointer (desktop): users pick files via "Upload" only.
 */
export function usePreferCameraCapture(): boolean {
  const [prefer, setPrefer] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(pointer: coarse)')
    const sync = () => setPrefer(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return prefer
}
