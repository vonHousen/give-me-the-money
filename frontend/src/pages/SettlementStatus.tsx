import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopAppBar } from '@/components/TopAppBar'
import { PageLayout } from '@/components/PageLayout'
import { Button } from '@/components/ui/button'
import { finishSettlement, getSettlementStatus } from '@/lib/settlementApi'
import {
  formatParticipantLabel,
  getParticipantIdFromSession,
  isSettlementOwnerSession,
} from '@/lib/settlementSession'

const POLL_MS = 2500

export default function SettlementStatus() {
  const { settlementId } = useParams<{ settlementId: string }>()
  const navigate = useNavigate()
  const [participants, setParticipants] = useState<
    { id: string; name: string; isOwner: boolean; swipeFinished: boolean }[]
  >([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [finishing, setFinishing] = useState(false)

  const viewerIsOwner = settlementId ? isSettlementOwnerSession(settlementId) : false
  const viewerParticipantId = settlementId ? getParticipantIdFromSession(settlementId) : null

  const fetchStatus = useCallback(async () => {
    if (!settlementId) {
      return
    }
    try {
      const res = await getSettlementStatus(settlementId)
      setParticipants(res.participants)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load status.')
    } finally {
      setLoading(false)
    }
  }, [settlementId])

  useEffect(() => {
    void fetchStatus()
    const t = window.setInterval(() => void fetchStatus(), POLL_MS)
    return () => window.clearInterval(t)
  }, [fetchStatus])

  const handleFinish = async () => {
    if (!settlementId) {
      return
    }
    setFinishing(true)
    setError(null)
    try {
      const { summary } = await finishSettlement(settlementId)
      navigate('/summary', { state: { summary, viewerIsOwner: true } })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finish settlement.')
    } finally {
      setFinishing(false)
    }
  }

  if (!settlementId) {
    return null
  }

  const labelCtx = {
    viewerIsOwner,
    viewerParticipantId,
  }

  return (
    <div className="min-h-screen">
      <TopAppBar />
      <PageLayout className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-headline font-extrabold text-2xl text-ds-on-surface">Settlement status</h2>
          <p className="font-body text-ds-on-surface-variant text-sm">
            Who joined and who finished claiming their items.
          </p>
        </div>

        {loading ? (
          <p className="font-body text-sm text-ds-on-surface-variant">Loading…</p>
        ) : null}

        {error ? (
          <p className="font-body text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <ul className="space-y-3">
          {participants.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded-xl bg-ds-surface-container-lowest dark:bg-ds-surface-container px-4 py-3"
            >
              <span className="font-headline font-semibold text-ds-on-surface">
                {formatParticipantLabel(p, labelCtx)}
              </span>
              <span
                className={
                  p.swipeFinished
                    ? 'font-label text-xs font-bold uppercase tracking-wide text-ds-primary'
                    : 'font-label text-xs font-bold uppercase tracking-wide text-ds-on-surface-variant'
                }
              >
                {p.swipeFinished ? 'Finished' : 'In progress'}
              </span>
            </li>
          ))}
        </ul>

        {viewerIsOwner ? (
          <Button
            variant="pill"
            className="w-full"
            type="button"
            disabled={finishing || !!error}
            onClick={() => void handleFinish()}
          >
            {finishing ? 'Finishing…' : 'Finish settlement'}
          </Button>
        ) : (
          <p className="font-body text-sm text-ds-on-surface-variant text-center">
            Waiting for the host to finish the settlement.
          </p>
        )}
      </PageLayout>
    </div>
  )
}
