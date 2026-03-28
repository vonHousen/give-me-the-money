import { useNavigate } from 'react-router-dom'
import { ReceiptText } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { TopAppBar } from '@/components/TopAppBar'
import { PageLayout } from '@/components/PageLayout'
import { Button } from '@/components/ui/button'

const STUB_ITEMS = [
  { id: 1, name: 'Garden Harvest Bowl', price: 18.5 },
  { id: 2, name: 'Truffle Fries', price: 9.0 },
  { id: 3, name: 'Lemon Tart', price: 8.0 },
  { id: 4, name: 'Sparkling Water ×3', price: 7.5 },
  { id: 5, name: 'Service Charge (10%)', price: 4.3 },
]

const TOTAL = STUB_ITEMS.reduce((s, i) => s + i.price, 0)
const SHARE_URL = 'https://gmtm.app/split/abc123'

export default function Review() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-ds-surface">
      <TopAppBar
        action={
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-ds-surface-container transition-colors">
            <ReceiptText className="w-5 h-5 text-ds-on-surface-variant" />
          </button>
        }
      />
      <PageLayout className="space-y-6">
        <h2 className="font-headline font-extrabold text-2xl text-ds-on-surface">
          Bill Overview
        </h2>

        {/* Item list — no dividers, whitespace separates */}
        <div className="bg-ds-surface-container-lowest dark:bg-ds-surface-container rounded-xl overflow-hidden">
          {STUB_ITEMS.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-5 py-4"
            >
              <span className="font-body text-ds-on-surface text-sm">{item.name}</span>
              <span className="font-label font-semibold text-ds-primary text-sm tabular-nums">
                ${item.price.toFixed(2)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between px-5 py-4 bg-ds-surface-container-low dark:bg-ds-surface-container-high">
            <span className="font-headline font-bold text-ds-on-surface">Total</span>
            <span className="font-headline font-bold text-ds-primary">
              ${TOTAL.toFixed(2)}
            </span>
          </div>
        </div>

        {/* QR Code */}
        <div className="bg-ds-surface-container-lowest dark:bg-ds-surface-container rounded-xl p-6 flex flex-col items-center gap-4">
          <QRCodeSVG
            value={SHARE_URL}
            size={160}
            bgColor="transparent"
            fgColor="currentColor"
            className="text-ds-on-surface"
          />
          <div className="text-center space-y-1">
            <p className="font-label font-semibold text-ds-on-surface text-sm">
              Share this code to split the bill
            </p>
            <p className="font-body text-ds-on-surface-variant text-xs">
              {SHARE_URL}
            </p>
          </div>
        </div>

        <Button
          variant="pill"
          className="w-full"
          onClick={() => navigate('/swipe')}
        >
          Lock &amp; Share
        </Button>
      </PageLayout>
    </div>
  )
}
