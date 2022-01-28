import {
  Address,
  BigDecimal,
  BigInt,
  Bytes,
  dataSource,
  ethereum,
} from '@graphprotocol/graph-ts'
import { DEFAULT_DECIMALS } from '../constants'
import { ConfigurableRightsPool } from '../types/Factory/ConfigurableRightsPool'
import { CRPFactory } from '../types/Factory/CRPFactory'
import { PoolShare, TokenPrice, Transaction, User } from '../types/schema'
import { Balancer, Pool, Token, PoolToken, XToken } from '../wrappers'
import { BToken } from '../types/templates/Pool/BToken'
import { BTokenBytes } from '../types/templates/Pool/BTokenBytes'
import { GnosisSafe } from '../types/templates/XToken/GnosisSafe'
import { BD_2, BI_10, BI_2, ZERO_BI, ZERO_BD } from '../constants/math'

let network = dataSource.network()

// Config for mainnet
let WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
let WBTC = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
let DAI = '0x6b175474e89094c44da98b954eedeac495271d0f'
let CRP_FACTORY = '0xed52D8E202401645eDAD1c0AA21e872498ce47D0'

if (network == 'rinkeby') {
  WETH = '0xc778417e063141139fce010982780140aa0cd5ab'
  WBTC = '0x2370694665fecc03c86693e9a03b6874e9321372'
  DAI = '0x98e06323f0008dd8990229c3ff299353b69491c0'
  CRP_FACTORY = '0xA3F9145CB0B50D907930840BB2dcfF4146df8Ab4'
}

if (network == 'matic') {
  WETH = '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'
  WBTC = '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6'
  DAI = '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063'
}

if (network == 'mumbai') {
  WETH = '0x10d74c806604a074b48388c92e6de0bd211842de'
  WBTC = '0x37d45f6f8fe9e326654115eabf6214031345bbd2'
  DAI = '0x40ff8ecf26b645bddde0ea55fc92ba9f9795d2ef'
}

export function hexToDecimal(hexString: string, decimals: i32): BigDecimal {
  let bytes = Bytes.fromHexString(hexString).reverse() as Bytes
  let bi = BigInt.fromUnsignedBytes(bytes)
  let scale = BigInt.fromI32(10)
    .pow(decimals as u8)
    .toBigDecimal()
  return bi.divDecimal(scale)
}

export function bigIntToDecimal(amount: BigInt, decimals: i32): BigDecimal {
  let scale = BigInt.fromI32(10)
    .pow(decimals as u8)
    .toBigDecimal()
  return amount.toBigDecimal().div(scale)
}

export function tokenToDecimal(amount: BigDecimal, decimals: i32): BigDecimal {
  let scale = BigInt.fromI32(10)
    .pow(decimals as u8)
    .toBigDecimal()
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
  createUserEntity(user, userAddress)

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
  let decimals = 18

  // COMMENT THE LINES BELOW OUT FOR LOCAL DEV ON KOVAN

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

export function updatePoolLiquidity(id: string): void {
  let pool = Pool.safeLoad(id)
  let tokensList: Array<Bytes> = pool.tokensList

  if (pool.tokensCount.equals(BigInt.fromI32(0))) {
    pool.liquidity = ZERO_BD
    pool.save()
    return
  }

  if (!tokensList || pool.tokensCount.lt(BigInt.fromI32(2)) || !pool.publicSwap)
    return

  // Find pool liquidity

  let poolLiquidity = ZERO_BD
  let DAIToken = Token.safeLoad(DAI)
  let DAIXTokenAddress = DAIToken.xToken
  let WETHToken = Token.safeLoad(WETH)
  let WETHXTokenAddress = WETHToken.xToken
  let WBTCToken = Token.safeLoad(WBTC)
  let WBTCXTokenAddress = WBTCToken.xToken

  let DAIIsAComponent = false
  let WBTCIsAComponent = false
  let WETHIsAComponent = false
  let WBTCTokenPrice = TokenPrice.load(WBTC)
  let WETHTokenPrice = TokenPrice.load(WETH)

  for (let i: i32 = 0; i < tokensList.length; i++) {
    if (tokensList[i].toHex() == DAIXTokenAddress) DAIIsAComponent = true
    if (tokensList[i].toHex() == WBTCXTokenAddress) WBTCIsAComponent = true
    if (tokensList[i].toHex() == WETHXTokenAddress) WETHIsAComponent = true
  }

  if (DAIIsAComponent) {
    let poolTokenId = id.concat('-').concat(DAIXTokenAddress)
    let poolToken = PoolToken.safeLoad(poolTokenId)
    poolLiquidity = poolToken.balance
      .div(poolToken.denormWeight)
      .times(pool.totalWeight)
  } else if (WBTCIsAComponent && WBTCTokenPrice != null) {
    let poolTokenId = id.concat('-').concat(WBTCXTokenAddress)
    let poolToken = PoolToken.safeLoad(poolTokenId)
    poolLiquidity = WBTCTokenPrice.price
      .times(poolToken.balance)
      .div(poolToken.denormWeight)
      .times(pool.totalWeight)
  } else if (WETHIsAComponent && WETHTokenPrice != null) {
    let poolTokenId = id.concat('-').concat(WETHXTokenAddress)
    let poolToken = PoolToken.safeLoad(poolTokenId)
    poolLiquidity = WETHTokenPrice.price
      .times(poolToken.balance)
      .div(poolToken.denormWeight)
      .times(pool.totalWeight)
  }

  // // Create or update token price

  for (
    let i: i32 = 0;
    poolLiquidity.gt(ZERO_BD) && i < tokensList.length;
    i++
  ) {
    // use the token
    let tokenPriceId = XToken.safeLoad(tokensList[i].toHexString()).token
    let tokenPrice = TokenPrice.load(tokenPriceId)
    if (tokenPrice == null) {
      tokenPrice = new TokenPrice(tokenPriceId)
      tokenPrice.poolTokenId = ''
      tokenPrice.poolLiquidity = ZERO_BD
    }

    // here we use the xtoken
    let poolTokenId = id.concat('-').concat(tokensList[i].toHexString())
    let poolToken = PoolToken.safeLoad(poolTokenId)

    if (
      pool.active &&
      !pool.crp &&
      pool.tokensCount.notEqual(BigInt.fromI32(0)) &&
      pool.publicSwap &&
      (tokenPrice.poolTokenId == poolTokenId ||
        poolLiquidity.gt(tokenPrice.poolLiquidity))
    ) {
      tokenPrice.price = ZERO_BD

      if (poolToken.balance.gt(ZERO_BD)) {
        tokenPrice.price = poolLiquidity
          .div(pool.totalWeight)
          .times(poolToken.denormWeight)
          .div(poolToken.balance)
      }

      tokenPrice.symbol = poolToken.symbol || ''
      tokenPrice.name = poolToken.name || ''
      tokenPrice.decimals = poolToken.decimals
      tokenPrice.poolLiquidity = poolLiquidity
      tokenPrice.poolTokenId = poolTokenId
    }
    tokenPrice.save()
  }

  // Update pool liquidity

  let liquidity = ZERO_BD
  let denormWeight = ZERO_BD

  for (let i: i32 = 0; i < tokensList.length; i++) {
    let tokenPriceId = XToken.safeLoad(tokensList[i].toHexString()).token
    let tokenPrice = TokenPrice.load(tokenPriceId)
    if (tokenPrice !== null) {
      let poolTokenId = id.concat('-').concat(tokensList[i].toHexString())
      let poolToken = PoolToken.load(poolTokenId)
      if (
        poolToken !== null &&
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
  }

  let factory = Balancer.safeLoad('1')

  factory.totalLiquidity = factory.totalLiquidity
    .minus(pool.liquidity)
    .plus(liquidity)
  factory.save()

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

export function saveTransaction(
  event: ethereum.Event,
  eventName: string,
): void {
  // let blockAuthor = event.block.author.toHex()
  // let transactionTo = event.transaction.to.toHex()
  let tx = event.transaction.hash
    .toHexString()
    .concat('-')
    .concat(event.logIndex.toString())
  let userAddress = event.transaction.from.toHex()
  let transaction = Transaction.load(tx)
  if (transaction == null) {
    transaction = new Transaction(tx)
  }
  transaction.event = eventName
  transaction.poolAddress = event.address.toHex()
  transaction.userAddress = userAddress
  transaction.gasUsed = event.transaction.gasUsed.toBigDecimal()
  transaction.gasPrice = event.transaction.gasPrice.toBigDecimal()
  transaction.tx = event.transaction.hash
  transaction.timestamp = event.block.timestamp.toI32()
  transaction.block = event.block.number.toI32()
  transaction.save()

  createUserEntity(userAddress, userAddress)
}

export function createUserEntity(address: string, userAddress: string): void {
  if (User.load(address) == null) {
    let user = new User(address)
    user.userAddress = userAddress
    user.isCpkId = address != userAddress
    user.save()
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
