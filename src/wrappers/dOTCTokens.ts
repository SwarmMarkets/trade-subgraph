import { log } from '@graphprotocol/graph-ts'
import {
  ERC20Token as SchematicERC20Token,
  ERC1155Token as SchematicERC1155Token,
} from '../types/schema'

export class ERC20Token extends SchematicERC20Token {
  static safeLoad(id: string): ERC20Token {
    let erc20token = SchematicERC20Token.load(id)
    if (erc20token == null) {
      log.critical('ERC20Token not found: {}', [id])
      throw new Error('ERC20Token not found!')
    }

    return erc20token as ERC20Token
  }
}

export class ERC1155Token extends SchematicERC1155Token {
  static safeLoad(id: string): ERC1155Token {
    let erc1155Token = SchematicERC1155Token.load(id)
    if (erc1155Token == null) {
      log.critical('ERC1155Token not found: {}', [id])
      throw new Error('ERC1155Token not found!')
    }

    return erc1155Token as ERC20Token
  }
}
