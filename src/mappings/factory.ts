import { Address, BigDecimal, BigInt, ByteArray } from '@graphprotocol/graph-ts'
import { SPTs as disabledSPTs } from '../disabled-tokens'
import { ConfigurableRightsPool } from '../types/Factory/ConfigurableRightsPool'
import { LOG_NEW_POOL } from '../types/Factory/Factory'
import { Balancer, CrpControllerPoolCount, Pool } from '../types/schema'
import {
  CrpController as CrpControllerContract,
  Pool as PoolContract,
} from '../types/templates'
import {
  getCrpCap,
  getCrpController,
  getCrpName,
  getCrpRights,
  getCrpSymbol,
  isCrp,
  ZERO_BD,
} from './helpers'

export function handleNewPool(event: LOG_NEW_POOL): void {
  let factory = Balancer.load('1')

  // if no factory yet, set up blank initial
  if (factory == null) {
    factory = new Balancer('1')
    factory.color = 'Bronze'
    factory.poolCount = 0
    factory.finalizedPoolCount = 0
    factory.crpCount = 0
    factory.privateCount = 0
    factory.txCount = BigInt.fromI32(0)
    factory.totalLiquidity = ZERO_BD
    factory.totalSwapVolume = ZERO_BD
    factory.totalSwapFee = ZERO_BD
  }
  let poolId = event.params.pool.toHexString()

  // skip misconfigured pools
  if (disabledSPTs.includes(poolId)) {
    return
  }

  let pool = new Pool(poolId)
  pool.crp = isCrp(event.params.caller)
  pool.rights = []
  if (pool.crp) {
    factory.crpCount += 1
    let crp = ConfigurableRightsPool.bind(event.params.caller)
    pool.symbol = getCrpSymbol(crp)
    pool.name = getCrpName(crp)
    let controller = getCrpController(crp)
    pool.crpController = controller ? Address.fromString(controller) : null
    pool.rights = getCrpRights(crp)
    pool.cap = getCrpCap(crp)

    countCrpController((pool.crpController as ByteArray).toHexString())

    // Listen for any future crpController changes.
    CrpControllerContract.create(event.params.caller)
  }
  pool.controller = event.params.caller
  pool.publicSwap = false
  pool.finalized = false
  pool.active = true
  pool.swapFee = BigDecimal.fromString('0.000001')
  pool.totalWeight = ZERO_BD
  pool.totalShares = ZERO_BD
  pool.totalSwapVolume = ZERO_BD
  pool.totalSwapFee = ZERO_BD
  pool.liquidity = ZERO_BD
  pool.createTime = event.block.timestamp.toI32()
  pool.tokensCount = BigInt.fromI32(0)
  pool.holdersCount = BigInt.fromI32(0)
  pool.joinsCount = BigInt.fromI32(0)
  pool.exitsCount = BigInt.fromI32(0)
  pool.swapsCount = BigInt.fromI32(0)
  pool.factoryID = factory.id
  pool.tokensList = []
  pool.holders = []
  pool.tx = event.transaction.hash
  pool.save()

  factory.poolCount = factory.poolCount + 1
  factory.save()

  PoolContract.create(event.params.pool)
}

function countCrpController(crpController: string): void {
  let controllerCount = CrpControllerPoolCount.load(crpController)

  if (controllerCount == null) {
    controllerCount = new CrpControllerPoolCount(crpController)
    controllerCount.poolCount = 1
    controllerCount.factoryID = '1'
  } else {
    controllerCount.poolCount = controllerCount.poolCount + 1
  }

  controllerCount.save()
}
