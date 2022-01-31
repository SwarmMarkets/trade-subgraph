import { dataSource } from '@graphprotocol/graph-ts/index'

export class ValueByNetwork<TValue> {
  public mainnet: TValue
  public rinkeby: TValue
  public matic: TValue
  public mumbai: TValue
}

export function getValueByNetwork<TValue>(
  map: ValueByNetwork<TValue>,
  defaultValue: TValue,
): TValue {
  let network = dataSource.network()
  if (network == 'mainnet') return map.mainnet
  else if (network == 'rinkeby') return map.rinkeby
  else if (network == 'matic') return map.matic
  else if (network == 'mumbai') return map.mumbai
  else return defaultValue
}
