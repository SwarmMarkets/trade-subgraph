import { log } from '@graphprotocol/graph-ts/index'
import { XToken as SchematicXToken } from '../types/schema'

export class XToken extends SchematicXToken {
  static safeLoad(id: string): XToken {
    let xToken = SchematicXToken.load(id)
    if (xToken == null) {
      log.error('XToken not found', [id])
      throw new Error('XToken not found')
    }

    return xToken as XToken
  }
}
