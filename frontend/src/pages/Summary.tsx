import { useNavigate } from 'react-router-dom'
import { TopAppBar } from '@/components/TopAppBar'
import { PageLayout } from '@/components/PageLayout'
import { CurrencyDisplay } from '@/components/CurrencyDisplay'
import { Button } from '@/components/ui/button'

const STUB_PEOPLE = [
  {
    id: 1,
    name: 'Alex',
    items: [{ name: 'Garden Harvest Bowl', price: 18.5 }, { name: 'Sparkling Water', price: 2.5 }],
  },
  {
    id: 2,
    name: 'Sam',
    items: [{ name: 'Truffle Fries', price: 9.0 }, { name: 'Lemon Tart', price: 8.0 }],
  },
  {
    id: 3,
    name: 'Jordan',
    items: [{ name: 'Sparkling Water ×2', price: 5.0 }, { name: 'Service Charge', price: 4.3 }],
  },
]

const GRAND_TOTAL = STUB_PEOPLE.flatMap((p) => p.items).reduce((s, i) => s + i.price, 0)

export default function Summary() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-ds-surface dark:bg-ds-surface">
      <TopAppBar />
      <PageLayout className="space-y-8">
        {/* Hero total */}
        <section className="text-center space-y-2 pt-4">
          <p className="font-label text-ds-on-surface-variant text-sm tracking-wide uppercase">
            Final Split
          </p>
          <CurrencyDisplay amount={GRAND_TOTAL} className="justify-center" />
          <p className="font-body text-ds-on-surface-variant text-sm">
            Le Bistro Central · Today
          </p>
        </section>

        {/* Person cards */}
        <section className="space-y-4">
          {STUB_PEOPLE.map((person) => {
            const subtotal = person.items.reduce((s, i) => s + i.price, 0)
            const initials = person.name[0].toUpperCase()

            return (
              <div
                key={person.id}
                className="bg-ds-surface-container-lowest dark:bg-ds-surface-container rounded-xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-ds-primary-container flex items-center justify-center">
                      <span className="font-headline font-bold text-ds-on-primary-container text-sm">
                        {initials}
                      </span>
                    </div>
                    <span className="font-headline font-bold text-ds-on-surface">
                      {person.name}
                    </span>
                  </div>
                  <span className="font-headline font-extrabold text-ds-primary">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-1 pl-12">
                  {person.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="font-body text-ds-on-surface-variant">{item.name}</span>
                      <span className="font-label text-ds-on-surface-variant tabular-nums">
                        ${item.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </section>

        <Button variant="pill" className="w-full" onClick={() => navigate('/')}>
          Done
        </Button>
      </PageLayout>
    </div>
  )
}
