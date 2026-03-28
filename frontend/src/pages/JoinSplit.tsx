import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

function useDarkMode() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains('dark'),
  )
  const toggle = () => {
    const next = document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', next ? 'dark' : 'light')
    setIsDark(next)
  }
  return { isDark, toggle }
}

export default function JoinSplit() {
  const navigate = useNavigate()
  const { isDark, toggle } = useDarkMode()
  const [settlementId, setSettlementId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleContinue = () => {
    const id = settlementId.trim()
    if (!id) {
      setError('Enter a settlement ID from the host.')
      return
    }
    setError(null)
    navigate(`/split/${encodeURIComponent(id)}`)
  }

  return (
    <div className="min-h-screen bg-ds-surface flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-ds-primary rounded-full blur-[120px] opacity-15 pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-ds-secondary-container rounded-full blur-[120px] opacity-20 pointer-events-none" />

      <button
        onClick={toggle}
        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full hover:bg-ds-surface-container-low transition-colors"
        aria-label="Toggle dark mode"
        type="button"
      >
        {isDark ? (
          <Sun className="w-5 h-5 text-ds-on-surface-variant" />
        ) : (
          <Moon className="w-5 h-5 text-ds-on-surface-variant" />
        )}
      </button>

      <div className="relative z-10 flex flex-col gap-6 w-full max-w-sm">
        <div className="text-center space-y-2">
          <h1 className="font-headline font-extrabold text-2xl text-ds-on-surface">Join a split</h1>
          <p className="font-body text-ds-on-surface-variant text-sm">
            Paste the settlement ID the host shared, then enter your name on the next screen.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="settlement-id" className="font-label font-semibold text-ds-on-surface text-sm">
            Settlement ID
          </label>
          <input
            id="settlement-id"
            value={settlementId}
            onChange={(e) => setSettlementId(e.target.value)}
            placeholder="e.g. uuid from the host"
            className="w-full rounded-xl border border-ds-outline-variant bg-ds-surface-container-lowest dark:bg-ds-surface-container px-4 py-3 font-body text-ds-on-surface text-sm outline-none focus:border-ds-primary"
            autoComplete="off"
          />
        </div>

        {error ? (
          <p className="font-body text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3">
          <Button variant="pill" className="w-full py-4" type="button" onClick={handleContinue}>
            Continue
          </Button>
          <Button variant="pill-ghost" className="w-full" type="button" onClick={() => navigate('/')}>
            Back home
          </Button>
        </div>
      </div>
    </div>
  )
}
