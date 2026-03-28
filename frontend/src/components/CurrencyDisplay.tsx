import { cn, getCurrencySymbol } from '@/lib/utils'

interface CurrencyDisplayProps {
  amount: number
  /** ISO 4217 code (e.g. "USD", "EUR", "PLN"). Falls back to USD. */
  currencyCode?: string
  className?: string
}

export function CurrencyDisplay({
  amount,
  currencyCode = 'USD',
  className,
}: CurrencyDisplayProps) {
  const symbol = getCurrencySymbol(currencyCode)
  const whole = Math.floor(amount)
  const cents = (Math.round((amount - whole) * 100) % 100)
    .toString()
    .padStart(2, '0')

  return (
    <div
      className={cn(
        'flex items-start font-headline text-ds-on-surface',
        className,
      )}
    >
      <span className="text-4xl font-bold mt-2">{symbol}</span>
      <span className="text-7xl font-extrabold tracking-tighter leading-none">
        {whole}
      </span>
      <span className="text-3xl font-bold mt-2">.{cents}</span>
    </div>
  )
}
