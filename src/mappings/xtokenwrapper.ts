import { log } from '@graphprotocol/graph-ts'
import { isTokenDisabled } from '../utils/isTokenDisabled'
import { isXTokenDisabled } from '../utils/isXTokenDisabled'
import { ZERO_BD } from '../constants/math'
import { DEFAULT_DECIMALS } from '../constants/common'
import { Token, XToken } from '../types/schema'
import { XToken as XTokenAbi } from '../types/templates'
import { ERC20 } from '../types/XTokenWrapper/ERC20'
import { RegisterToken } from '../types/XTokenWrapper/XTokenWrapper'

export function handleRegisterToken(event: RegisterToken): void {
  let tokenIdAddress = event.params.token
  let xTokenIdAddress = event.params.xToken
  let tokenId = tokenIdAddress.toHex()
  let xTokenId = xTokenIdAddress.toHex()
  log.debug('calling handleRegisterToken for token:{} and xtoken: {}', [
    tokenId,
    xTokenId,
  ])

  // skip misconfigured pools and tokens
  if (isTokenDisabled(tokenId) || isXTokenDisabled(xTokenId)) {
    return
  }

  let token = Token.load(tokenId)
  let xToken = XToken.load(xTokenId)

  if (token == null) {
    token = new Token(tokenId)
    let erc20Token = ERC20.bind(tokenIdAddress)
    let tokenDecimals = erc20Token.try_decimals()
    let tokenName = erc20Token.try_name()
    let tokenSymbol = erc20Token.try_symbol()
    token.decimals = !tokenDecimals.reverted
      ? tokenDecimals.value
      : DEFAULT_DECIMALS
    token.name = !tokenName.reverted ? tokenName.value : ''
    token.symbol = !tokenSymbol.reverted ? tokenSymbol.value : ''
    token.tvl = ZERO_BD
    token.paused = false
  }

  if (xToken == null) {
    xToken = new XToken(xTokenId)
    let erc20Token = ERC20.bind(xTokenIdAddress)
    let tokenDecimals = erc20Token.try_decimals()
    let tokenName = erc20Token.try_name()
    let tokenSymbol = erc20Token.try_symbol()
    xToken.decimals = !tokenDecimals.reverted
      ? tokenDecimals.value
      : DEFAULT_DECIMALS
    xToken.name = !tokenName.reverted ? tokenName.value : ''
    xToken.symbol = !tokenSymbol.reverted ? tokenSymbol.value : ''
    xToken.paused = false
  }

  xToken.token = tokenId
  token.xToken = xTokenId
  XTokenAbi.create(xTokenIdAddress)

  token.save()
  xToken.save()
}
