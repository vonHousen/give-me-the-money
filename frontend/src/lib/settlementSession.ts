const PREFIX = 'gmtm:'

/** After creating a settlement, mark this browser as owner and store owner participant id. */
export function markSettlementOwnerSession(settlementId: string, ownerParticipantId: string): void {
  sessionStorage.setItem(`${PREFIX}owner:${settlementId}`, '1')
  sessionStorage.setItem(`${PREFIX}ownerParticipantId:${settlementId}`, ownerParticipantId)
  sessionStorage.setItem(`${PREFIX}participant:${settlementId}`, ownerParticipantId)
}

export function isSettlementOwnerSession(settlementId: string): boolean {
  return sessionStorage.getItem(`${PREFIX}owner:${settlementId}`) === '1'
}

export function getOwnerParticipantIdFromSession(settlementId: string): string | null {
  return sessionStorage.getItem(`${PREFIX}ownerParticipantId:${settlementId}`)
}

export function setParticipantSession(settlementId: string, participantId: string): void {
  sessionStorage.setItem(`${PREFIX}participant:${settlementId}`, participantId)
}

export function getParticipantIdFromSession(settlementId: string): string | null {
  return sessionStorage.getItem(`${PREFIX}participant:${settlementId}`)
}

export type ParticipantLabelContext = {
  viewerIsOwner: boolean
  viewerParticipantId: string | null
}

/** Owner sees themselves as "Me" on the host row; everyone else uses stored name. */
export function formatParticipantLabel(
  p: { id: string; name: string; isOwner: boolean },
  ctx: ParticipantLabelContext,
): string {
  if (p.isOwner && ctx.viewerIsOwner) {
    return 'Me'
  }
  return p.name
}

/** Summary rows: owner row shows "Me" for the owner viewer only. */
export function formatSummaryPersonLabel(
  p: { name: string; isOwner: boolean },
  ctx: ParticipantLabelContext,
): string {
  if (p.isOwner && ctx.viewerIsOwner) {
    return 'Me'
  }
  return p.name
}
