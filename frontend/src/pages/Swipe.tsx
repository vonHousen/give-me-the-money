import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Check } from 'lucide-react'
import { TopAppBar } from '@/components/TopAppBar'
import { PageLayout } from '@/components/PageLayout'
import { SwipeCard } from '@/components/SwipeCard'
import { CurrencyDisplay } from '@/components/CurrencyDisplay'

const STUB_DISHES = [
  { id: 1, name: 'Garden Harvest Bowl', description: 'Roasted quinoa, tahini-maple drizzle, seasonal root vegetables.', price: 18.5, tag: "Chef's Choice" },
  { id: 2, name: 'Truffle Fries', description: 'Hand-cut fries with black truffle oil and parmesan.', price: 9.0, tag: 'Popular' },
  { id: 3, name: 'Lemon Tart', description: 'Classic French pastry with lemon curd and torched meringue.', price: 8.0, tag: 'Dessert' },
]

export default function Swipe() {
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)

  const current = STUB_DISHES[index]

  const handleSwipe = (_direction: 'left' | 'right') => {
    if (index + 1 >= STUB_DISHES.length) {
      navigate('/summary')
    } else {
      setIndex((i) => i + 1)
    }
  }

  if (!current) return null

  return (
    <div className="min-h-screen bg-ds-surface dark:bg-ds-surface">
      {/* Ambient background glows for depth */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-ds-primary rounded-full blur-[120px] opacity-10" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-ds-secondary-container rounded-full blur-[120px] opacity-20" />
      </div>

      <TopAppBar />

      <PageLayout className="flex flex-col items-center gap-6">
        {/* Progress indicator */}
        <div className="w-full flex items-center justify-between">
          <p className="font-label text-ds-on-surface-variant text-xs uppercase tracking-widest font-bold">
            What did you order?
          </p>
          <p className="font-label text-ds-on-surface-variant text-sm">
            <span className="text-ds-primary font-bold">{index + 1}</span>
            <span className="opacity-40"> / {STUB_DISHES.length}</span>
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full h-0.5 bg-ds-surface-container-high rounded-full -mt-2">
          <div
            className="h-full bg-ds-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((index + 1) / STUB_DISHES.length) * 100}%` }}
          />
        </div>

        <SwipeCard key={current.id} onSwipe={handleSwipe} className="w-full">
          {/* Card body — aspect-[3/4] */}
          <div className="aspect-[3/4] flex flex-col">
            {/* Placeholder image area */}
            <div className="flex-grow bg-ds-surface-container-high relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center text-ds-on-surface-variant opacity-20 font-headline text-8xl font-extrabold select-none">
                🍽
              </div>
              {/* Subtle inner vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-transparent" />

              {current.tag && (
                <div className="absolute top-5 left-5 px-3 py-1.5 bg-ds-surface-container-lowest/90 backdrop-blur-md rounded-full shadow-sm">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-ds-primary">
                    {current.tag}
                  </span>
                </div>
              )}

              {/* Swipe hint — subtle bottom overlay */}
              <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none opacity-25">
                <span className="font-label text-[9px] font-bold tracking-[0.3em] uppercase text-white">
                  ← swipe to decide →
                </span>
              </div>
            </div>

            {/* Card info */}
            <div className="p-6 space-y-4 bg-ds-surface-container-lowest dark:bg-ds-surface-container">
              <div>
                <h2 className="font-headline font-extrabold text-2xl text-ds-on-surface tracking-tight leading-tight">
                  {current.name}
                </h2>
                <p className="font-body text-sm text-ds-on-surface-variant mt-1.5 leading-relaxed">
                  {current.description}
                </p>
              </div>
              <CurrencyDisplay amount={current.price} className="justify-start scale-75 origin-left" />
            </div>
          </div>
        </SwipeCard>

        {/* Action buttons — Pass (subtle) | info (ghost) | Savor (primary filled) */}
        <div className="flex gap-8 items-center justify-center w-full pt-2">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <button
              aria-label="Decline"
              onClick={() => handleSwipe('left')}
              className="w-16 h-16 rounded-full bg-ds-surface-container-lowest shadow-md flex items-center justify-center hover:bg-ds-tertiary/10 transition-all active:scale-90 duration-150"
            >
              <X className="w-7 h-7 text-ds-tertiary" />
            </button>
            <span className="font-label text-[9px] font-bold uppercase tracking-[0.2em] text-ds-on-surface-variant opacity-40">
              Pass
            </span>
          </div>

          {/* Accept — filled primary, larger */}
          <div className="flex flex-col items-center gap-2">
            <button
              aria-label="Accept"
              onClick={() => handleSwipe('right')}
              className="w-16 h-16 rounded-full bg-ds-primary shadow-lg shadow-ds-primary/20 flex items-center justify-center hover:opacity-90 transition-all active:scale-90 duration-150"
            >
              <Check className="w-7 h-7 text-ds-on-primary" />
            </button>
            <span className="font-label text-[9px] font-bold uppercase tracking-[0.2em] text-ds-primary">
              Savor
            </span>
          </div>
        </div>
      </PageLayout>
    </div>
  )
}
