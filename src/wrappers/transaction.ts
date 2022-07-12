import { BigDecimal, ethereum } from '@graphprotocol/graph-ts'
import { Swap, Transaction as SchematicTransaction } from '../types/schema'
import { SwapOperation } from './swapOperation'
import { User } from './user'
import { LOG_JOIN, LOG_EXIT, LOG_SWAP } from '../types/templates/Pool/Pool'
import { tokenToDecimal } from '../mappings/helpers'
import { PoolToken } from './poolToken'
import { ZERO_BD } from '../constants/math'
import { Transfer } from '../types/templates/XToken/XToken'
import { push } from '../utils/array'
import { Token } from './token'
import { TokenPrice } from './tokenPrice'
import { XToken } from './xToken'

export class Transaction extends SchematicTransaction {
  constructor(id: string) {
    super(id)
  }

  static load(id: string): Transaction | null {
    let transaction = SchematicTransaction.load(id)

    if (transaction == null) {
      return null
    }

    return transaction as Transaction
  }

  static loadOrFill(id: string): Transaction {
    let transaction = Transaction.load(id)

    if (transaction == null) {
      transaction = new Transaction(id)

      transaction.tokensIn = []
      transaction.pools = []
      transaction.tokensOut = []
      transaction.tokenAmountsIn = []
      transaction.tokenAmountsOut = []
      transaction.value = ZERO_BD
    }

    return transaction as Transaction
  }

  fillEventData(event: ethereum.Event): void {
    this.gasUsed = event.transaction.gasUsed.toBigDecimal()
    this.gasPrice = event.transaction.gasPrice.toBigDecimal()
    this.timestamp = event.block.timestamp.toI32()
    this.block = event.block.number.toI32()

    let userAddress = event.transaction.from.toHex()
    User.loadOrCreate(userAddress, userAddress)
    this.userAddress = userAddress
  }

  static loadOrCreateJoin(event: LOG_JOIN): Transaction {
    let transaction = Transaction.load(event.transaction.hash.toHex())
    let xTokenIn = XToken.safeLoad(event.params.tokenIn.toHex())
    let tokenInPrice = TokenPrice.safeLoad(xTokenIn.token)

    if (transaction == null) {
      transaction = new Transaction(event.transaction.hash.toHex())
      transaction.tokensIn = [event.params.tokenIn.toHex()]
      transaction.pools = [event.address.toHex()]
      let poolId = event.address.toHex()
      let pool = Token.safeLoad(poolId)

      transaction.tokensOut = [pool.xToken]

      let poolTokenId = poolId.concat('-').concat(event.params.tokenIn.toHex())
      let poolToken = PoolToken.safeLoad(poolTokenId)
      let tokenAmountIn = tokenToDecimal(
        event.params.tokenAmountIn.toBigDecimal(),
        poolToken.decimals,
      )

      transaction.tokenAmountsIn = [tokenAmountIn]
      transaction.tokenAmountsOut = [ZERO_BD]

      transaction.value = tokenAmountIn.times(tokenInPrice.price)
    } else {
      transaction.tokensIn = push<string>(
        transaction.tokensIn,
        event.params.tokenIn.toHex(),
      )

      transaction.pools = push<string>(transaction.pools, event.address.toHex())

      let poolId = event.address.toHex()

      let poolTokenId = poolId.concat('-').concat(event.params.tokenIn.toHex())
      let poolToken = PoolToken.safeLoad(poolTokenId)
      let tokenAmountIn = tokenToDecimal(
        event.params.tokenAmountIn.toBigDecimal(),
        poolToken.decimals,
      )

      transaction.tokenAmountsIn = push<BigDecimal>(
        transaction.tokenAmountsIn,
        tokenAmountIn,
      )

      transaction.value = transaction.value.plus(
        tokenAmountIn.times(tokenInPrice.price),
      )
    }

    transaction.fillEventData(event)

    transaction.action = 'join'

    transaction.save()

    return transaction as Transaction
  }

  static loadOrCreateExit(event: LOG_EXIT): Transaction {
    let transaction = Transaction.load(event.transaction.hash.toHex())

    let xTokenOut = XToken.safeLoad(event.params.tokenOut.toHex())
    let tokenOutPrice = TokenPrice.safeLoad(xTokenOut.token)

    if (transaction == null) {
      transaction = new Transaction(event.transaction.hash.toHex())
      transaction.pools = [event.address.toHex()]
      transaction.tokensOut = [event.params.tokenOut.toHex()]
      transaction.tokenAmountsIn = [ZERO_BD]

      let poolId = event.address.toHex()
      let pool = Token.safeLoad(poolId)
      transaction.tokensIn = [pool.xToken]

      let poolTokenId = poolId.concat('-').concat(event.params.tokenOut.toHex())
      let poolToken = PoolToken.safeLoad(poolTokenId)
      let tokenAmountOut = tokenToDecimal(
        event.params.tokenAmountOut.toBigDecimal(),
        poolToken.decimals,
      )

      transaction.tokenAmountsOut = [tokenAmountOut]

      transaction.value = tokenAmountOut.times(tokenOutPrice.price)
    } else {
      transaction.pools = push<string>(transaction.pools, event.address.toHex())
      transaction.tokensOut = push<string>(
        transaction.tokensOut,
        event.params.tokenOut.toHex(),
      )

      let poolId = event.address.toHex()

      let poolTokenId = poolId.concat('-').concat(event.params.tokenOut.toHex())
      let poolToken = PoolToken.safeLoad(poolTokenId)
      let tokenAmountOut = tokenToDecimal(
        event.params.tokenAmountOut.toBigDecimal(),
        poolToken.decimals,
      )

      transaction.tokenAmountsOut = push<BigDecimal>(
        transaction.tokenAmountsOut,
        tokenAmountOut,
      )

      transaction.value = transaction.value.plus(
        tokenAmountOut.times(tokenOutPrice.price),
      )
    }

    transaction.fillEventData(event)

    transaction.action = 'exit'

    transaction.save()

    return transaction as Transaction
  }

  static loadMint(event: Transfer, xTokenAddress: string): Transaction {
    let transaction = Transaction.loadOrFill(event.transaction.hash.toHex())

    transaction.fillEventData(event)

    transaction.action = 'join'
    transaction.tokensOut = [xTokenAddress]
    transaction.tokenAmountsOut = [
      tokenToDecimal(event.params.value.toBigDecimal(), 18),
    ]

    transaction.save()

    return transaction
  }

  static loadBurn(event: Transfer, xTokenAddress: string): Transaction {
    let transaction = Transaction.loadOrFill(event.transaction.hash.toHex())

    transaction.fillEventData(event)

    transaction.action = 'join'
    transaction.tokensIn = [xTokenAddress]
    transaction.tokenAmountsIn = [
      tokenToDecimal(event.params.value.toBigDecimal(), 18),
    ]

    transaction.save()

    return transaction
  }

  static loadOrCreateSwap(
    event: LOG_SWAP,
    swapOperation: SwapOperation,
  ): Transaction {
    let transaction = Transaction.loadOrFill(event.transaction.hash.toHex())

    transaction.fillEventData(event)

    transaction.action = 'swap'

    transaction.tokensIn = [swapOperation.tokenIn.toHex()]
    transaction.tokenAmountsIn = [swapOperation.tokenAmountIn]
    transaction.tokensOut = [swapOperation.tokenOut.toHex()]
    transaction.tokenAmountsOut = [swapOperation.tokenAmountOut]
    transaction.pools = []
    transaction.value = swapOperation.value

    let swaps = swapOperation.partialSwapIds.map<Swap>(
      (swapId: string): Swap => {
        return Swap.load(swapId) as Swap
      },
    )

    for (let i = 0; i < swaps.length; ++i) {
      let swap = swaps[i]

      transaction.pools = push<string>(transaction.pools, swap.poolAddress)
    }

    transaction.save()

    return transaction
  }
}
