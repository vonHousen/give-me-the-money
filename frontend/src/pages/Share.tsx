import { useNavigate, useParams } from 'react-router-dom'
import { ReceiptText } from 'lucide-react'
import { TopAppBar } from '@/components/TopAppBar'
import { PageLayout } from '@/components/PageLayout'
import { SettlementQr } from '@/components/SettlementQr'
import { Button } from '@/components/ui/button'

export default function Share() {
  const { settlementId } = useParams<{ settlementId: string }>()
  const navigate = useNavigate()

  if (!settlementId) {
    return null
  }

  return (
    <div className="min-h-screen bg-ds-surface">
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
          <SettlementQr settlementId={settlementId} />
        </div>

        <Button variant="pill" className="w-full" type="button" onClick={() => navigate('/swipe')}>
          Continue to swipe
        </Button>
      </PageLayout>
    </div>
  )
}
