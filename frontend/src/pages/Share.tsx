import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ReceiptText } from 'lucide-react'
import { TopAppBar } from '@/components/TopAppBar'
import { PageLayout } from '@/components/PageLayout'
import { SettlementQr } from '@/components/SettlementQr'
import { Button } from '@/components/ui/button'
import { getSettlementForSwipe } from '@/lib/settlementApi'

type ShareLocationState = { settlementName?: string } | null

export default function Share() {
  const { settlementId } = useParams<{ settlementId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const stateFromReview = location.state as ShareLocationState
  const [settlementName, setSettlementName] = useState(stateFromReview?.settlementName ?? '')

  useEffect(() => {
    if (settlementName || !settlementId) return
    getSettlementForSwipe(settlementId).then((s) => {
      if (s?.name) setSettlementName(s.name)
    }).catch(() => {})
  }, [settlementId, settlementName])

  if (!settlementId) {
    return null
  }

  return (
    <div className="min-h-screen">
      <TopAppBar
        action={
          <button
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-ds-surface-container transition-colors"
            aria-label="Receipt"
          >
            <ReceiptText className="w-5 h-5 text-ds-on-surface-variant" />
          </button>
        }
      />
      <PageLayout className="space-y-6">
        <h2 className="font-headline font-extrabold text-2xl text-ds-on-surface">Share bill</h2>

        <div className="bg-ds-surface-container-lowest dark:bg-ds-surface-container rounded-xl p-6">
          <SettlementQr settlementId={settlementId} settlementName={settlementName || undefined} />
        </div>

        <Button
          variant="pill"
          className="w-full"
          type="button"
          onClick={() => navigate(`/swipe/${settlementId}`)}
        >
          Continue to swipe
        </Button>
      </PageLayout>
    </div>
  )
}
