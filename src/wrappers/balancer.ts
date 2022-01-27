import { log } from '@graphprotocol/graph-ts/index'
import { Balancer as SchematicBalancer } from '../types/schema'

export class Balancer extends SchematicBalancer {
  static safeLoad(id: string): Balancer {
    let factory = SchematicBalancer.load(id)
    if (factory == null) {
      log.error('Factory not found', [id])
      throw new Error('Factory not found')
    }

    return factory as Balancer
  }
}
