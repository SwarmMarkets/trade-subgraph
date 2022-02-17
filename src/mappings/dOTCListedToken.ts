import { DEFAULT_DECIMALS } from '../constants/common'
import { ERC20 } from '../types/dOTCListedTokens/ERC20'
import {
  RegisterERC20Token,
  RegisterERC1155Token,
} from './../types/dOTCListedTokens/TokenListManager'
import { ERC20Token, ERC1155Token } from '../types/schema'
import { Token } from './../wrappers/token'
import { Address } from '@graphprotocol/graph-ts'

export function addNewERC20Token(event: RegisterERC20Token): void {
  let erc20Token = ERC20Token.load(event.params.token.toHexString())
  if (erc20Token == null) {
    erc20Token = new ERC20Token(event.params.token.toHexString())
  }

  let newToken = Token.load(event.params.token.toHexString())
  if (newToken == null) {
    let erc20 = ERC20.bind(Address.fromString(erc20Token.id))
    let tokenDecimals = erc20.try_decimals()
    let tokenName = erc20.try_name()
    let tokenSymbol = erc20.try_symbol()
    erc20Token.decimals = !tokenDecimals.reverted
      ? tokenDecimals.value
      : DEFAULT_DECIMALS
    erc20Token.name = !tokenName.reverted ? tokenName.value : ''
    erc20Token.symbol = !tokenSymbol.reverted ? tokenSymbol.value : ''
  } else {
    erc20Token.name = newToken.name
    erc20Token.symbol = newToken.symbol
    erc20Token.decimals = newToken.decimals
  }

  erc20Token.save()
}

export function addNewERC1155Token(event: RegisterERC1155Token): void {
  let erc1155Token = ERC1155Token.load(event.params.token.toHexString())
  if (erc1155Token == null) {
    erc1155Token = new ERC1155Token(event.params.token.toHexString())
  }
  erc1155Token.token = event.params.token
  erc1155Token.save()
}
