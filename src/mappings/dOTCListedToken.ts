import { Address, store } from '@graphprotocol/graph-ts'
import { DEFAULT_DECIMALS } from '../constants/common'
import { ERC1155 } from '../types/dOTCListedTokens/ERC1155'
import { ERC20 } from '../types/dOTCListedTokens/ERC20'
import { ERC1155Token, ERC20Token } from '../types/schema'
import {
  RegisterERC1155Token,
  RegisterERC20Token,
  unRegisterERC1155,
  unRegisterERC20,
} from './../types/dOTCListedTokens/TokenListManager'
import { Token } from './../wrappers/token'

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
    let erc1155 = ERC1155.bind(Address.fromString(erc1155Token.id))
    let tokenName = erc1155.try_name()
    let tokenSymbol = erc1155.try_symbol()
    erc1155Token.name = !tokenName.reverted ? tokenName.value : ''
    erc1155Token.symbol = !tokenSymbol.reverted ? tokenSymbol.value : ''
  }
  erc1155Token.save()
}

export function unregisterERC20Token(event: unRegisterERC20): void {
  let erc20Token = ERC20Token.load(event.params.token.toHexString())
  if (erc20Token !== null) {
    store.remove('ERC20Token', erc20Token.id)
  }
}

export function unregisterERC1155Token(event: unRegisterERC1155): void {
  let erc1155Token = ERC1155Token.load(event.params.token.toHexString())
  if (erc1155Token !== null) {
    store.remove('ERC1155Token', erc1155Token.id)
  }
}
