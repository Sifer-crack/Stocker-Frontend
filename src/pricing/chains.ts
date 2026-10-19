import type { MatchView } from './types.ts'

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

export function chainLabel(chainId: string): string {
  return CHAINS.find((chain) => chain.id === chainId.toUpperCase())?.label ?? chainId
}

export function cheapestMatch(matches: readonly MatchView[]): MatchView | null {
  let best: MatchView | null = null
  for (const match of matches) {
    if (best === null || match.priceAmount < best.priceAmount) best = match
  }
  return best
}
