import { Address, BigDecimal, BigInt, Bytes } from '@graphprotocol/graph-ts'
import { CRP_FACTORY } from '../constants/crp-factory'
import { DEFAULT_DECIMALS } from '../constants/common'
import { ConfigurableRightsPool } from '../types/Factory/ConfigurableRightsPool'
import { CRPFactory } from '../types/Factory/CRPFactory'
import { PoolShare } from '../types/schema'
import {
  Balancer,
  Pool,
  Token,
  PoolToken,
  XToken,
  TokenPrice,
} from '../wrappers'
import { BToken } from '../types/templates/Pool/BToken'
import { BTokenBytes } from '../types/templates/Pool/BTokenBytes'
import { GnosisSafe } from '../types/templates/XToken/GnosisSafe'
import { BD_2, BI_10, BI_2, ZERO_BD } from '../constants/math'
import { DAI, USDC } from '../constants/stablecoins'
import { User } from '../wrappers/user'

export function hexToDecimal(hexString: string, decimals: i32): BigDecimal {
  let bytes = Bytes.fromHexString(hexString).reverse() as Bytes
  let bi = BigInt.fromUnsignedBytes(bytes)
  let scale = BI_10.pow(decimals as u8).toBigDecimal()
  return bi.divDecimal(scale)
}

export function bigIntToDecimal(amount: BigInt, decimals: i32): BigDecimal {
  let scale = BI_10.pow(decimals as u8).toBigDecimal()
  return amount.toBigDecimal().div(scale)
}

export function tokenToDecimal(amount: BigDecimal, decimals: i32): BigDecimal {
  let scale = BI_10.pow(decimals as u8).toBigDecimal()
  return amount.div(scale)
}

export function createPoolShareEntity(
  id: string,
  pool: string,
  user: string,
): void {
  let poolShare = new PoolShare(id)

  let gnosisSafe = GnosisSafe.bind(Address.fromString(user))
  let getOwnersCall = gnosisSafe.try_getOwners()
  let userAddress = getOwnersCall.reverted
    ? 'CALCULATE_CPK'
    : getOwnersCall.value.pop().toHexString()

  User.loadOrCreate(user, userAddress)

  poolShare.userAddress = user
  poolShare.poolId = pool
  poolShare.balance = ZERO_BD
  poolShare.save()
}

export function createPoolTokenEntity(
  id: string,
  pool: string,
  address: string,
): void {
  let token = BToken.bind(Address.fromString(address))
  let tokenBytes = BTokenBytes.bind(Address.fromString(address))
  let symbol = ''
  let name = ''
  let decimals = DEFAULT_DECIMALS

  let symbolCall = token.try_symbol()
  let nameCall = token.try_name()
  let decimalCall = token.try_decimals()

  if (symbolCall.reverted) {
    let symbolBytesCall = tokenBytes.try_symbol()
    if (!symbolBytesCall.reverted) {
      symbol = symbolBytesCall.value.toString()
    }
  } else {
    symbol = symbolCall.value
  }

  if (nameCall.reverted) {
    let nameBytesCall = tokenBytes.try_name()
    if (!nameBytesCall.reverted) {
      name = nameBytesCall.value.toString()
    }
  } else {
    name = nameCall.value
  }

  if (!decimalCall.reverted) {
    decimals = decimalCall.value
  }

  let poolToken = new PoolToken(id)
  poolToken.poolId = pool
  poolToken.address = address
  poolToken.xToken = address
  poolToken.name = name
  poolToken.symbol = symbol
  poolToken.decimals = decimals
  poolToken.balance = ZERO_BD
  poolToken.denormWeight = ZERO_BD
  poolToken.save()
}

export function updatePoolLiquidity(poolId: string): void {
  let pool = Pool.safeLoad(poolId)
  let tokensList: Array<Bytes> = pool.tokensList

  if (pool.tokensCount.isZero()) {
    pool.liquidity = ZERO_BD
    pool.save()
    return
  }

  if (!tokensList || pool.tokensCount.lt(BI_2) || !pool.publicSwap) {
    return
  }

  // Find pool liquidity
  let computedLiquidity = ZERO_BD

  let DAIToken = Token.load(DAI)
  let DAIXTokenAddress = DAIToken ? DAIToken.xToken : ''
  let USDCToken = Token.load(USDC)
  let USDCXTokenAddress = USDCToken ? USDCToken.xToken : ''
  let anyXTokenAddress: string | null = null

  let DAIIsAComponent = false
  let USDCIsAComponent = false

  // Check if the pool contains USDC or DAI or any token with non-zero tokenPrice
  for (let i: i32 = 0; i < tokensList.length; i++) {
    if (tokensList[i].toHex() == USDCXTokenAddress) USDCIsAComponent = true
    if (tokensList[i].toHex() == DAIXTokenAddress) DAIIsAComponent = true
    else {
      let xTokenId = tokensList[i].toHexString()
      let tokenId = XToken.safeLoad(xTokenId).token
      let tokenPrice = TokenPrice.load(tokenId)
      if (tokenPrice != null && tokenPrice.price.gt(ZERO_BD)) {
        anyXTokenAddress = xTokenId
      }
    }
  }

  if (USDCIsAComponent) {
    let usdcPoolTokenId = poolId.concat('-').concat(USDCXTokenAddress)
    let usdcPoolToken = PoolToken.safeLoad(usdcPoolTokenId)
    computedLiquidity = usdcPoolToken.balance
      .div(usdcPoolToken.denormWeight)
      .times(pool.totalWeight)
  } else if (DAIIsAComponent) {
    let daiPoolTokenId = poolId.concat('-').concat(DAIXTokenAddress)
    let daiPoolToken = PoolToken.safeLoad(daiPoolTokenId)
    computedLiquidity = daiPoolToken.balance
      .div(daiPoolToken.denormWeight)
      .times(pool.totalWeight)
  } else if (anyXTokenAddress !== null) {
    let poolTokenId = poolId.concat('-').concat(anyXTokenAddress)
    let poolToken = PoolToken.safeLoad(poolTokenId)
    let tokenId = XToken.safeLoad(anyXTokenAddress).token
    let tokenPrice = TokenPrice.safeLoad(tokenId)
    computedLiquidity = tokenPrice.price
      .times(poolToken.balance)
      .div(poolToken.denormWeight)
      .times(pool.totalWeight)
  }

  // Create or update token price
  for (let i: i32 = 0; i < tokensList.length; i++) {
    let xTokenId = tokensList[i].toHexString()
    let tokenId = XToken.safeLoad(xTokenId).token
    let tokenPrice = TokenPrice.loadOrCreate(tokenId)

    let poolTokenId = poolId.concat('-').concat(xTokenId)
    let poolToken = PoolToken.safeLoad(poolTokenId)

    if (
      pool.active &&
      !pool.crp &&
      pool.publicSwap &&
      poolToken.balance.gt(ZERO_BD) &&
      computedLiquidity.gt(ZERO_BD)
    ) {
      let currentTokenPrice = computedLiquidity
        .div(pool.totalWeight)
        .times(poolToken.denormWeight)
        .div(poolToken.balance)

      tokenPrice.price = tokenPrice.price.equals(ZERO_BD)
        ? currentTokenPrice
        : tokenPrice.price.plus(currentTokenPrice).div(BD_2)

      tokenPrice.save()
    }
  }

  // Update pool liquidity

  let liquidity = ZERO_BD
  let denormWeight = ZERO_BD

  for (let i: i32 = 0; i < tokensList.length; i++) {
    let xTokenId = tokensList[i].toHexString()
    let tokenId = XToken.safeLoad(xTokenId).token
    let tokenPrice = TokenPrice.safeLoad(tokenId)

    let poolTokenId = poolId.concat('-').concat(xTokenId)
    let poolToken = PoolToken.safeLoad(poolTokenId)
    if (
      tokenPrice.price.gt(ZERO_BD) &&
      poolToken.denormWeight.gt(denormWeight)
    ) {
      denormWeight = poolToken.denormWeight
      liquidity = tokenPrice.price
        .times(poolToken.balance)
        .div(poolToken.denormWeight)
        .times(pool.totalWeight)
    }
  }

  let factory = Balancer.load('1')
  if (factory !== null) {
    factory.totalLiquidity = factory.totalLiquidity
      .minus(pool.liquidity)
      .plus(liquidity)
    factory.save()
  }

  pool.liquidity = liquidity
  pool.save()
}

export function decrPoolCount(
  active: boolean,
  finalized: boolean,
  crp: boolean,
): void {
  if (active) {
    let factory = Balancer.safeLoad('1')

    factory.poolCount = factory.poolCount - 1
    if (finalized) factory.finalizedPoolCount = factory.finalizedPoolCount - 1
    if (crp) factory.crpCount = factory.crpCount - 1
    factory.save()
  }
}

export function isCrp(address: Address): boolean {
  let crpFactory = CRPFactory.bind(Address.fromString(CRP_FACTORY))
  let isCrp = crpFactory.try_isCrp(address)
  if (isCrp.reverted) return false
  return isCrp.value
}

export function getCrpUnderlyingPool(
  crp: ConfigurableRightsPool,
): string | null {
  let bPool = crp.try_bPool()
  if (bPool.reverted) return null
  return bPool.value.toHexString()
}

export function getCrpController(crp: ConfigurableRightsPool): string | null {
  let controller = crp.try_getController()
  if (controller.reverted) return null
  return controller.value.toHexString()
}

export function getCrpSymbol(crp: ConfigurableRightsPool): string {
  let symbol = crp.try_symbol()
  if (symbol.reverted) return ''
  return symbol.value
}

export function getCrpName(crp: ConfigurableRightsPool): string {
  let name = crp.try_name()
  if (name.reverted) return ''
  return name.value
}

export function getCrpCap(crp: ConfigurableRightsPool): BigInt {
  let cap = crp.try_getCap()
  if (cap.reverted) return BigInt.fromI32(0)
  return cap.value
}

export function getCrpRights(crp: ConfigurableRightsPool): string[] {
  let rights = crp.try_rights()
  if (rights.reverted) return []
  let rightsArr: string[] = []
  if (rights.value.value0) rightsArr.push('canPauseSwapping')
  if (rights.value.value1) rightsArr.push('canChangeSwapFee')
  if (rights.value.value2) rightsArr.push('canChangeWeights')
  if (rights.value.value3) rightsArr.push('canAddRemoveTokens')
  if (rights.value.value4) rightsArr.push('canWhitelistLPs')
  if (rights.value.value5) rightsArr.push('canChangeCap')
  return rightsArr
}
