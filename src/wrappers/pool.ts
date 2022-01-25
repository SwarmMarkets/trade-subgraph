import { log } from '@graphprotocol/graph-ts/index'
import { Pool as SchematicPool } from '../types/schema'

export class Pool extends SchematicPool {
  static safeLoad(id: string): Pool {
    let pool = SchematicPool.load(id)
    if (pool == null) {
      log.error('Pool not found', [id])
      throw new Error('Pool not found')
    }

    return pool as Pool
  }
}
