import { disabledTokens } from '../constants/disabled-tokens'

export function isTokenDisabled(tokenId: string): bool {
  return disabledTokens.includes(tokenId)
}
