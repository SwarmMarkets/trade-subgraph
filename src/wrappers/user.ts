import { User as SchematicUser } from '../types/schema'

export class User extends SchematicUser {
  static loadOrCreate(address: string, cpkAddress: string): User {
    let user = User.load(address)

    if (user == null) {
      let user = new User(address)
      user.userAddress = address
      user.isCpkId = address != cpkAddress
      user.save()
    }

    return user as User
  }
}
