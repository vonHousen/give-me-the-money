import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Upload, Lightbulb } from 'lucide-react'
import { TopAppBar } from '@/components/TopAppBar'
import { PageLayout } from '@/components/PageLayout'
import { Button } from '@/components/ui/button'
import { blobToBase64Payload } from '@/lib/receiptScanEncoding'
import { analyzeReceipt } from '@/lib/receiptScanApi'
import type { AnalyzeResponse } from '@/lib/receiptScanApi'

export type ReviewLocationState = {
  analyzeResult?: AnalyzeResponse
}

/**
 * Touch-first devices: show "Take Photo" and set `capture` on the file input.
 * Fine pointer (desktop): hide that control — users pick files via "Upload" only.
 */
function usePreferCameraCapture(): boolean {
  const [prefer, setPrefer] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(pointer: coarse)')
    const sync = () => setPrefer(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return prefer
}

export default function Scan() {
  const navigate = useNavigate()
  const preferCameraCapture = usePreferCameraCapture()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

  const handleAnalyze = async () => {
    if (!selectedFile) return
    setLoading(true)
    setError(null)
    try {
      const payload = await blobToBase64Payload(selectedFile)
      const res = await analyzeReceipt(payload)
      navigate('/review', { state: { analyzeResult: res } satisfies ReviewLocationState })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ds-surface">
      {preferCameraCapture ? (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          data-testid="scan-camera-input"
          aria-label="Capture receipt with camera"
          tabIndex={-1}
          onChange={onFileChange}
        />
      ) : null}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        data-testid="scan-upload-input"
        aria-label="Upload receipt image from files"
        tabIndex={-1}
        onChange={onFileChange}
      />

      <TopAppBar />
      <PageLayout className="flex flex-col gap-6">
        <div className="space-y-1">
          <h2 className="font-headline font-extrabold text-3xl text-ds-on-surface tracking-tight leading-tight">
            Capture your <br />
            <span className="text-ds-primary">Receipts.</span>
          </h2>
          <p className="font-body text-ds-on-surface-variant text-sm max-w-[80%]">
            Snap or import a photo of your paper receipt to automatically split the bill with friends.
          </p>
        </div>

        <div className="relative bg-ds-surface-container-low dark:bg-ds-surface-container rounded-[2rem] aspect-[3/4] w-full flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-40 mix-blend-overlay bg-gradient-to-tr from-ds-surface-container to-ds-surface-container-lowest pointer-events-none" />

          <div className="absolute inset-8 border-2 border-dashed border-ds-outline-variant opacity-30 rounded-xl pointer-events-none" />

          {[
            'top-4 left-4 border-t-2 border-l-2',
            'top-4 right-4 border-t-2 border-r-2',
            'bottom-4 left-4 border-b-2 border-l-2',
            'bottom-4 right-4 border-b-2 border-r-2',
          ].map((pos, i) => (
            <div
              key={i}
              className={`absolute w-8 h-8 ${pos} border-ds-primary rounded-sm pointer-events-none`}
            />
          ))}

          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="relative z-[1] max-h-full max-w-full object-contain px-4 py-6"
            />
          ) : (
            <div className="relative flex flex-col items-center text-center px-12">
              <div className="w-20 h-20 mb-5 bg-ds-primary-container dark:bg-ds-surface-container-high rounded-full flex items-center justify-center shadow-sm">
                <Camera className="w-9 h-9 text-ds-on-primary-container dark:text-ds-primary" />
              </div>
              <h3 className="font-headline text-lg font-bold text-ds-on-surface">No receipt selected</h3>
              <p className="text-sm text-ds-on-surface-variant mt-1">
                Position the paper clearly in the frame for best results.
              </p>
            </div>
          )}
        </div>

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

        <div className="bg-ds-surface-container-low dark:bg-ds-surface-container p-5 rounded-[1.5rem] flex items-start gap-4">
          <div className="text-ds-primary mt-0.5 shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-label text-sm font-bold text-ds-on-surface">Scanning Tips</h4>
            <p className="text-xs text-ds-on-surface-variant mt-1 leading-relaxed">
              Place the receipt on a dark background and ensure good lighting for 99% accuracy in item detection.
            </p>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <Button
          variant="pill"
          className="w-full mt-2"
          disabled={!selectedFile || loading}
          onClick={() => void handleAnalyze()}
        >
          {loading ? 'Analyzing…' : 'Analyze Receipt'}
        </Button>
      </PageLayout>
    </div>
  )
}
