import { ERC20Token, ERC1155Token } from '../wrappers/dOTCTokens'
import {
  RegisterERC1155Token,
  RegisterERC20Token,
  unRegisterERC1155,
  unRegisterERC20,
} from './../types/dOTCListedTokens/TokenListManager'

export function registerERC20Token(event: RegisterERC20Token): void {
  let tokenId = event.params.token.toHexString()
  let erc20Token = ERC20Token.loadOrCreate(tokenId)

  if (!!erc20Token && erc20Token.paused) {
    erc20Token.paused = false
    erc20Token.save()
  }
}

export function registerERC1155Token(event: RegisterERC1155Token): void {
  let erc1155TokenId = event.params.token.toHexString()
  let erc1155Token = ERC1155Token.loadOrCreate(erc1155TokenId)

  if (!!erc1155Token && erc1155Token.paused) {
    erc1155Token.paused = false
    erc1155Token.save()
  }
}

export function unregisterERC20Token(event: unRegisterERC20): void {
  let erc20Token = ERC20Token.load(event.params.token.toHexString())
  if (erc20Token !== null) {
    erc20Token.paused = true
    erc20Token.save()
  }
}

export function unregisterERC1155Token(event: unRegisterERC1155): void {
  let erc1155Token = ERC1155Token.load(event.params.token.toHexString())
  if (erc1155Token !== null) {
    erc1155Token.paused = true
    erc1155Token.save()
  }
}
