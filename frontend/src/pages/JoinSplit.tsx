import { useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sun, Moon, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { decodeQrFromImageFile } from '@/lib/joinQrScan'
import { parseSettlementIdFromJoinPayload } from '@/lib/joinSettlementUrl'

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [settlementId, setSettlementId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  const goToSettlement = (raw: string) => {
    const id = parseSettlementIdFromJoinPayload(raw)
    if (!id) {
      setError('That does not look like a settlement link or ID.')
      return
    }
    setError(null)
    navigate(`/split/${encodeURIComponent(id)}`)
  }

  const handleContinue = () => {
    const id = settlementId.trim()
    if (!id) {
      setError('Enter a settlement ID or scan the QR code from the host.')
      return
    }
    goToSettlement(id)
  }

  const handlePickQrImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setScanning(true)
    try {
      const text = await decodeQrFromImageFile(file)
      if (!text?.trim()) {
        setError('No QR code found in that image. Try again or enter the code manually.')
        return
      }
      goToSettlement(text.trim())
    } catch {
      setError('Could not read that image. Try again or enter the code manually.')
    } finally {
      setScanning(false)
    }
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
          <h1 className="font-headline font-extrabold text-2xl text-ds-on-surface">Join settlement</h1>
          <p className="font-body text-ds-on-surface-variant text-sm">
            Scan the host&apos;s QR code, paste the link, or type the settlement ID. Opening the same link in
            Camera or Google Lens opens this app in the browser.
          </p>
        </div>

        <input
          id="join-settlement-qr-file"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-label="Choose a photo of the settlement QR code"
          onChange={(ev) => void handlePickQrImage(ev)}
        />

        <div className="space-y-3">
          <Button
            variant="pill"
            className="w-full py-4 gap-3"
            type="button"
            disabled={scanning}
            onClick={() => fileInputRef.current?.click()}
            aria-controls="join-settlement-qr-file"
          >
            <QrCode className="w-5 h-5 shrink-0" />
            {scanning ? 'Reading QR…' : 'Scan QR code'}
          </Button>
          <p className="font-body text-ds-on-surface-variant text-xs text-center">Uses your camera or photo library</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-ds-outline-variant" />
          <span className="font-label text-ds-on-surface-variant text-xs uppercase tracking-wide">or enter code</span>
          <div className="h-px flex-1 bg-ds-outline-variant" />
        </div>

        <div className="space-y-2">
          <label htmlFor="settlement-id" className="font-label font-semibold text-ds-on-surface text-sm">
            Settlement ID or link
          </label>
          <input
            id="settlement-id"
            value={settlementId}
            onChange={(e) => setSettlementId(e.target.value)}
            placeholder="Paste link or ID from the host"
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
