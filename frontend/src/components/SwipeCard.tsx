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
        {/* Accept overlay */}
        <div
          className="absolute inset-0 bg-ds-secondary/20 rounded-xl z-10 flex items-start justify-start p-6 pointer-events-none"
          style={{ opacity: acceptOpacity }}
        >
          <span className="text-ds-secondary font-headline font-extrabold text-3xl border-2 border-ds-secondary rounded-lg px-3 py-1 rotate-[-15deg]">
            KEEP
          </span>
        </div>

        {/* Decline overlay */}
        <div
          className="absolute inset-0 bg-ds-tertiary/20 rounded-xl z-10 flex items-start justify-end p-6 pointer-events-none"
          style={{ opacity: declineOpacity }}
        >
          <span className="text-ds-tertiary font-headline font-extrabold text-3xl border-2 border-ds-tertiary rounded-lg px-3 py-1 rotate-[15deg]">
            SKIP
          </span>
        </div>

        {children}
      </div>
    </div>
  )
}
