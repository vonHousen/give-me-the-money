import { useLocation, useNavigate } from 'react-router-dom'
import { PageLayout } from '@/components/PageLayout'
import { CurrencyDisplay } from '@/components/CurrencyDisplay'
import { Button } from '@/components/ui/button'
import type { SettlementSummaryPayload } from '@/lib/settlementTypes'
import { formatSummaryPersonLabel } from '@/lib/settlementSession'
import { formatMoney } from '@/lib/utils'

const STUB_PEOPLE_ROWS: SettlementSummaryPayload['people'] = [
  {
    id: '1',
    name: 'Alex',
    isOwner: false,
    items: [
      { name: 'Garden Harvest Bowl', price: 18.5 },
      { name: 'Sparkling Water', price: 2.5 },
    ],
  },
  {
    id: '2',
    name: 'Sam',
    isOwner: false,
    items: [
      { name: 'Truffle Fries', price: 9.0 },
      { name: 'Lemon Tart', price: 8.0 },
    ],
  },
  {
    id: '3',
    name: 'Jordan',
    isOwner: false,
    items: [
      { name: 'Sparkling Water ×2', price: 5.0 },
      { name: 'Service Charge', price: 4.3 },
    ],
  },
]

const STUB_SUMMARY: SettlementSummaryPayload = {
  venueName: 'Le Bistro Central · Today',
  people: STUB_PEOPLE_ROWS,
  grandTotal: STUB_PEOPLE_ROWS.flatMap((p) => p.items).reduce((s, i) => s + i.price, 0),
}

export type SummaryLocationState = {
  summary?: SettlementSummaryPayload
  viewerIsOwner?: boolean
  currencyCode?: string
}

export default function Summary() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as SummaryLocationState | null
  const summary = state?.summary
  const viewerIsOwner = state?.viewerIsOwner ?? false
  const currencyCode = state?.currencyCode ?? 'USD'

  const data = summary ?? STUB_SUMMARY
  const people = data.people
  const grandTotal = data.grandTotal

  const labelCtx = { viewerIsOwner, viewerParticipantId: null as string | null }

  return (
    <div className="min-h-screen">
      <PageLayout className="space-y-8">
        <section className="text-center space-y-2 pt-4">
          <p className="font-label text-ds-on-surface-variant text-sm tracking-wide uppercase">
            Final Split
          </p>
          <CurrencyDisplay amount={grandTotal} currencyCode={currencyCode} className="justify-center" />
          <p className="font-body text-ds-on-surface-variant text-sm">{data.venueName}</p>
        </section>

        <section className="space-y-4">
          {people.map((person) => {
            const subtotal = person.items.reduce((s, i) => s + i.price, 0)
            const displayName = formatSummaryPersonLabel(person, labelCtx)
            const initials =
              displayName === 'Me'
                ? 'M'
                : (displayName[0]?.toUpperCase() ?? '?')

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
                    <span className="font-headline font-bold text-ds-on-surface">{displayName}</span>
                  </div>
                  <span className="font-headline font-extrabold text-ds-primary">
                    {formatMoney(subtotal, currencyCode)}
                  </span>
                </div>

                <div className="space-y-1 pl-12">
                  {person.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="font-body text-ds-on-surface-variant">{item.name}</span>
                      <span className="font-label text-ds-on-surface-variant tabular-nums">
                        {formatMoney(item.price, currencyCode)}
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
