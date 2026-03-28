import { useLayoutEffect, useRef, useState } from 'react'
import { useSwipe } from '@/hooks/useSwipe'
import { cn } from '@/lib/utils'

interface SwipeCardProps {
  onSwipe: (direction: 'left' | 'right') => void
  children: React.ReactNode
  /** Next card in the stack — rises into view as the top card moves */
  behindChildren?: React.ReactNode
  /** Current card id — must change when the active item changes */
  topCardKey: string
  className?: string
}

interface SwipeCardDeckProps {
  onSwipe: (direction: 'left' | 'right') => void
  children: React.ReactNode
  behindChildren?: React.ReactNode
  animatePromote: boolean
}

function SwipeCardDeck({
  onSwipe,
  children,
  behindChildren,
  animatePromote,
}: SwipeCardDeckProps) {
  const {
    deltaX,
    throwing,
    transformTransition,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  } = useSwipe({ threshold: 80, onSwipe })

  const rotation = deltaX * 0.04
  const acceptOpacity = Math.min(Math.max(deltaX / 80, 0), 1)
  const declineOpacity = Math.min(Math.max(-deltaX / 80, 0), 1)

  const dragProgress = Math.min(Math.abs(deltaX) / 80, 1)
  const behindLift = 16 - dragProgress * 10
  const behindScale = 0.94 + dragProgress * 0.04

  return (
    <>
      {behindChildren ? (
        <div
          className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none bg-ds-surface-container-low shadow-md"
          style={{
            transform: `translateY(${behindLift}px) scale(${behindScale})`,
            opacity: 0.52 + dragProgress * 0.28,
            transition:
              throwing || Math.abs(deltaX) < 0.5
                ? 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease-out'
                : 'none',
          }}
        >
          {behindChildren}
        </div>
      ) : null}

      <div
        className="relative z-10 w-full touch-pan-y bg-ds-surface-container-lowest rounded-xl shadow-lg overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{
          transform: `translateX(${deltaX}px) rotate(${rotation}deg)`,
          transition: transformTransition,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div className={cn('h-full', animatePromote && 'animate-swipe-card-promote')}>
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
      </div>
    </>
  )
}

export function SwipeCard({
  onSwipe,
  children,
  behindChildren,
  topCardKey,
  className,
}: SwipeCardProps) {
  const [animatePromote, setAnimatePromote] = useState(false)
  const prevTopKeyRef = useRef<string | null>(null)

  useLayoutEffect(() => {
    const prev = prevTopKeyRef.current
    prevTopKeyRef.current = topCardKey
    // Ref holds prior key only in this effect (not during render). Promote runs when the key changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cannot derive "key changed" without previous value or ref access during render (react-hooks/refs)
    setAnimatePromote(prev !== null && prev !== topCardKey)
  }, [topCardKey])

  return (
    <div className={cn('relative w-full max-w-md', className)}>
      <SwipeCardDeck
        key={topCardKey}
        onSwipe={onSwipe}
        behindChildren={behindChildren}
        animatePromote={animatePromote}
      >
        {children}
      </SwipeCardDeck>
    </div>
  )
}
