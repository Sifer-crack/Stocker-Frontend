export interface ChainInfo {
  /** Matches the backend's ChainId enum. */
  id: string
  label: string
}

/** The chains the price engine covers, in display order. */
export const CHAINS: readonly ChainInfo[] = [
  { id: 'NEWWORLD', label: 'New World' },
  { id: 'PAKNSAVE', label: "PAK'nSAVE" },
  { id: 'WOOLWORTHS', label: 'Woolworths' },
]

/**
 * Chain ids differ in case between endpoints (/match is UPPER case; compare, shopping items and favorites are
 * lower case) and the compare endpoint matches `selectedChainId` case-sensitively. Compare chains with this.
 */
export function normChain(chainId: string): string {
  return chainId.trim().toLowerCase()
}

export function chainLabel(chainId: string): string {
  return CHAINS.find((chain) => normChain(chain.id) === normChain(chainId))?.label ?? chainId
}
