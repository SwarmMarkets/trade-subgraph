import { log } from '@graphprotocol/graph-ts/index'
import { ZERO_BD } from '../constants/math'
import { TokenPrice as SchematicTokenPrice } from '../types/schema'
import { Token } from './token'

export class TokenPrice extends SchematicTokenPrice {
  static safeLoad(id: string): TokenPrice {
    let tokenPrice = SchematicTokenPrice.load(id)
    if (tokenPrice == null) {
      log.critical('TokenPrice not found: {}', [id])
      throw new Error('TokenPrice not found!')
    }

    return tokenPrice as TokenPrice
  }

  static loadOrCreate(id: string): TokenPrice {
    let tokenPrice = SchematicTokenPrice.load(id)
    if (tokenPrice == null) {
      tokenPrice = new TokenPrice(id)
      let token = Token.safeLoad(id)
      tokenPrice.symbol = token.symbol
      tokenPrice.name = token.name
      tokenPrice.decimals = token.decimals
      tokenPrice.price = ZERO_BD
      tokenPrice.save()
    }
    return tokenPrice as TokenPrice
  }
}
