import { useState, useRef, useCallback, useEffect } from 'react'

interface UseSwipeOptions {
  threshold?: number
  onSwipe?: (direction: 'left' | 'right') => void
}

export function useSwipe({ threshold = 100, onSwipe }: UseSwipeOptions) {
  const [deltaX, setDeltaX] = useState(0)
  const [throwing, setThrowing] = useState(false)
  /** Finger released below threshold — smooth snap to center (not a deck swap). */
  const [snapBack, setSnapBack] = useState(false)
  const startX = useRef(0)
  const dragging = useRef(false)
  const currentDeltaX = useRef(0)
  const throwTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (throwTimerRef.current !== null) clearTimeout(throwTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!snapBack) return
    const t = setTimeout(() => setSnapBack(false), 320)
    return () => clearTimeout(t)
  }, [snapBack])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    startX.current = e.clientX
    dragging.current = true
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const delta = e.clientX - startX.current
    currentDeltaX.current = delta
    setDeltaX(delta)
  }, [])

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    const delta = currentDeltaX.current

    if (Math.abs(delta) >= threshold) {
      const direction = delta > 0 ? 'right' : 'left'
      const throwTarget = delta > 0 ? window.innerWidth * 1.5 : -window.innerWidth * 1.5
      setThrowing(true)
      setDeltaX(throwTarget)
      throwTimerRef.current = setTimeout(() => {
        onSwipe?.(direction)
        setThrowing(false)
        // Keep deltaX at throw target until this instance unmounts (e.g. next item or overlay).
        // Resetting to 0 here caused the card to snap back while async handlers still ran.
      }, 300)
    } else {
      currentDeltaX.current = 0
      setSnapBack(true)
      setDeltaX(0)
    }
  }, [threshold, onSwipe])

  const transformTransition = throwing || snapBack ? 'transform 0.3s ease-out' : 'none'

  return {
    deltaX,
    throwing,
    transformTransition,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  }
}
