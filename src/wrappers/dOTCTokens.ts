import { Address, log } from '@graphprotocol/graph-ts'
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

  static loadOrCreate(id: string): ERC20Token | null {
    let erc20Token = ERC20Token.load(id)

    // skip initialization if the erc20 is already registered once
    if (erc20Token == null) {
      erc20Token = new ERC20Token(id)

      // try to load the erc20 properties from the Token entity
      let token = Token.load(id)
      if (token !== null) {
        erc20Token.name = token.name
        erc20Token.symbol = token.symbol
        erc20Token.decimals = token.decimals
      } else {
        // if the erc20 was not registered on the trade platform
        // make some calls to the ERC20 contract
        let erc20Address = Address.fromString(id)
        let erc20 = ERC20.bind(erc20Address)

        let tokenDecimals = erc20.try_decimals()
        let tokenName = erc20.try_name()
        let tokenSymbol = erc20.try_symbol()

        if (
          !tokenDecimals.reverted &&
          !tokenName.reverted &&
          !tokenSymbol.reverted
        ) {
          erc20Token.decimals = tokenDecimals.value
          erc20Token.name = tokenName.value
          erc20Token.symbol = tokenSymbol.value
        } else {
          // if some of the erc20 calls failed it means
          // that the contract is missing decimals or name or symbol
          log.warning('Someone tried to register non-erc20 contract {}', [id])
          return null
        }
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

  static loadOrCreate(id: string): ERC1155Token | null {
    let erc1155Token = ERC1155Token.load(id)

    if (erc1155Token == null) {
      erc1155Token = new ERC1155Token(id)

      let erc1155Address = Address.fromString(id)
      let erc1155 = ERC1155.bind(erc1155Address)

      let tokenName = erc1155.try_name()
      let tokenSymbol = erc1155.try_symbol()

      if (!tokenName.reverted && !tokenSymbol.reverted) {
        erc1155Token.name = tokenName.value
        erc1155Token.symbol = tokenSymbol.value
      } else {
        // if some of the erc1155 calls failed it means
        // that the contract is missing name or symbol
        log.warning('Someone tried to register non-erc1155 contract {}', [id])
        return null
      }

      erc1155Token.paused = false
      erc1155Token.save()
    }

    return erc1155Token as ERC1155Token
  }
}
