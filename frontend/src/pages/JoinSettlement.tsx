import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopAppBar } from '@/components/TopAppBar'
import { PageLayout } from '@/components/PageLayout'
import { SettlementQr } from '@/components/SettlementQr'
import { Button } from '@/components/ui/button'
import { joinSettlement } from '@/lib/settlementApi'
import { setParticipantSession } from '@/lib/settlementSession'

/**
 * Landing for `/split/:settlementId` (QR deep link). Enter your name, then swipe to claim lines.
 */
export default function JoinSettlement() {
  const { settlementId } = useParams<{ settlementId: string }>()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!settlementId) {
    return null
  }

  const handleJoin = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Enter your name to join.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const { participantId } = await joinSettlement(settlementId, trimmed)
      setParticipantSession(settlementId, participantId)
      navigate(`/swipe/${settlementId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join this settlement.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ds-surface">
      <TopAppBar />
      <PageLayout className="space-y-6">
        <div className="space-y-1">
          <h2 className="font-headline font-extrabold text-2xl text-ds-on-surface">Join settlement</h2>
          <p className="font-body text-ds-on-surface-variant text-sm">
            Enter your name, then you will claim what you ordered.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="join-name" className="font-label font-semibold text-ds-on-surface text-sm">
            Your name
          </label>
          <input
            id="join-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex"
            className="w-full rounded-xl border border-ds-outline-variant bg-ds-surface-container-lowest dark:bg-ds-surface-container px-4 py-3 font-body text-ds-on-surface text-sm outline-none focus:border-ds-primary"
            autoComplete="name"
          />
        </div>

        {error ? (
          <p className="font-body text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          variant="pill"
          className="w-full"
          type="button"
          disabled={loading}
          onClick={() => void handleJoin()}
        >
          {loading ? 'Joining…' : 'Continue'}
        </Button>

        <div className="bg-ds-surface-container-lowest dark:bg-ds-surface-container rounded-xl p-6">
          <p className="font-body text-ds-on-surface-variant text-sm mb-4">
            Scan the code or open this link on another device to join the split.
          </p>
          <SettlementQr settlementId={settlementId} />
        </div>
      </PageLayout>
    </div>
  )
}
