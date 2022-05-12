import { disabledXTokens } from '../constants/disabled-tokens'

export function isXTokenDisabled(xTokenId: string): bool {
  return disabledXTokens.includes(xTokenId)
}
