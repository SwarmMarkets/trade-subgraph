import { BigDecimal, ethereum } from '@graphprotocol/graph-ts'
import { DEFAULT_DECIMALS } from '../constants/common'
import { Swap, Transaction as SchematicTransaction } from '../types/schema'
import { SwapOperation } from './swapOperation'
import { LOG_JOIN, LOG_EXIT, LOG_SWAP } from '../types/templates/Pool/Pool'
import { tokenToDecimal } from '../mappings/helpers'
import { ZERO_BD } from '../constants/math'
import { Transfer } from '../types/templates/XToken/XToken'
import { push } from '../utils/array'
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

  static loadOrCreate(id: string): Transaction {
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
    this.userAddress = event.transaction.from.toHex()
  }

  static loadOrCreateJoinPool(event: LOG_JOIN): Transaction {
    let transaction = Transaction.loadOrCreate(event.transaction.hash.toHex())

    let xTokenIn = XToken.safeLoad(event.params.tokenIn.toHex())
    let tokenInPrice = TokenPrice.safeLoad(xTokenIn.token)

    let tokenAmountIn = tokenToDecimal(
      event.params.tokenAmountIn.toBigDecimal(),
      xTokenIn.decimals,
    )

    let tokenAmountInValue = tokenAmountIn.times(tokenInPrice.price)
    transaction.value = transaction.value.plus(tokenAmountInValue)

    transaction.action =
      transaction.tokensIn.length == 0 ? 'joinPoolSingleIn' : 'joinPool'

    transaction.tokensIn = push<string>(transaction.tokensIn, xTokenIn.id)
    transaction.tokenAmountsIn = push<BigDecimal>(
      transaction.tokenAmountsIn,
      tokenAmountIn,
    )

    transaction.fillEventData(event)

    transaction.save()

    return transaction as Transaction
  }

  static loadOrCreateExitPool(event: LOG_EXIT): Transaction {
    let transaction = Transaction.loadOrCreate(event.transaction.hash.toHex())

    let xTokenOut = XToken.safeLoad(event.params.tokenOut.toHex())
    let tokenOutPrice = TokenPrice.safeLoad(xTokenOut.token)

    let tokenAmountOut = tokenToDecimal(
      event.params.tokenAmountOut.toBigDecimal(),
      xTokenOut.decimals,
    )

    let tokenAmountOutValue = tokenAmountOut.times(tokenOutPrice.price)
    transaction.value = transaction.value.plus(tokenAmountOutValue)

    transaction.action =
      transaction.tokensOut.length == 0 ? 'exitPoolSingleOut' : 'exitPool'

    transaction.tokensOut = push<string>(transaction.tokensOut, xTokenOut.id)
    transaction.tokenAmountsOut = push<BigDecimal>(
      transaction.tokenAmountsOut,
      tokenAmountOut,
    )

    transaction.fillEventData(event)

    transaction.save()

    return transaction as Transaction
  }

  static updateJoinPoolTx(event: Transfer, xTokenAddress: string): void {
    let transaction = Transaction.loadOrCreate(event.transaction.hash.toHex())

    transaction.fillEventData(event)

    transaction.pools = [xTokenAddress]
    transaction.tokensOut = [xTokenAddress]
    transaction.tokenAmountsOut = [
      tokenToDecimal(event.params.value.toBigDecimal(), DEFAULT_DECIMALS),
    ]

    transaction.save()
  }

  static updateExitPoolTx(event: Transfer, xTokenAddress: string): void {
    let transaction = Transaction.loadOrCreate(event.transaction.hash.toHex())

    transaction.fillEventData(event)

    transaction.pools = [xTokenAddress]
    transaction.tokensIn = [xTokenAddress]
    transaction.tokenAmountsIn = [
      tokenToDecimal(event.params.value.toBigDecimal(), DEFAULT_DECIMALS),
    ]

    transaction.save()
  }

  static updateOrCreateSwapTx(event: LOG_SWAP): void {
    let transactionId = event.transaction.hash.toHex()

    let transaction = Transaction.loadOrCreate(transactionId)
    let swapOperation = SwapOperation.loadOrCreate(transactionId)

    transaction.fillEventData(event)

    transaction.action = 'swap'

    transaction.tokensIn = [swapOperation.tokenIn.toHex()]
    transaction.tokenAmountsIn = [swapOperation.tokenAmountIn]

    transaction.tokensOut = [swapOperation.tokenOut.toHex()]
    transaction.tokenAmountsOut = [swapOperation.tokenAmountOut]

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
  }
}
