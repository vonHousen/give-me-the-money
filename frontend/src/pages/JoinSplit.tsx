import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Upload, QrCode } from 'lucide-react'
import { PageLayout } from '@/components/PageLayout'
import { Button } from '@/components/ui/button'
import { usePreferCameraCapture } from '@/hooks/usePreferCameraCapture'
import { decodeQrFromImageFile } from '@/lib/joinQrScan'
import { parseJoinPayload } from '@/lib/joinSettlementUrl'
import { setSettlementCurrency } from '@/lib/settlementSession'

export default function JoinSplit() {
  const navigate = useNavigate()
  const preferCameraCapture = usePreferCameraCapture()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [settlementId, setSettlementId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  const clearPreview = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setSelectedFile(null)
  }, [])

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl],
  )

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    setError(null)
    setSelectedFile(file)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  const goToSettlement = (raw: string) => {
    const payload = parseJoinPayload(raw)
    if (!payload) {
      setError('No valid settlement link or ID found in that QR code.')
      return
    }
    if (payload.currencyCode) {
      setSettlementCurrency(payload.settlementId, payload.currencyCode)
    }
    setError(null)
    const params = payload.currencyCode ? `?c=${encodeURIComponent(payload.currencyCode)}` : ''
    navigate(`/split/${encodeURIComponent(payload.settlementId)}${params}`)
  }

  const handleScanQr = async () => {
    if (!selectedFile) return
    setScanning(true)
    setError(null)
    try {
      const text = await decodeQrFromImageFile(selectedFile)
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

  const handleContinue = () => {
    const id = settlementId.trim()
    if (!id) {
      setError('Enter a settlement ID or scan the QR code from the host.')
      return
    }
    goToSettlement(id)
  }

  return (
    <div className="min-h-screen">
      {preferCameraCapture ? (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-label="Capture QR code with camera"
          tabIndex={-1}
          onChange={onFileChange}
        />
      ) : null}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Upload QR code image from files"
        tabIndex={-1}
        onChange={onFileChange}
      />

      <PageLayout className="flex flex-col gap-6">
        <div className="space-y-1">
          <h2 className="font-headline font-extrabold text-3xl text-ds-on-surface tracking-tight leading-tight">
            Scan a <br />
            <span className="text-ds-primary">QR Code.</span>
          </h2>
          <p className="font-body text-ds-on-surface-variant text-sm max-w-[80%]">
            Snap or upload the host&apos;s QR code to join the split, or enter the code manually below.
          </p>
        </div>

        {/* Viewfinder */}
        <div className="relative bg-ds-surface-container-low dark:bg-ds-surface-container rounded-[2rem] aspect-square w-full flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-40 mix-blend-overlay bg-gradient-to-tr from-ds-surface-container to-ds-surface-container-lowest pointer-events-none" />
          <div className="absolute inset-8 border-2 border-dashed border-ds-outline-variant opacity-30 rounded-xl pointer-events-none" />

          {['top-4 left-4 border-t-2 border-l-2', 'top-4 right-4 border-t-2 border-r-2', 'bottom-4 left-4 border-b-2 border-l-2', 'bottom-4 right-4 border-b-2 border-r-2'].map(
            (pos, i) => (
              <div key={i} className={`absolute w-8 h-8 ${pos} border-ds-primary rounded-sm pointer-events-none`} />
            ),
          )}

          {previewUrl ? (
            <img
              src={previewUrl}
              alt="QR code preview"
              className="relative z-[1] max-h-full max-w-full object-contain px-4 py-6"
            />
          ) : (
            <div className="relative flex flex-col items-center text-center px-12">
              <div className="w-20 h-20 mb-5 bg-ds-primary-container dark:bg-ds-surface-container-high rounded-full flex items-center justify-center shadow-sm">
                <QrCode className="w-9 h-9 text-ds-on-primary-container dark:text-ds-primary" />
              </div>
              <h3 className="font-headline text-lg font-bold text-ds-on-surface">No QR code selected</h3>
              <p className="text-sm text-ds-on-surface-variant mt-1">
                Take a photo or upload an image of the host&apos;s QR code.
              </p>
            </div>
          )}
        </div>

        {/* Take Photo / Upload buttons */}
        <div className={`flex gap-3 ${preferCameraCapture ? '' : 'flex-col'}`}>
          {preferCameraCapture ? (
            <Button
              type="button"
              variant="pill"
              className="flex-1 gap-2"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="w-4 h-4" />
              Take Photo
            </Button>
          ) : null}
          <Button
            type="button"
            variant={preferCameraCapture ? 'pill-ghost' : 'pill'}
            className={preferCameraCapture ? 'flex-1 gap-2' : 'w-full gap-2'}
            onClick={() => uploadInputRef.current?.click()}
          >
            <Upload className="w-4 h-4" />
            Upload
          </Button>
        </div>

        {previewUrl ? (
          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs font-medium text-ds-primary hover:underline"
              onClick={() => {
                clearPreview()
                setError(null)
              }}
            >
              Clear photo
            </button>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          variant="pill"
          className="w-full"
          disabled={!selectedFile || scanning}
          onClick={() => void handleScanQr()}
        >
          {scanning ? 'Scanning…' : 'Scan QR Code'}
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-ds-outline-variant" />
          <span className="font-label text-ds-on-surface-variant text-xs uppercase tracking-wide">or enter code</span>
          <div className="h-px flex-1 bg-ds-outline-variant" />
        </div>

        {/* Manual entry */}
        <div className="space-y-3">
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

        <div className="flex flex-col gap-3">
          <Button variant="pill" className="w-full py-4" type="button" onClick={handleContinue}>
            Continue
          </Button>
          <Button variant="pill-ghost" className="w-full" type="button" onClick={() => navigate('/')}>
            Back home
          </Button>
        </div>
      </PageLayout>
    </div>
  )
}
