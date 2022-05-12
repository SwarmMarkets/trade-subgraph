import { getValueByNetwork, ValueByNetwork } from '../utils/getValueByNetwork'

/**
 * @description Disabled tokens for all networks:
 *
 * | symbol  | network |                   token                    |                  xToken
 * |:-------:|:-------:|:------------------------------------------:|:------------------------------------------:|
 * | SPT     |mainnet  | 0x8c4167154accd56797d122d8bcaad3a9432ed4af | 0xdde53eff3632ed4820c41ffe66cd32a42aba3899 | WBTC & DAI pool
 * |         |         |                                            | 0x71b3c05afc180e528529e0c026501e606118894c |
 * | SOL     |matic    | 0x7dff46370e9ea5f0bad3c4e29711ad50062ea7a4 | 0x6d1ba6cf6598ff904a30b5cb2ab946513d3d59fc |
 *
 */

let tokensByNetwork: ValueByNetwork<Array<string>> = {
  mainnet: ['0x8c4167154accd56797d122d8bcaad3a9432ed4af'],
  rinkeby: [],
  matic: ['0x7dff46370e9ea5f0bad3c4e29711ad50062ea7a4'],
  mumbai: [],
}

let xTokensByNetwork: ValueByNetwork<Array<string>> = {
  mainnet: [
    '0xdde53eff3632ed4820c41ffe66cd32a42aba3899',
    '0x71b3c05afc180e528529e0c026501e606118894c',
  ],
  rinkeby: [],
  matic: ['0x6d1ba6cf6598ff904a30b5cb2ab946513d3d59fc'],
  mumbai: [],
}

export let disabledTokens = getValueByNetwork<Array<string>>(
  tokensByNetwork,
  [],
)
export let disabledXTokens = getValueByNetwork<Array<string>>(
  xTokensByNetwork,
  [],
)
