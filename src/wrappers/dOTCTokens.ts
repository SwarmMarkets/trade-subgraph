import { Address, log } from '@graphprotocol/graph-ts'
import { DEFAULT_DECIMALS } from '../constants/common'
import { ERC1155 } from '../types/dOTCListedTokens/ERC1155'
import { ERC20 } from '../types/dOTCListedTokens/ERC20'
import {
  ERC1155Token as SchematicERC1155Token,
  ERC20Token as SchematicERC20Token,
} from '../types/schema'
import { Token } from './token'

export class ERC20Token extends SchematicERC20Token {
  static safeLoad(id: string): ERC20Token {
    let erc20token = ERC20Token.load(id)
    if (erc20token == null) {
      log.critical('ERC20Token not found: {}', [id])
      throw new Error('ERC20Token not found!')
    }

    return erc20token as ERC20Token
  }

  static loadOrCreate(id: string): ERC20Token {
    let erc20Token = ERC20Token.load(id)

    if (erc20Token == null) {
      erc20Token = new ERC20Token(id)

      let token = Token.load(id)
      if (token == null) {
        let erc20Address = Address.fromString(id)
        let erc20 = ERC20.bind(erc20Address)

        let tokenDecimals = erc20.try_decimals()
        let tokenName = erc20.try_name()
        let tokenSymbol = erc20.try_symbol()

        erc20Token.decimals = !tokenDecimals.reverted
          ? tokenDecimals.value
          : DEFAULT_DECIMALS
        erc20Token.name = !tokenName.reverted ? tokenName.value : ''
        erc20Token.symbol = !tokenSymbol.reverted ? tokenSymbol.value : ''
      } else {
        erc20Token.name = token.name
        erc20Token.symbol = token.symbol
        erc20Token.decimals = token.decimals
      }

      erc20Token.paused = false
      erc20Token.save()
    }

    return erc20Token as ERC20Token
  }
}

export class ERC1155Token extends SchematicERC1155Token {
  static safeLoad(id: string): ERC1155Token {
    let erc1155Token = ERC1155Token.load(id)
    if (erc1155Token == null) {
      log.critical('ERC1155Token not found: {}', [id])
      throw new Error('ERC1155Token not found!')
    }

    return erc1155Token as ERC20Token
  }

  static loadOrCreate(id: string): ERC1155Token {
    let erc1155Token = ERC1155Token.load(id)

    if (erc1155Token == null) {
      erc1155Token = new ERC1155Token(id)

      let erc1155Address = Address.fromString(id)
      let erc1155 = ERC1155.bind(erc1155Address)

      let tokenName = erc1155.try_name()
      let tokenSymbol = erc1155.try_symbol()

      erc1155Token.name = !tokenName.reverted ? tokenName.value : ''
      erc1155Token.symbol = !tokenSymbol.reverted ? tokenSymbol.value : ''

      erc1155Token.paused = false
      erc1155Token.save()
    }

    return erc1155Token as ERC1155Token
  }
}
