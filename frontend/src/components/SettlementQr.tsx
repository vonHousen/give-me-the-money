import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Check } from 'lucide-react'
import { buildJoinSettlementUrl } from '@/lib/joinSettlementUrl'
import { cn } from '@/lib/utils'

type SettlementQrProps = {
  settlementId: string
  className?: string
  /** Pixel size of the QR square */
  size?: number
  /** Settlement name shown in the share text when copying the link */
  settlementName?: string
}

export function SettlementQr({ settlementId, className, size = 160, settlementName }: SettlementQrProps) {
  const url = buildJoinSettlementUrl(settlementId)
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const handleCopy = useCallback(async () => {
    const text = settlementName
      ? `Split the bill for ${settlementName}! Join here: ${url}`
      : `Split the bill! Join here: ${url}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard may be unavailable in insecure contexts */
    }
  }, [url, settlementName])

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <QRCodeSVG
        value={url}
        size={size}
        bgColor="transparent"
        fgColor="currentColor"
        className="text-ds-on-surface"
      />
      <div className="text-center space-y-1">
        <p className="font-label font-semibold text-ds-on-surface text-sm">
          Share this code to split the bill
        </p>
        <p className="font-body text-ds-on-surface-variant text-xs break-all">{url}</p>
      </div>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors',
          copied
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-ds-primary-container text-ds-on-primary-container hover:opacity-80',
        )}
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            Copy link
          </>
        )}
      </button>
    </div>
  )
}
