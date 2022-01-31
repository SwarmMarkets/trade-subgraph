import { getValueByNetwork, ValueByNetwork } from '../utils/getValueByNetwork'

let SPTsByNetwork: ValueByNetwork<Array<string>> = {
  mainnet: ['0x8c4167154accd56797d122d8bcaad3a9432ed4af'],
  rinkeby: [],
  matic: [],
  mumbai: [],
}

let xSPTsByNetwork: ValueByNetwork<Array<string>> = {
  mainnet: [
    '0xdde53eff3632ed4820c41ffe66cd32a42aba3899',
    '0x71b3c05afc180e528529e0c026501e606118894c',
  ],
  rinkeby: [],
  matic: [],
  mumbai: [],
}

export let SPTs = getValueByNetwork<Array<string>>(SPTsByNetwork, [])
export let xSPTs = getValueByNetwork<Array<string>>(xSPTsByNetwork, [])