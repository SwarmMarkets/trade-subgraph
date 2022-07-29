import { Address, BigInt, Bytes, store } from '@graphprotocol/graph-ts'
import { DEFAULT_DECIMALS } from '../constants/common'
import {
  ConfigurableRightsPool,
  OwnershipTransferred,
} from '../types/Factory/ConfigurableRightsPool'
import {
  Pool,
  PoolToken,
  XToken,
  Balancer,
  Token,
  TokenPrice,
} from '../wrappers'
import { Swap } from '../types/schema'
import {
  GulpCall,
  LOG_CALL,
  LOG_EXIT,
  LOG_JOIN,
  LOG_SWAP,
  Pool as BPool,
} from '../types/templates/Pool/Pool'
import { User } from '../wrappers/user'
import {
  bigIntToDecimal,
  createPoolTokenEntity,
  decrPoolCount,
  getCrpUnderlyingPool,
  hexToDecimal,
  tokenToDecimal,
  updatePoolLiquidity,
} from './helpers'
import { BI_1, ZERO_BD } from '../constants/math'
import { SwapOperation } from '../wrappers/swapOperation'
import { Transaction } from '../wrappers/transaction'

/************************************
 ********** Pool Controls ***********
 ************************************/

export function handleSetSwapFee(event: LOG_CALL): void {
  let poolId = event.address.toHex()
  let pool = Pool.safeLoad(poolId)
  pool.swapFee = hexToDecimal(
    event.params.data.toHexString().slice(-40),
    DEFAULT_DECIMALS,
  )
  pool.save()
}

export function handleSetController(event: LOG_CALL): void {
  let poolId = event.address.toHex()
  let pool = Pool.safeLoad(poolId)

  let controller = Address.fromString(
    event.params.data.toHexString().slice(-40),
  )
  pool.controller = controller
  pool.save()
}

export function handleSetCrpController(event: OwnershipTransferred): void {
  // This event occurs on the CRP contract rather than the underlying pool so we must perform a lookup.
  let crp = ConfigurableRightsPool.bind(event.address)
  if (crp == null) return

  let underlyingPool = getCrpUnderlyingPool(crp)
  if (underlyingPool == null) return

  let pool = Pool.safeLoad(underlyingPool)
  pool.crpController = event.params.newOwner
  pool.save()

  // We overwrite event address so that ownership transfers can be linked to Pool entities for above reason.
  event.address = Address.fromString(pool.id)
}

export function handleSetPublicSwap(event: LOG_CALL): void {
  let poolId = event.address.toHex()
  let pool = Pool.safeLoad(poolId)
  pool.publicSwap = event.params.data.toHexString().slice(-1) == '1'
  pool.save()
}

export function handleFinalize(event: LOG_CALL): void {
  let poolId = event.address.toHex()
  let pool = Pool.safeLoad(poolId)
  // let balance = BigDecimal.fromString('100')
  pool.finalized = true
  pool.symbol = 'SPT'
  pool.publicSwap = true
  // pool.totalShares = balance
  pool.save()

  /*
  let poolShareId = poolId.concat('-').concat(event.params.caller.toHex())
  let poolShare = PoolShare.load(poolShareId)
  if (poolShare == null) {
    createPoolShareEntity(poolShareId, poolId, event.params.caller.toHex())
    poolShare = PoolShare.load(poolShareId)
  }
  poolShare.balance = balance
  poolShare.save()
  */

  let factory = Balancer.safeLoad('1')
  factory.finalizedPoolCount = factory.finalizedPoolCount + 1
  if (pool.crp) factory.privateCount = factory.privateCount + 1
  factory.save()
}

export function handleRebind(event: LOG_CALL): void {
  let poolId = event.address.toHex()
  let pool = Pool.safeLoad(poolId)

  // xToken to rebind
  let targetXToken = Bytes.fromHexString(
    event.params.data.toHexString().slice(34, 74),
  ) as Bytes

  let tokensList = pool.tokensList || []
  if (tokensList.indexOf(targetXToken) == -1) {
    tokensList.push(targetXToken)
  }
  pool.tokensList = tokensList
  pool.tokensCount = BigInt.fromI32(tokensList.length)

  // new denorm weight
  let newDenormWeight = hexToDecimal(
    event.params.data.toHexString().slice(138),
    DEFAULT_DECIMALS,
  )

  let poolTokenId = poolId.concat('-').concat(targetXToken.toHexString())
  let poolToken = PoolToken.load(poolTokenId)

  if (poolToken == null) {
    createPoolTokenEntity(poolTokenId, poolId, targetXToken.toHexString())
    poolToken = PoolToken.safeLoad(poolTokenId)
    pool.totalWeight = pool.totalWeight.plus(newDenormWeight)
  } else {
    let oldWeight = poolToken.denormWeight
    pool.totalWeight = pool.totalWeight.minus(oldWeight).plus(newDenormWeight)
  }

  let balance = hexToDecimal(
    event.params.data.toHexString().slice(74, 138),
    poolToken.decimals,
  )

  poolToken.balance = balance
  poolToken.denormWeight = newDenormWeight
  poolToken.save()

  if (balance.equals(ZERO_BD)) {
    decrPoolCount(pool.active, pool.finalized, pool.crp)
    pool.active = false
  }

  pool.save()

  updatePoolLiquidity(poolId)
}

export function handleUnbind(event: LOG_CALL): void {
  let poolId = event.address.toHex()
  let pool = Pool.safeLoad(poolId)
  let tokenBytes = Bytes.fromHexString(
    event.params.data.toHexString().slice(-40),
  ) as Bytes
  let tokensList = pool.tokensList || []
  let index = tokensList.indexOf(tokenBytes)
  tokensList.splice(index, 1)
  pool.tokensList = tokensList
  pool.tokensCount = BigInt.fromI32(tokensList.length)

  let address = Address.fromString(event.params.data.toHexString().slice(-40))
  let poolTokenId = poolId.concat('-').concat(address.toHexString())
  let poolToken = PoolToken.safeLoad(poolTokenId)
  pool.totalWeight = pool.totalWeight.minus(poolToken.denormWeight)
  pool.save()
  store.remove('PoolToken', poolTokenId)

  updatePoolLiquidity(poolId)
}

export function handleGulp(call: GulpCall): void {
  let poolId = call.to.toHexString()
  // let pool = Pool.load(poolId)

  let address = call.inputs.token.toHexString()

  let bpool = BPool.bind(Address.fromString(poolId))
  let balanceCall = bpool.try_getBalance(Address.fromString(address))

  let poolTokenId = poolId.concat('-').concat(address)
  let poolToken = PoolToken.safeLoad(poolTokenId)

  let balance = ZERO_BD
  if (!balanceCall.reverted) {
    balance = bigIntToDecimal(balanceCall.value, poolToken.decimals)
  }
  poolToken.balance = balance
  poolToken.save()

  updatePoolLiquidity(poolId)
}

/************************************
 ********** JOINS & EXITS ***********
 ************************************/

export function handleJoinPool(event: LOG_JOIN): void {
  let poolId = event.address.toHex()
  let pool = Pool.safeLoad(poolId)

  pool.joinsCount = pool.joinsCount.plus(BI_1)
  pool.save()

  let address = event.params.tokenIn.toHex()
  let poolTokenId = poolId.concat('-').concat(address.toString())
  let poolToken = PoolToken.safeLoad(poolTokenId)

  let tokenAmountIn = tokenToDecimal(
    event.params.tokenAmountIn.toBigDecimal(),
    poolToken.decimals,
  )

  poolToken.balance = poolToken.balance.plus(tokenAmountIn)
  poolToken.save()

  updatePoolLiquidity(poolId)

  User.loadOrCreate(event.transaction.from.toHex())
  Transaction.loadOrCreateJoinPool(event)
}

export function handleExitPool(event: LOG_EXIT): void {
  let poolId = event.address.toHex()

  let address = event.params.tokenOut.toHex()
  let poolTokenId = poolId.concat('-').concat(address.toString())
  let poolToken = PoolToken.safeLoad(poolTokenId)
  let tokenAmountOut = tokenToDecimal(
    event.params.tokenAmountOut.toBigDecimal(),
    poolToken.decimals,
  )
  let newAmount = poolToken.balance.minus(tokenAmountOut)
  poolToken.balance = newAmount
  poolToken.save()

  let pool = Pool.safeLoad(poolId)
  pool.exitsCount = pool.exitsCount.plus(BI_1)
  if (newAmount.equals(ZERO_BD)) {
    decrPoolCount(pool.active, pool.finalized, pool.crp)
    pool.active = false
  }
  pool.save()

  updatePoolLiquidity(poolId)

  User.loadOrCreate(event.transaction.from.toHex())
  Transaction.loadOrCreateExitPool(event)
}

/************************************
 ************** SWAPS ***************
 ************************************/

export function handleSwap(event: LOG_SWAP): void {
  let poolId = event.address.toHex()

  // Update poolTokenIn balance
  let xTokenIn = event.params.tokenIn.toHex()
  let tokenIn = XToken.safeLoad(xTokenIn).token
  let poolTokenInId = poolId.concat('-').concat(xTokenIn.toString())
  let poolTokenIn = PoolToken.safeLoad(poolTokenInId)
  let tokenAmountIn = tokenToDecimal(
    event.params.tokenAmountIn.toBigDecimal(),
    poolTokenIn.decimals,
  )
  let newAmountIn = poolTokenIn.balance.plus(tokenAmountIn)
  poolTokenIn.balance = newAmountIn
  poolTokenIn.save()

  // Update poolTokenOut balance
  let xTokenOut = event.params.tokenOut.toHex()
  let tokenOut = XToken.safeLoad(xTokenOut).token
  let poolTokenOutId = poolId.concat('-').concat(xTokenOut.toString())
  let poolTokenOut = PoolToken.safeLoad(poolTokenOutId)
  let tokenAmountOut = tokenToDecimal(
    event.params.tokenAmountOut.toBigDecimal(),
    poolTokenOut.decimals,
  )
  let newAmountOut = poolTokenOut.balance.minus(tokenAmountOut)
  poolTokenOut.balance = newAmountOut
  poolTokenOut.save()

  updatePoolLiquidity(poolId)

  let swapId = event.transaction.hash
    .toHexString()
    .concat('-')
    .concat(event.logIndex.toString())
  let swap = Swap.load(swapId)
  if (swap == null) {
    swap = new Swap(swapId)
  }

  let pool = Pool.safeLoad(poolId)
  let tokenOutPrice = TokenPrice.safeLoad(tokenOut).price

  let swapValue = ZERO_BD
  let swapFeeValue = ZERO_BD
  let totalSwapVolume = pool.totalSwapVolume
  let totalSwapFee = pool.totalSwapFee
  let factory = Balancer.safeLoad('1')

  if (tokenOutPrice.gt(ZERO_BD)) {
    swapValue = tokenOutPrice.times(tokenAmountOut)
    swapFeeValue = swapValue.times(pool.swapFee)
    totalSwapVolume = totalSwapVolume.plus(swapValue)
    totalSwapFee = totalSwapFee.plus(swapFeeValue)

    factory.totalSwapVolume = factory.totalSwapVolume.plus(swapValue)
    factory.totalSwapFee = factory.totalSwapFee.plus(swapFeeValue)

    pool.totalSwapVolume = totalSwapVolume
    pool.totalSwapFee = totalSwapFee
  }

  pool.swapsCount = pool.swapsCount.plus(BI_1)
  factory.txCount = factory.txCount.plus(BI_1)
  factory.save()

  if (newAmountIn.equals(ZERO_BD) || newAmountOut.equals(ZERO_BD)) {
    decrPoolCount(pool.active, pool.finalized, pool.crp)
    pool.active = false
  }
  pool.save()

  swap.caller = event.params.caller
  swap.tokenIn = event.params.tokenIn
  swap.tokenInSym = Token.safeLoad(tokenIn).symbol
  swap.tokenOut = event.params.tokenOut
  swap.tokenOutSym = Token.safeLoad(tokenOut).symbol
  swap.tokenAmountIn = tokenAmountIn
  swap.tokenAmountOut = tokenAmountOut
  swap.poolAddress = poolId
  swap.userAddress = event.transaction.from.toHex()
  swap.poolTotalSwapVolume = totalSwapVolume
  swap.poolTotalSwapFee = totalSwapFee
  swap.poolLiquidity = pool.liquidity
  swap.value = swapValue
  swap.feeValue = swapFeeValue
  swap.timestamp = event.block.timestamp.toI32()

  let swapOperation = SwapOperation.loadOrCreate(event.transaction.hash.toHex())

  swap.swapOperation = swapOperation.id
  swap.save()

  swapOperation.addPartialSwap(swap as Swap)
  swapOperation.save()

  User.loadOrCreate(swap.userAddress)
  Transaction.updateOrCreateSwapTx(event)
}
