import { ValueByNetwork, getValueByNetwork } from '../utils/getValueByNetwork'
import { ZERO_ADDRESS } from './common'

let USDCByNetwork: ValueByNetwork<string> = {
  mainnet: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  rinkeby: '0x775badfdcc4478ba25d55f076b781fd66cdaf408',
  goerli: '0xe791bc51d14b0507a622070d4edf4eaddeeaab6e',
  matic: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
  mumbai: '0x5fd6a096a23e95692e37ec7583011863a63214aa',
}

let DAIByNetwork: ValueByNetwork<string> = {
  mainnet: '0x6b175474e89094c44da98b954eedeac495271d0f',
  rinkeby: '0x98e06323f0008dd8990229c3ff299353b69491c0',
  goerli: '0xeae974165ddfcb8ffaf266594067563d02617bd1',
  matic: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
  mumbai: '0x40ff8ecf26b645bddde0ea55fc92ba9f9795d2ef',
}

export let USDC = getValueByNetwork<string>(USDCByNetwork, ZERO_ADDRESS)
export let DAI = getValueByNetwork<string>(DAIByNetwork, ZERO_ADDRESS)
