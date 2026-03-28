export type SettlementItemWire = {
  id: string
  name: string
  price: number
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

export type SettlementSummaryLine = { name: string; price: number }

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
