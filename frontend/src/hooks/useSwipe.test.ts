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

  it('resets deltaX to 0 after throw animation completes', () => {
    const { result } = renderHook(() => useSwipe({}))

    act(() => result.current.onPointerDown(mockPointerDown(0)))
    act(() => result.current.onPointerMove({ clientX: 120 } as React.PointerEvent))
    act(() => { result.current.onPointerUp(); vi.runAllTimers() })

    expect(result.current.deltaX).toBe(0)
  })
})
