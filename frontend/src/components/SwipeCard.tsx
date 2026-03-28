import { useSwipe } from '@/hooks/useSwipe'
import { cn } from '@/lib/utils'

interface SwipeCardProps {
  onSwipe: (direction: 'left' | 'right') => void
  children: React.ReactNode
  className?: string
}

export function SwipeCard({ onSwipe, children, className }: SwipeCardProps) {
  const { deltaX, throwing, onPointerDown, onPointerMove, onPointerUp, onPointerCancel } =
    useSwipe({ threshold: 80, onSwipe })

  const rotation = deltaX * 0.04
  const acceptOpacity = Math.min(Math.max(deltaX / 80, 0), 1)
  const declineOpacity = Math.min(Math.max(-deltaX / 80, 0), 1)

  return (
    <div className={cn('relative w-full max-w-md', className)}>
      {/* Depth card behind */}
      <div className="absolute inset-0 bg-ds-surface-container-low rounded-xl scale-95 translate-y-4 opacity-50" />

      {/* Active card */}
      <div
        className="relative w-full touch-pan-y bg-ds-surface-container-lowest rounded-xl shadow-lg overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{
          transform: `translateX(${deltaX}px) rotate(${rotation}deg)`,
          transition: (throwing || deltaX === 0) ? 'transform 0.3s ease-out' : 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        {/* Accept tint */}
        <div
          className="absolute inset-0 bg-ds-secondary/20 rounded-xl z-10 pointer-events-none"
          style={{ opacity: acceptOpacity }}
        />

        {/* Decline tint */}
        <div
          className="absolute inset-0 bg-ds-tertiary/20 rounded-xl z-10 pointer-events-none"
          style={{ opacity: declineOpacity }}
        />

        {children}
      </div>
    </div>
  )
}
