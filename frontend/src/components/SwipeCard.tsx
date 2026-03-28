import { forwardRef, useImperativeHandle, useRef } from 'react'
import { useSwipe } from '@/hooks/useSwipe'
import { cn } from '@/lib/utils'

export interface SwipeCardHandle {
  triggerSwipe: (direction: 'left' | 'right') => void
}

interface SwipeCardProps {
  onSwipe: (direction: 'left' | 'right') => void
  children: React.ReactNode
  /** Up to 2 cards rendered behind the top card as a stack */
  behindSlots?: React.ReactNode[]
  /** Current card id — must change when the active item changes */
  topCardKey: string
  className?: string
}

interface SwipeCardDeckProps {
  onSwipe: (direction: 'left' | 'right') => void
  children: React.ReactNode
  behindSlots?: React.ReactNode[]
}

const STACK_SCALE_STEP = 0.05
const STACK_OPACITY_STEP = 0.15

const SwipeCardDeck = forwardRef<SwipeCardHandle, SwipeCardDeckProps>(
  function SwipeCardDeck({ onSwipe, children, behindSlots }, ref) {
    const {
      deltaX,
      throwing,
      transformTransition,
      triggerSwipe,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    } = useSwipe({ threshold: 80, onSwipe })

    useImperativeHandle(ref, () => ({ triggerSwipe }), [triggerSwipe])

    const rotation = deltaX * 0.04
    const acceptOpacity = Math.min(Math.max(deltaX / 80, 0), 1)
    const declineOpacity = Math.min(Math.max(-deltaX / 80, 0), 1)
    const dragProgress = Math.min(Math.abs(deltaX) / 80, 1)

    return (
      <>
        {behindSlots?.map((slot, i) => {
          const depth = behindSlots.length - i
          const scale = 1 - depth * STACK_SCALE_STEP + dragProgress * STACK_SCALE_STEP
          const opacity = 1 - depth * STACK_OPACITY_STEP + dragProgress * STACK_OPACITY_STEP

          return (
            <div
              key={i}
              className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
              style={{
                zIndex: -depth,
                transform: `scale(${scale})`,
                opacity,
                transition:
                  throwing || Math.abs(deltaX) < 0.5
                    ? 'transform 0.3s ease-out, opacity 0.3s ease-out'
                    : 'none',
              }}
            >
              {slot}
            </div>
          )
        })}

        <div
          className="relative z-10 w-full touch-pan-y bg-ds-surface-container-lowest rounded-xl shadow-lg overflow-hidden cursor-grab active:cursor-grabbing select-none"
          style={{
            transform: `translateX(${deltaX}px) rotate(${rotation}deg)`,
            opacity: throwing ? 0 : 1,
            transition: transformTransition,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <div
            className="absolute inset-0 bg-ds-secondary/20 rounded-xl z-10 pointer-events-none"
            style={{ opacity: acceptOpacity }}
          />

          <div
            className="absolute inset-0 bg-ds-tertiary/20 rounded-xl z-10 pointer-events-none"
            style={{ opacity: declineOpacity }}
          />

          {children}
        </div>
      </>
    )
  },
)

export const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(
  function SwipeCard({ onSwipe, children, behindSlots, topCardKey, className }, ref) {
    const deckRef = useRef<SwipeCardHandle>(null)

    useImperativeHandle(ref, () => ({ triggerSwipe: (d) => deckRef.current?.triggerSwipe(d) }), [])

    return (
      <div className={cn('relative w-full max-w-md', className)}>
        <SwipeCardDeck ref={deckRef} key={topCardKey} onSwipe={onSwipe} behindSlots={behindSlots}>
          {children}
        </SwipeCardDeck>
      </div>
    )
  },
)
