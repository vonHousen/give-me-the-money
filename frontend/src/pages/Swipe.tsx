import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { X, Check } from 'lucide-react'
import { TopAppBar } from '@/components/TopAppBar'
import { PageLayout } from '@/components/PageLayout'
import { SwipeCard } from '@/components/SwipeCard'
import { CurrencyDisplay } from '@/components/CurrencyDisplay'
import {
  getSettlementForSwipe,
  markSwipeComplete,
  recordItemClaim,
} from '@/lib/settlementApi'
import type { SettlementItemWire } from '@/lib/settlementTypes'
import {
  getParticipantIdFromSession,
  isSettlementOwnerSession,
} from '@/lib/settlementSession'

const TAGS = ['Popular', 'Dish', 'Extra']

export default function Swipe() {
  const { settlementId } = useParams<{ settlementId: string }>()
  const navigate = useNavigate()
  const [items, setItems] = useState<SettlementItemWire[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [actionError, setActionError] = useState<string | null>(null)

  const participantId = settlementId ? getParticipantIdFromSession(settlementId) : null

  useEffect(() => {
    if (!settlementId) {
      return
    }
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const res = await getSettlementForSwipe(settlementId)
        if (cancelled) {
          return
        }
        if (!res || res.items.length === 0) {
          setLoadError('This settlement was not found or has no items.')
          setItems([])
        } else {
          setItems(res.items)
          setLoadError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Could not load settlement.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [settlementId])

  const current = items[index]
  const total = items.length

  const tagForIndex = TAGS[index % TAGS.length]

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!settlementId || !participantId || !current) {
      return
    }
    setActionError(null)
    try {
      await recordItemClaim(settlementId, participantId, current.id, direction === 'right')
      if (index + 1 >= items.length) {
        await markSwipeComplete(settlementId, participantId)
        if (isSettlementOwnerSession(settlementId)) {
          navigate(`/settlement/${settlementId}/status`)
        } else {
          navigate('/')
        }
      } else {
        setIndex((i) => i + 1)
      }
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Something went wrong.')
    }
  }

  if (!settlementId) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ds-surface flex items-center justify-center">
        <p className="font-body text-ds-on-surface-variant">Loading…</p>
      </div>
    )
  }

  if (loadError || !participantId) {
    return (
      <div className="min-h-screen bg-ds-surface">
        <TopAppBar />
        <PageLayout className="space-y-4 pt-8">
          <p className="font-body text-ds-on-surface">
            {loadError ?? 'Join this settlement first with your name.'}
          </p>
          <Link
            to={`/split/${settlementId}`}
            className="inline-block font-label font-semibold text-ds-primary underline"
          >
            Go to join screen
          </Link>
        </PageLayout>
      </div>
    )
  }

  if (!current || total === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-ds-surface">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-ds-primary rounded-full blur-[120px] opacity-10" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-ds-secondary-container rounded-full blur-[120px] opacity-20" />
      </div>

      <TopAppBar />

      <PageLayout className="flex flex-col items-center gap-6">
        <div className="w-full flex items-center justify-between">
          <p className="font-label text-ds-on-surface-variant text-xs uppercase tracking-widest font-bold">
            What did you order?
          </p>
          <p className="font-label text-ds-on-surface-variant text-sm">
            <span className="text-ds-primary font-bold">{index + 1}</span>
            <span className="opacity-40"> / {total}</span>
          </p>
        </div>

        <div className="w-full h-0.5 bg-ds-surface-container-high rounded-full -mt-2">
          <div
            className="h-full bg-ds-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>

        <SwipeCard key={current.id} onSwipe={handleSwipe} className="w-full">
          <div className="aspect-[3/4] flex flex-col">
            <div className="flex-grow bg-ds-surface-container-high relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-ds-on-surface-variant opacity-20 font-headline text-8xl font-extrabold select-none">
                🍽
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-transparent" />

              <div className="absolute top-5 left-5 px-3 py-1.5 bg-ds-surface-container-lowest/90 backdrop-blur-md rounded-full shadow-sm">
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ds-primary">
                  {tagForIndex}
                </span>
              </div>

              <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none opacity-25">
                <span className="font-label text-[9px] font-bold tracking-[0.3em] uppercase text-white">
                  ← swipe to decide →
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4 bg-ds-surface-container-lowest dark:bg-ds-surface-container">
              <div>
                <h2 className="font-headline font-extrabold text-2xl text-ds-on-surface tracking-tight leading-tight">
                  {current.name}
                </h2>
                <p className="font-body text-sm text-ds-on-surface-variant mt-1.5 leading-relaxed">
                  Swipe right if this is yours, left if not.
                </p>
              </div>
              <CurrencyDisplay amount={current.price} className="justify-start scale-75 origin-left" />
            </div>
          </div>
        </SwipeCard>

        {actionError ? (
          <p className="font-body text-sm text-red-600 dark:text-red-400 w-full" role="alert">
            {actionError}
          </p>
        ) : null}

        <div className="flex gap-8 items-center justify-center w-full pt-2">
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              aria-label="Decline"
              onClick={() => void handleSwipe('left')}
              className="w-16 h-16 rounded-full bg-ds-surface-container-lowest shadow-md flex items-center justify-center hover:bg-ds-tertiary/10 transition-all active:scale-90 duration-150"
            >
              <X className="w-7 h-7 text-ds-tertiary" />
            </button>
            <span className="font-label text-[9px] font-bold uppercase tracking-[0.2em] text-ds-on-surface-variant opacity-40">
              Pass
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              aria-label="Accept"
              onClick={() => void handleSwipe('right')}
              className="w-16 h-16 rounded-full bg-ds-primary shadow-lg shadow-ds-primary/20 flex items-center justify-center hover:opacity-90 transition-all active:scale-90 duration-150"
            >
              <Check className="w-7 h-7 text-ds-on-primary" />
            </button>
            <span className="font-label text-[9px] font-bold uppercase tracking-[0.2em] text-ds-primary">
              Mine
            </span>
          </div>
        </div>
      </PageLayout>
    </div>
  )
}
