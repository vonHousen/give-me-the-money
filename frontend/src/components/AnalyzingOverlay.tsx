import { useEffect, useState, useRef } from 'react'

const PHRASES = [
  'Scanning your receipt',
  'Reading line items',
  'Identifying prices',
  'Detecting currency',
  'Classifying items',
  'Consulting the price oracle',
  'Cross-referencing totals',
  'Matching products',
  'Verifying tax & tips',
  'Resolving item quantities',
  'Crunching the numbers',
  'Calculating totals',
  'Balancing the ledger',
  'Preparing your split',
  'Almost there',
]

const PHRASE_INTERVAL_MS = 2500

const INNER_DOTS = 6
const OUTER_DOTS = 8

interface AnalyzingOverlayProps {
  visible: boolean
}

export function AnalyzingOverlay({ visible }: AnalyzingOverlayProps) {
  const [rendered, setRendered] = useState(visible)
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [phraseFading, setPhraseFading] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  if (visible && !rendered) {
    setRendered(true)
    setPhraseIndex(0)
  }

  useEffect(() => {
    const el = overlayRef.current
    if (!el) return
    if (visible) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.opacity = '1'
        })
      })
    } else {
      el.style.opacity = '0'
    }
  }, [visible])

  useEffect(() => {
    if (!visible) return

    intervalRef.current = setInterval(() => {
      setPhraseFading(true)
      setTimeout(() => {
        setPhraseIndex((i) => (i + 1) % PHRASES.length)
        setPhraseFading(false)
      }, 300)
    }, PHRASE_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [visible])

  const handleTransitionEnd = () => {
    if (!visible) setRendered(false)
  }

  if (!rendered) return null

  return (
    <div
      ref={overlayRef}
      role="status"
      aria-live="polite"
      onTransitionEnd={handleTransitionEnd}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        opacity: 0,
        transition: 'opacity 400ms ease-in-out',
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Radial glow behind orb */}
      <div
        className="absolute rounded-full"
        style={{
          width: 240,
          height: 240,
          background: `radial-gradient(circle, color-mix(in oklch, var(--ds-primary) 25%, transparent), transparent 70%)`,
          animation: 'analyzing-bg-glow 3s ease-in-out infinite',
        }}
      />

      {/* Orbit container */}
      <div className="relative" style={{ width: 160, height: 160 }}>
        {/* Central orb */}
        <div
          className="absolute rounded-full"
          style={{
            width: 20,
            height: 20,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--ds-primary)',
            animation: 'analyzing-pulse 2.5s ease-in-out infinite',
          }}
        />

        {/* Inner orbit dots */}
        {Array.from({ length: INNER_DOTS }).map((_, i) => (
          <div
            key={`inner-${i}`}
            className="absolute"
            style={{
              width: 8,
              height: 8,
              top: 'calc(50% - 4px)',
              left: 'calc(50% - 4px)',
              borderRadius: '50%',
              background: 'var(--ds-primary)',
              opacity: 0.7 + (i % 3) * 0.1,
              ['--orbit-start' as string]: `${(360 / INNER_DOTS) * i}deg`,
              animation: `analyzing-orbit ${3.5 + i * 0.2}s linear infinite`,
            }}
          />
        ))}

        {/* Outer orbit dots (smaller, more transparent) */}
        {Array.from({ length: OUTER_DOTS }).map((_, i) => (
          <div
            key={`outer-${i}`}
            className="absolute"
            style={{
              width: 4,
              height: 4,
              top: 'calc(50% - 2px)',
              left: 'calc(50% - 2px)',
              borderRadius: '50%',
              background: 'var(--ds-primary)',
              opacity: 0.3 + (i % 4) * 0.08,
              ['--orbit-start' as string]: `${(360 / OUTER_DOTS) * i}deg`,
              animation: `analyzing-orbit-outer ${5 + i * 0.3}s linear infinite reverse`,
            }}
          />
        ))}
      </div>

      {/* Rotating phrase */}
      <div className="relative mt-10 flex flex-col items-center gap-1">
        <p
          className="font-headline text-base font-semibold tracking-wide"
          style={{
            color: 'var(--ds-primary)',
            opacity: phraseFading ? 0 : 1,
            transform: phraseFading ? 'translateY(4px)' : 'translateY(0)',
            transition: 'opacity 300ms ease, transform 300ms ease',
          }}
        >
          {PHRASES[phraseIndex]}
        </p>
        <p
          className="font-body text-xs"
          style={{
            color: 'var(--ds-on-surface-variant)',
            opacity: 0.7,
          }}
        >
          Our AI agents are on it
        </p>
      </div>
    </div>
  )
}
