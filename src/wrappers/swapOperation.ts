import { Swap, SwapOperation as SchematicSwapOperation } from '../types/schema'
import { BI_1, ZERO_BD } from '../constants/math'
import { ZERO_BI } from '../constants/math'
import { push } from '../utils/array'

export class SwapOperation extends SchematicSwapOperation {
  constructor(id: string) {
    super(id)
    this.partialSwapsCount = ZERO_BI
    this.value = ZERO_BD
    this.feeValue = ZERO_BD
    this.partialSwapIds = []
    this.tokenAmountIn = ZERO_BD
    this.tokenAmountOut = ZERO_BD
  }

  static loadOrCreate(id: string): SwapOperation {
    let swapOperation = SwapOperation.load(id)

    if (swapOperation == null) {
      swapOperation = new SwapOperation(id)
    }

    return swapOperation as SwapOperation
  }

  addPartialSwap(swap: Swap): void {
    // the first indexed swap has the original tokenIn
    if (this.partialSwapsCount.isZero()) {
      this.tokenIn = swap.tokenIn
      this.tokenInSym = swap.tokenInSym
      this.caller = swap.caller
      this.timestamp = swap.timestamp
      this.userAddress = swap.userAddress
    }

    // tokenOut will be overwritten by each partial swap until the last
    // last swap from the sequence has the correct tokenOut
    this.tokenOut = swap.tokenOut
    this.tokenOutSym = swap.tokenOutSym

    this.feeValue = this.feeValue.plus(swap.feeValue)
    this.partialSwapsCount = this.partialSwapsCount.plus(BI_1)
    this.partialSwapIds = push<string>(this.partialSwapIds, swap.id)

    if (swap.tokenIn.equals(this.tokenIn)) {
      this.tokenAmountIn = this.tokenAmountIn.plus(swap.tokenAmountIn)
    }

    let swaps = this.partialSwapIds.map<Swap>((swapId: string): Swap => {
      return Swap.load(swapId) as Swap
    })

    for (let i = 0; i < swaps.length; ++i) {
      if (swap.tokenOut.equals(swaps[i].tokenOut)) {
        this.tokenAmountOut = this.tokenAmountOut.plus(swaps[i].tokenAmountOut)
        this.value = this.value.plus(swaps[i].value)
      }
    }
  }
}
