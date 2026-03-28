import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { X, Check } from 'lucide-react'
import { PageLayout } from '@/components/PageLayout'
import { SwipeCard, type SwipeCardHandle } from '@/components/SwipeCard'
import { QuantityPickOverlay } from '@/components/QuantityPickOverlay'
import { CurrencyDisplay } from '@/components/CurrencyDisplay'
import {
  getSettlementForSwipe,
  markSwipeComplete,
  recordItemClaim,
} from '@/lib/settlementApi'
import { normalizeSettlementItem, type SettlementItemWire } from '@/lib/settlementTypes'
import {
  getParticipantIdFromSession,
  isSettlementOwnerSession,
} from '@/lib/settlementSession'
import { roundMoney } from '@/lib/utils'

function ItemCard({ item }: { item: SettlementItemWire }) {
  const qty = item.quantity
  const unit = roundMoney(item.unitPrice)

  return (
    <div className="aspect-[3/4] flex flex-col">
      <div className="flex-grow bg-ds-surface-container-high relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-ds-on-surface-variant opacity-20 font-headline text-8xl font-extrabold select-none">
          🍽
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-transparent" />

        <div className="absolute top-5 left-5 flex flex-wrap gap-2">
          <span className="px-3 py-1.5 bg-ds-primary/90 backdrop-blur-md rounded-full shadow-sm text-[9px] font-bold uppercase tracking-[0.15em] text-ds-on-primary">
            ×{qty} on bill
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
            {item.name}
          </h2>
          <p className="font-body text-xs text-ds-on-surface-variant/90 mt-1.5 tabular-nums">
            Unit ${unit.toFixed(2)}
            {qty > 1 ? ' · line total below' : null}
          </p>
        </div>
        <CurrencyDisplay amount={item.price} className="justify-start scale-75 origin-left" />
      </div>
    </div>
  )
}

export default function Swipe() {
  const { settlementId } = useParams<{ settlementId: string }>()
  const navigate = useNavigate()
  const [items, setItems] = useState<SettlementItemWire[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pickStep, setPickStep] = useState<1 | 2>(1)
  const [claimSubmitting, setClaimSubmitting] = useState(false)
  /** Bumps when the last-item claim fails so the deck remounts with a centered card. */
  const [swipeEpoch, setSwipeEpoch] = useState(0)
  const [finishing, setFinishing] = useState(false)
  const swipeRef = useRef<SwipeCardHandle>(null)

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
          setItems(res.items.map((i) => normalizeSettlementItem(i)))
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

  useEffect(() => {
    setPickStep(1)
  }, [index])

  const current = items[index]
  const total = items.length

  const submitClaim = useCallback(
    async (quantityClaimed: number) => {
      if (!settlementId || !participantId || !current) {
        return
      }
      const claimedItem = current
      const atLast = index === items.length - 1

      setActionError(null)
      setClaimSubmitting(true)
      if (atLast) {
        setFinishing(true)
      } else {
        setIndex((i) => i + 1)
      }

      try {
        await recordItemClaim(settlementId, participantId, claimedItem.id, quantityClaimed)
        setPickStep(1)
        if (atLast) {
          await markSwipeComplete(settlementId, participantId)
          if (isSettlementOwnerSession(settlementId)) {
            navigate(`/settlement/${settlementId}/status`)
          } else {
            navigate('/')
          }
        }
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Something went wrong.')
        if (atLast) {
          setSwipeEpoch((n) => n + 1)
        } else {
          setIndex((i) => Math.max(0, i - 1))
        }
      } finally {
        setClaimSubmitting(false)
        setFinishing(false)
      }
    },
    [settlementId, participantId, current, index, items.length, navigate],
  )

  const handleCardSwipe = (direction: 'left' | 'right') => {
    if (claimSubmitting || !current) {
      return
    }
    const lineQty = current.quantity
    if (direction === 'left') {
      void submitClaim(0)
      return
    }
    if (lineQty <= 1) {
      void submitClaim(1)
    } else {
      setPickStep(2)
    }
  }

  if (!settlementId) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-body text-ds-on-surface-variant">Loading…</p>
      </div>
    )
  }

  if (loadError || !participantId) {
    return (
      <div className="min-h-screen">
        <PageLayout className="space-y-4">
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

  const lineQty = current.quantity
  const behindSlots = items
    .slice(index + 1, index + 3)
    .map((item) => <ItemCard key={item.id} item={item} />)

  return (
    <div className="min-h-screen">
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

        {finishing ? (
          <div className="w-full flex flex-col items-center justify-center gap-3 py-20 min-h-[min(60vh,420px)]">
            <p className="font-body text-ds-on-surface-variant">Finishing up…</p>
          </div>
        ) : pickStep === 1 ? (
          <SwipeCard
            ref={swipeRef}
            topCardKey={`${current.id}-${swipeEpoch}`}
            onSwipe={handleCardSwipe}
            className="w-full"
            behindSlots={behindSlots.length > 0 ? behindSlots : undefined}
          >
            <ItemCard item={current} />
          </SwipeCard>
        ) : (
          <QuantityPickOverlay
            maxQty={lineQty}
            itemName={current.name}
            isSubmitting={claimSubmitting}
            onCancel={() => setPickStep(1)}
            onConfirm={(q) => void submitClaim(q)}
          />
        )}

        {actionError ? (
          <p className="font-body text-sm text-red-600 dark:text-red-400 w-full" role="alert">
            {actionError}
          </p>
        ) : null}

        {!finishing && pickStep === 1 ? (
          <>
            <div className="flex gap-8 items-center justify-center w-full pt-2">
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  aria-label="Decline"
                  disabled={claimSubmitting}
                  onClick={() => swipeRef.current?.triggerSwipe('left')}
                  className="w-16 h-16 rounded-full bg-ds-surface-container-lowest shadow-md flex items-center justify-center hover:bg-ds-tertiary/10 transition-all active:scale-90 duration-150 disabled:opacity-50"
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
                  disabled={claimSubmitting}
                  onClick={() =>
                    lineQty > 1
                      ? handleCardSwipe('right')
                      : swipeRef.current?.triggerSwipe('right')
                  }
                  className="w-16 h-16 rounded-full bg-ds-primary shadow-lg shadow-ds-primary/20 flex items-center justify-center hover:opacity-90 transition-all active:scale-90 duration-150 disabled:opacity-50"
                >
                  <Check className="w-7 h-7 text-ds-on-primary" />
                </button>
                <span className="font-label text-[9px] font-bold uppercase tracking-[0.2em] text-ds-primary">
                  Mine
                </span>
              </div>
            </div>
            <p className="font-body text-xs text-ds-on-surface-variant/50 text-center w-full">
              Swipe right if this is yours, left to pass
            </p>
          </>
        ) : null}
      </PageLayout>
    </div>
  )
}
