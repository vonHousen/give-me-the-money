import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useSwipe } from './useSwipe'

const mockPointerDown = (clientX: number): React.PointerEvent =>
  ({ clientX, currentTarget: { setPointerCapture: vi.fn() } } as unknown as React.PointerEvent)

describe('useSwipe', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.defineProperty(window, 'innerWidth', { value: 400, writable: true })
  })
  afterEach(() => vi.useRealTimers())

  it('starts with deltaX = 0', () => {
    const { result } = renderHook(() => useSwipe({}))
    expect(result.current.deltaX).toBe(0)
  })

  it('calls onSwipe("right") when released past positive threshold', () => {
    const onSwipe = vi.fn()
    const { result } = renderHook(() => useSwipe({ threshold: 100, onSwipe }))

    act(() => result.current.onPointerDown(mockPointerDown(0)))
    act(() => result.current.onPointerMove({ clientX: 120 } as React.PointerEvent))
    act(() => { result.current.onPointerUp(); vi.runAllTimers() })

    expect(onSwipe).toHaveBeenCalledWith('right')
  })

  it('calls onSwipe("left") when released past negative threshold', () => {
    const onSwipe = vi.fn()
    const { result } = renderHook(() => useSwipe({ threshold: 100, onSwipe }))

    act(() => result.current.onPointerDown(mockPointerDown(0)))
    act(() => result.current.onPointerMove({ clientX: -120 } as React.PointerEvent))
    act(() => { result.current.onPointerUp(); vi.runAllTimers() })

    expect(onSwipe).toHaveBeenCalledWith('left')
  })

  it('does NOT call onSwipe when released below threshold', () => {
    const onSwipe = vi.fn()
    const { result } = renderHook(() => useSwipe({ threshold: 100, onSwipe }))

    act(() => result.current.onPointerDown(mockPointerDown(0)))
    act(() => result.current.onPointerMove({ clientX: 50 } as React.PointerEvent))
    act(() => { result.current.onPointerUp(); vi.runAllTimers() })

    expect(onSwipe).not.toHaveBeenCalled()
  })

  it('keeps deltaX off-screen after throw so the card does not snap back before unmount', () => {
    const { result } = renderHook(() => useSwipe({}))

    act(() => result.current.onPointerDown(mockPointerDown(0)))
    act(() => result.current.onPointerMove({ clientX: 120 } as React.PointerEvent))
    act(() => { result.current.onPointerUp(); vi.runAllTimers() })

    expect(result.current.deltaX).toBe(400 * 1.5)
  })

  it('starts fresh at deltaX = 0 on a new hook instance (deck remount)', () => {
    const { result, unmount } = renderHook(() => useSwipe({ threshold: 100 }))

    act(() => result.current.onPointerDown(mockPointerDown(0)))
    act(() => result.current.onPointerMove({ clientX: 120 } as React.PointerEvent))
    act(() => { result.current.onPointerUp(); vi.runAllTimers() })

    expect(result.current.deltaX).toBe(400 * 1.5)

    unmount()

    const { result: result2 } = renderHook(() => useSwipe({ threshold: 100 }))
    expect(result2.current.deltaX).toBe(0)
  })

  describe('triggerSwipe', () => {
    it('programmatically throws right and calls onSwipe', () => {
      const onSwipe = vi.fn()
      const { result } = renderHook(() => useSwipe({ threshold: 100, onSwipe }))

      act(() => result.current.triggerSwipe('right'))

      expect(result.current.throwing).toBe(true)
      expect(result.current.deltaX).toBe(400 * 1.5)

      act(() => vi.runAllTimers())

      expect(onSwipe).toHaveBeenCalledWith('right')
    })

    it('programmatically throws left and calls onSwipe', () => {
      const onSwipe = vi.fn()
      const { result } = renderHook(() => useSwipe({ threshold: 100, onSwipe }))

      act(() => result.current.triggerSwipe('left'))

      expect(result.current.throwing).toBe(true)
      expect(result.current.deltaX).toBe(-400 * 1.5)

      act(() => vi.runAllTimers())

      expect(onSwipe).toHaveBeenCalledWith('left')
    })

    it('ignores triggerSwipe while already throwing', () => {
      const onSwipe = vi.fn()
      const { result } = renderHook(() => useSwipe({ threshold: 100, onSwipe }))

      act(() => result.current.triggerSwipe('right'))
      act(() => result.current.triggerSwipe('left'))

      act(() => vi.runAllTimers())

      expect(onSwipe).toHaveBeenCalledTimes(1)
      expect(onSwipe).toHaveBeenCalledWith('right')
    })
  })
})
