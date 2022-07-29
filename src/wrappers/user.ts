import { Address } from '@graphprotocol/graph-ts/index'
import { User as SchematicUser } from '../types/schema'
import { GnosisSafe } from '../types/templates/XToken/GnosisSafe'

export class User extends SchematicUser {
  static loadOrCreate(address: string): User {
    let user = User.load(address)

    if (user == null) {
      let user = new User(address)

      let gnosisSafe = GnosisSafe.bind(Address.fromString(address))
      let getOwnersCall = gnosisSafe.try_getOwners()
      let userAddress = getOwnersCall.reverted
        ? 'CALCULATE_CPK'
        : getOwnersCall.value.pop().toHexString()

      user.userAddress = userAddress
      user.isCpkId = address != userAddress
      user.save()
    }

    return user as User
  }
}
