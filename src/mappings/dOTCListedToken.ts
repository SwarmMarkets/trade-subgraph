import {
  RegisterERC20Token,
  RegisterERC1155Token,
} from './../types/dOTCListedTokens/TokenListManager'
import { ERC20Token, ERC1155token } from '../types/schema'
import { Token } from './../wrappers/token'

export function addNewERC20Token(event: RegisterERC20Token): void {
  let erc20Token = ERC20Token.load(event.transaction.index.toHex())
  if (erc20Token == null) {
    erc20Token = new ERC20Token(event.transaction.index.toHex())
  }
  let newToken = Token.safeLoad(event.params.token.toHexString())
  erc20Token.token = newToken.id
  erc20Token.save()
}

export function addNewERC1155Token(event: RegisterERC1155Token): void {
  let erc1155Token = ERC1155token.load(event.transaction.index.toHex())
  if (erc1155Token == null) {
    erc1155Token = new ERC1155token(event.transaction.index.toHex())
  }
  erc1155Token.token = event.params.token
  erc1155Token.save()
}
