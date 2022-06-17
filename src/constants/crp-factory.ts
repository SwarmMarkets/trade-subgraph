import { ZERO_ADDRESS } from '../constants/common'
import { getValueByNetwork, ValueByNetwork } from '../utils/getValueByNetwork'

let CrpFactoryByNetwork: ValueByNetwork<string> = {
  mainnet: '0xed52D8E202401645eDAD1c0AA21e872498ce47D0',
  rinkeby: '0xA3F9145CB0B50D907930840BB2dcfF4146df8Ab4',
  goerli: ZERO_ADDRESS,
  matic: ZERO_ADDRESS,
  mumbai: ZERO_ADDRESS,
}

export let CRP_FACTORY = getValueByNetwork<string>(
  CrpFactoryByNetwork,
  ZERO_ADDRESS,
)
