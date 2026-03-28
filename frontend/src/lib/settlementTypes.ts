import { roundMoney } from '@/lib/utils'

export type SettlementItemWire = {
  id: string
  name: string
  /** Line total (unitPrice × quantity). */
  price: number
  /** Units on the receipt line (≥ 1). */
  quantity: number
  /** Pre-tax/unit price for one unit (for splitting claims). */
  unitPrice: number
}

/** Normalize items from API or legacy payloads missing quantity/unitPrice. */
export function normalizeSettlementItem(
  i: Pick<SettlementItemWire, 'id' | 'name' | 'price'> &
    Partial<Pick<SettlementItemWire, 'quantity' | 'unitPrice'>>,
): SettlementItemWire {
  const q =
    typeof i.quantity === 'number' && Number.isFinite(i.quantity) && i.quantity >= 1
      ? Math.floor(i.quantity)
      : 1
  const price = roundMoney(i.price)
  const unitPrice =
    typeof i.unitPrice === 'number' && Number.isFinite(i.unitPrice) && i.unitPrice >= 0
      ? roundMoney(i.unitPrice)
      : roundMoney(q > 0 ? price / q : price)
  return {
    id: i.id,
    name: i.name,
    price,
    quantity: q,
    unitPrice,
  }
}

export type CreateSettlementRequest = {
  name: string
  items: SettlementItemWire[]
}

export type SettlementResponse = {
  id: string
  name: string
  items: SettlementItemWire[]
  users: { id: string; name: string }[]
  assignments: Record<string, string[]>
}

export type SettlementSummaryLine = { name: string; price: number; quantity?: number }

export type SettlementSummaryPerson = {
  id: string
  name: string
  isOwner: boolean
  items: SettlementSummaryLine[]
}

export type SettlementSummaryPayload = {
  venueName: string
  people: SettlementSummaryPerson[]
  grandTotal: number
}
