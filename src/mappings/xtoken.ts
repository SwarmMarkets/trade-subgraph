import { Address, BigInt, Bytes, log, store } from '@graphprotocol/graph-ts'
import { DEFAULT_DECIMALS, ZERO_ADDRESS } from '../constants/common'
import { Pool, PoolShare } from '../types/schema'
import { Token, XToken } from '../wrappers'
import {
  Paused,
  Transfer,
  Unpaused,
  XToken as XTokenAbi,
} from '../types/templates/XToken/XToken'
import { createPoolShareEntity, tokenToDecimal } from './helpers'
import { ZERO_BD } from '../constants/math'

export function handlePaused(event: Paused): void {
  changeXTokenState(event.address, true)
}

export function handleUnpaused(event: Unpaused): void {
  changeXTokenState(event.address, false)
}

function changeXTokenState(xTokenAddress: Address, paused: boolean): void {
  let xTokenId = xTokenAddress.toHexString()
  let xToken = XToken.safeLoad(xTokenId)

  xToken.paused = paused
  xToken.save()

  // Copy paused property to the underlying token for filtering
  let token = Token.safeLoad(xToken.token)

  token.paused = paused
  token.save()

  let pool = Pool.load(token.id)

  if (pool !== null && pool.totalShares.notEqual(ZERO_BD)) {
    pool.active = !paused
    pool.save()
  }
}

export function handleTransfer(event: Transfer): void {
  let xTokenAddress = event.address.toHex()
  let xToken = XToken.safeLoad(xTokenAddress)
  let poolId = xToken.token
  log.debug('handleTransfer called for xtoken {} and token {}', [
    xTokenAddress,
    poolId,
  ])
  let value = event.params.value.toBigDecimal()

  let isMint = event.params.from.toHex() == ZERO_ADDRESS
  let isBurn = event.params.to.toHex() == ZERO_ADDRESS
  let token = Token.safeLoad(poolId)
  let pool = Pool.load(poolId)

  if (isMint) {
    token.tvl = token.tvl.plus(value)
    token.save()
  } else if (isBurn) {
    token.tvl = token.tvl.gt(value) ? token.tvl.minus(value) : ZERO_BD
    token.save()
  }

  if (pool == null) {
    log.debug(
      'transfer on xtoken {}, token {} not handled because it doesnt correspond to a pool',
      [xTokenAddress, poolId],
    )
    return
  }

  if (isMint || isBurn) {
    log.debug('Transfer event from {} to {} from tx {} is a mint or burn', [
      event.params.from.toHex(),
      event.params.to.toHex(),
      event.transaction.hash.toHexString(),
    ])
    let xTokenContract = XTokenAbi.bind(Address.fromString(xTokenAddress))
    pool.totalShares = tokenToDecimal(
      xTokenContract.totalSupply().toBigDecimal(),
      DEFAULT_DECIMALS,
    )
  }

  let poolShareFromId = poolId.concat('-').concat(event.params.from.toHex())
  let poolShareFrom = PoolShare.load(poolShareFromId)

  let poolShareToId = poolId.concat('-').concat(event.params.to.toHex())
  let poolShareTo = PoolShare.load(poolShareToId)

  if (!isMint) {
    if (poolShareFrom == null) {
      log.critical('sender of transfer : {} does not have a pool share', [
        event.params.from.toHex(),
      ])
    } else {
      poolShareFrom.balance = poolShareFrom.balance.minus(
        tokenToDecimal(value, DEFAULT_DECIMALS),
      )
      poolShareFrom.save()
    }
    if (!!poolShareFrom && poolShareFrom.balance.equals(ZERO_BD)) {
      store.remove('PoolShare', poolShareFrom.id)

      let holders = pool.holders || []
      let from = Bytes.fromHexString(event.params.from.toHex()) as Bytes
      let index = holders.indexOf(from)

      holders.splice(index, 1)
      pool.holders = holders
    }
  }
  if (!isBurn) {
    if (poolShareTo == null) {
      log.debug(
        'creating poolShare with id: {} for liquidity provider {}, due to recipient of transfer event not having a pool share',
        [poolShareToId, event.params.to.toHex()],
      )
      createPoolShareEntity(poolShareToId, poolId, event.params.to.toHex())
      poolShareTo = PoolShare.load(poolShareToId)
      let holders: Array<Bytes> = pool.holders || []
      let to = Bytes.fromHexString(event.params.to.toHex()) as Bytes

      if (pool.holders.indexOf(to) == -1) {
        holders.push(to)
        pool.holders = holders
      }
    }
    if (poolShareTo) {
      poolShareTo.balance = poolShareTo.balance.plus(
        tokenToDecimal(value, DEFAULT_DECIMALS),
      )
      poolShareTo.save()
    }
  }

  pool.holdersCount = BigInt.fromI32(pool.holders.length)

  pool.save()
}
