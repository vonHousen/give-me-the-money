import { useParams } from 'react-router-dom'
import { TopAppBar } from '@/components/TopAppBar'
import { PageLayout } from '@/components/PageLayout'
import { SettlementQr } from '@/components/SettlementQr'

/**
 * Landing for `/split/:settlementId` (QR deep link). Hosts can reshare the same code from here.
 */
export default function JoinSettlement() {
  const { settlementId } = useParams<{ settlementId: string }>()

  if (!settlementId) {
    return null
  }

  return (
    <div className="min-h-screen bg-ds-surface">
      <TopAppBar />
      <PageLayout className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-headline font-extrabold text-2xl text-ds-on-surface">Join settlement</h2>
          <p className="font-body text-ds-on-surface-variant text-sm">
            Scan the code or open this link on another device to join the split.
          </p>
        </div>

        <div className="bg-ds-surface-container-lowest dark:bg-ds-surface-container rounded-xl p-6">
          <SettlementQr settlementId={settlementId} />
        </div>
      </PageLayout>
    </div>
  )
}
