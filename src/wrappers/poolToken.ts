import { log } from '@graphprotocol/graph-ts/index'
import { PoolToken as SchematicPoolToken } from '../types/schema'

export class PoolToken extends SchematicPoolToken {
  static safeLoad(id: string): PoolToken {
    let poolToken = SchematicPoolToken.load(id)
    if (poolToken == null) {
      log.error('PoolToken not found', [id])
      throw new Error('PoolToken not found')
    }

    return poolToken as PoolToken
  }
}
