import { log } from '@graphprotocol/graph-ts'
import { Token as SchematicToken } from '../types/schema'

export class Token extends SchematicToken {
  static safeLoad(id: string): Token {
    let token = SchematicToken.load(id)
    if (token == null) {
      log.error('Token not found', [id])
      throw new Error('Token not found')
    }

    return token as Token
  }
}
