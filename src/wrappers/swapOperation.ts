import { Swap, SwapOperation as SchematicSwapOperation } from '../types/schema'
import { BI_1, ZERO_BD } from './../constants/math'
import { ZERO_BI } from '../constants/math'

export class SwapOperation extends SchematicSwapOperation {
  constructor(id: string) {
    super(id)
    this.isMultihop = false
    this.partialSwapsCount = ZERO_BI
    this.value = ZERO_BD
    this.feeValue = ZERO_BD
    this.partialSwapIds = []
  }

  static loadOrCreate(id: string): SwapOperation {
    let swapOperation = SwapOperation.load(id)

    if (swapOperation == null) {
      swapOperation = new SwapOperation(id)
    }

    return swapOperation as SwapOperation
  }

  addPartialSwap(swap: Swap): void {
    this.tokenOut = swap.tokenOut
    this.tokenOutSym = swap.tokenOutSym
    this.value = swap.value
    this.feeValue = this.feeValue.plus(swap.feeValue)
    this.partialSwapsCount = this.partialSwapsCount.plus(BI_1)
    this.isMultihop = true
    this.tokenAmountOut = swap.tokenAmountOut

    if (swap.tokenIn.equals(this.tokenIn)) {
      this.tokenAmountIn = this.tokenAmountIn.plus(swap.tokenAmountIn)
    }

    let swaps = this.partialSwapIds.map<Swap>((swapId: string): Swap => {
      return Swap.load(swapId) as Swap
    })

    for (let i = 0; i < swaps.length; ++i) {
      if (swaps[i].tokenOut.toHex() == swap.tokenOut.toHex()) {
        this.tokenAmountOut = this.tokenAmountOut.plus(swaps[i].tokenAmountOut)

        this.value = this.value.plus(swaps[i].value)
      }
    }

    this.partialSwapIds.push(swap.id)
  }
}
