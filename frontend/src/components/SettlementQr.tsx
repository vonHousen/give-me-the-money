import { QRCodeSVG } from 'qrcode.react'
import { buildJoinSettlementUrl } from '@/lib/joinSettlementUrl'
import { cn } from '@/lib/utils'

type SettlementQrProps = {
  settlementId: string
  className?: string
  /** Pixel size of the QR square */
  size?: number
}

export function SettlementQr({ settlementId, className, size = 160 }: SettlementQrProps) {
  const url = buildJoinSettlementUrl(settlementId)
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
    </div>
  )
}
