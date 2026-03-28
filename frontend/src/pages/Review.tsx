import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, ReceiptText } from 'lucide-react'
import { TopAppBar } from '@/components/TopAppBar'
import { PageLayout } from '@/components/PageLayout'
import { Button } from '@/components/ui/button'
import { createSettlement } from '@/lib/settlementApi'
import { markSettlementOwnerSession } from '@/lib/settlementSession'
import { roundMoney } from '@/lib/utils'
import type { ReviewLocationState } from '@/pages/Scan'

export type ReviewLine = {
  id: string
  name: string
  unitPrice: number
  quantity: number
}

const SEED_ROWS: ReviewLine[] = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Garden Harvest Bowl', unitPrice: 18.5, quantity: 1 },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Truffle Fries', unitPrice: 9.0, quantity: 1 },
  { id: '00000000-0000-0000-0000-000000000003', name: 'Lemon Tart', unitPrice: 8.0, quantity: 1 },
  { id: '00000000-0000-0000-0000-000000000004', name: 'Sparkling Water', unitPrice: 2.5, quantity: 3 },
  { id: '00000000-0000-0000-0000-000000000005', name: 'Service Charge (10%)', unitPrice: 4.3, quantity: 1 },
]

function lineSubtotal(row: ReviewLine): number {
  return roundMoney(row.unitPrice * row.quantity)
}

export default function Review() {
  const navigate = useNavigate()
  const location = useLocation()
  const receiptState = location.state as ReviewLocationState | null

  const [settlementName, setSettlementName] = useState(() =>
    receiptState?.receiptScan?.receipt_id
      ? `Receipt ${receiptState.receiptScan.receipt_id.slice(0, 8)}…`
      : 'Receipt',
  )
  const [rows, setRows] = useState<ReviewLine[]>(() => SEED_ROWS.map((r) => ({ ...r })))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const grandTotal = useMemo(
    () => roundMoney(rows.reduce((sum, row) => sum + lineSubtotal(row), 0)),
    [rows],
  )

  const updateRow = (id: string, patch: Partial<Pick<ReviewLine, 'name' | 'unitPrice' | 'quantity'>>) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    )
  }

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: '',
        unitPrice: 0,
        quantity: 1,
      },
    ])
  }

  const handleShare = async () => {
    const validRows = rows.filter((r) => r.name.trim() !== '' && lineSubtotal(r) > 0)
    if (validRows.length === 0) {
      setError('Add at least one line with a name and a positive total.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await createSettlement({
        name: settlementName.trim() || 'Receipt',
        items: validRows.map((r) => ({
          id: r.id,
          name: r.name.trim(),
          price: lineSubtotal(r),
        })),
      })
      const ownerUser = res.users[0]
      if (ownerUser) {
        markSettlementOwnerSession(res.id, ownerUser.id)
      }
      navigate(`/share/${res.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create settlement.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ds-surface">
      <TopAppBar
        action={
          <button
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-ds-surface-container transition-colors"
            aria-label="Receipt"
          >
            <ReceiptText className="w-5 h-5 text-ds-on-surface-variant" />
          </button>
        }
      />
      <PageLayout className="space-y-6">
        <h2 className="font-headline font-extrabold text-2xl text-ds-on-surface">Bill Overview</h2>

        <div className="space-y-2">
          <label htmlFor="settlement-name" className="font-label font-semibold text-ds-on-surface text-sm">
            Settlement name
          </label>
          <input
            id="settlement-name"
            type="text"
            value={settlementName}
            onChange={(e) => setSettlementName(e.target.value)}
            className="w-full rounded-xl border border-ds-outline-variant bg-ds-surface-container-lowest dark:bg-ds-surface-container px-4 py-3 font-body text-ds-on-surface text-sm outline-none focus:border-ds-primary"
            autoComplete="off"
          />
        </div>

        <div className="overflow-x-auto -mx-1">
          <section className="space-y-1 min-w-[320px] w-full">
            <div className="grid grid-cols-12 gap-x-2 px-4 py-3 mb-1 items-end">
              <div className="col-span-5 font-label text-[10px] uppercase tracking-[0.05em] text-ds-on-surface-variant font-semibold">
                Item
              </div>
              <div className="col-span-2 font-label text-[10px] uppercase tracking-[0.05em] text-ds-on-surface-variant font-semibold text-center">
                Unit price
              </div>
              <div className="col-span-2 font-label text-[10px] uppercase tracking-[0.05em] text-ds-on-surface-variant font-semibold text-center">
                Qty
              </div>
              <div className="col-span-3 font-label text-[10px] uppercase tracking-[0.05em] text-ds-on-surface-variant font-semibold text-right">
                Subtotal
              </div>
            </div>
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-12 gap-x-2 items-center px-4 py-5 rounded-sm bg-ds-surface-container-low dark:bg-ds-surface-container-low hover:bg-ds-surface-container-high dark:hover:bg-ds-surface-container-high transition-colors"
              >
                <div className="col-span-5 min-w-0">
                  <input
                    aria-label={`Item name ${row.id}`}
                    value={row.name}
                    onChange={(e) => updateRow(row.id, { name: e.target.value })}
                    placeholder="Description"
                    className="w-full min-w-[6rem] rounded-md border border-transparent bg-transparent px-0 py-0.5 font-body text-sm text-ds-on-surface placeholder:text-ds-on-surface-variant/60 outline-none focus-visible:ring-2 focus-visible:ring-ds-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ds-surface-container-low dark:focus-visible:ring-offset-ds-surface-container-low"
                  />
                </div>
                <div className="col-span-2 min-w-0">
                  <input
                    aria-label={`Unit price ${row.id}`}
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={Number.isFinite(row.unitPrice) ? row.unitPrice : ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      updateRow(row.id, { unitPrice: Number.isFinite(v) ? v : 0 })
                    }}
                    className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 font-body text-sm text-ds-on-surface text-center tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ds-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ds-surface-container-low dark:focus-visible:ring-offset-ds-surface-container-low"
                  />
                </div>
                <div className="col-span-2 min-w-0">
                  <input
                    aria-label={`Quantity ${row.id}`}
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="1"
                    value={Number.isFinite(row.quantity) ? row.quantity : ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      updateRow(row.id, { quantity: Number.isFinite(v) && v >= 1 ? v : 1 })
                    }}
                    className="w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 font-body text-sm text-ds-on-surface text-center tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ds-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ds-surface-container-low dark:focus-visible:ring-offset-ds-surface-container-low"
                  />
                </div>
                <div className="col-span-3 text-right font-headline text-base font-bold text-ds-primary tabular-nums">
                  ${lineSubtotal(row).toFixed(2)}
                </div>
              </div>
            ))}
          </section>
        </div>

        <button
          type="button"
          onClick={addRow}
          className="w-full flex items-center justify-center gap-2 py-4 border border-ds-outline/20 rounded-lg font-label text-xs font-medium uppercase tracking-[0.08em] text-ds-on-surface-variant hover:bg-ds-surface-container-low dark:hover:bg-ds-surface-container-low transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ds-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ds-surface"
        >
          <Plus className="w-4 h-4 shrink-0" aria-hidden />
          Add new row
        </button>

        <section className="bg-ds-surface-container-high dark:bg-ds-surface-container-high p-6 sm:p-8 rounded-xl shadow-lg shadow-ds-primary/10">
          <div className="flex justify-between items-baseline mb-6 gap-4">
            <span className="font-label text-xs uppercase tracking-widest text-ds-on-surface-variant font-semibold">
              Subtotal
            </span>
            <span className="font-headline text-lg font-bold text-ds-on-surface tabular-nums">
              ${grandTotal.toFixed(2)}
            </span>
          </div>
          <div className="h-px bg-ds-outline-variant/20 mb-6" />
          <div className="flex justify-between items-center gap-4">
            <span className="font-label text-xs uppercase tracking-widest text-ds-on-surface-variant font-bold">
              Total balance
            </span>
            <span className="font-headline text-3xl sm:text-4xl font-extrabold text-ds-primary tracking-tight tabular-nums shrink-0">
              ${grandTotal.toFixed(2)}
            </span>
          </div>
        </section>

        {error ? (
          <p className="font-body text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <Button variant="pill" className="w-full" type="button" disabled={loading} onClick={handleShare}>
          {loading ? 'Sharing…' : 'Share'}
        </Button>
      </PageLayout>
    </div>
  )
}
