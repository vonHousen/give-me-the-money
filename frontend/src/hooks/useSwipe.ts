import { useState, useRef, useCallback, useEffect } from 'react'

interface UseSwipeOptions {
  threshold?: number
  onSwipe?: (direction: 'left' | 'right') => void
}

export function useSwipe({ threshold = 100, onSwipe }: UseSwipeOptions) {
  const [deltaX, setDeltaX] = useState(0)
  const [throwing, setThrowing] = useState(false)
  const startX = useRef(0)
  const dragging = useRef(false)
  const currentDeltaX = useRef(0)
  const throwTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (throwTimerRef.current !== null) clearTimeout(throwTimerRef.current)
    }
  }, [])

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
        currentDeltaX.current = 0
        setDeltaX(0)
      }, 300)
    } else {
      currentDeltaX.current = 0
      setDeltaX(0)
    }
  }, [threshold, onSwipe])

  return { deltaX, throwing, onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp }
}
