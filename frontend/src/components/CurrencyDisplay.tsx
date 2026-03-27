import { cn } from '@/lib/utils'

interface CurrencyDisplayProps {
  amount: number
  currency?: string
  className?: string
}

export function CurrencyDisplay({
  amount,
  currency = '$',
  className,
}: CurrencyDisplayProps) {
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
      <span className="text-4xl font-bold mt-2">{currency}</span>
      <span className="text-7xl font-extrabold tracking-tighter leading-none">
        {whole}
      </span>
      <span className="text-3xl font-bold mt-2">.{cents}</span>
    </div>
  )
}
