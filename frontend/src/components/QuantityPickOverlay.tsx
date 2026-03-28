import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'

type QuantityPickOverlayProps = {
  maxQty: number
  itemName: string
  onCancel: () => void
  onConfirm: (quantity: number) => void
  isSubmitting?: boolean
}

/**
 * Step 2 after “Mine” on a multi-qty line: +/- stepper and Cancel / Confirm only (no swipe).
 */
export function QuantityPickOverlay({
  maxQty,
  itemName,
  onCancel,
  onConfirm,
  isSubmitting = false,
}: QuantityPickOverlayProps) {
  /** Resets to 1 whenever the overlay mounts (parent toggles step 2 off/on). */
  const [selected, setSelected] = useState(1)

  const dec = () => setSelected((q) => Math.max(1, q - 1))
  const inc = () => setSelected((q) => Math.min(maxQty, q + 1))

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qty-pick-title"
      aria-describedby="qty-pick-hint"
    >
      <div className="w-full max-w-md rounded-xl bg-ds-surface-container-lowest dark:bg-ds-surface-container shadow-xl p-6 pb-4">
        <h2
          id="qty-pick-title"
          className="font-headline font-extrabold text-xl text-ds-on-surface text-center"
        >
          How many?
        </h2>
        <p id="qty-pick-hint" className="font-body text-sm text-ds-on-surface-variant text-center mt-1">
          {itemName}
        </p>
        <p className="sr-only" aria-live="polite">
          Selected quantity {selected} of {maxQty}
        </p>

        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={isSubmitting || selected <= 1}
            onClick={dec}
            className="w-14 h-14 shrink-0 rounded-full bg-ds-surface-container-high flex items-center justify-center text-ds-on-surface disabled:opacity-40 active:scale-95 transition-transform"
          >
            <Minus className="w-7 h-7" aria-hidden />
          </button>

          <div
            className="min-w-[5rem] text-center font-headline text-5xl tabular-nums text-ds-on-surface"
            aria-valuemin={1}
            aria-valuemax={maxQty}
            aria-valuenow={selected}
            role="spinbutton"
          >
            {selected}
          </div>

          <button
            type="button"
            aria-label="Increase quantity"
            disabled={isSubmitting || selected >= maxQty}
            onClick={inc}
            className="w-14 h-14 shrink-0 rounded-full bg-ds-surface-container-high flex items-center justify-center text-ds-on-surface disabled:opacity-40 active:scale-95 transition-transform"
          >
            <Plus className="w-7 h-7" aria-hidden />
          </button>
        </div>

        <p className="font-label text-xs text-center text-ds-on-surface-variant mt-3">
          of {maxQty} on the bill
        </p>

        <div className="flex gap-4 mt-8 justify-center">
          <button
            type="button"
            className="flex-1 rounded-full py-3 px-4 font-label font-semibold text-sm bg-ds-surface-container-high text-ds-on-surface disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex-1 rounded-full py-3 px-4 font-label font-semibold text-sm bg-ds-primary text-ds-on-primary disabled:opacity-50"
            disabled={isSubmitting}
            onClick={() => onConfirm(selected)}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
