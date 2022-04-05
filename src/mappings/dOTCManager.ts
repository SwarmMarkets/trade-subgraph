import { Address, BigInt } from '@graphprotocol/graph-ts'
import { ZERO_ADDRESS } from '../constants/common'
import {
  CanceledOffer,
  CompletedOffer,
  CreatedOffer,
  CreatedOrder,
  CreatedNftOffer,
  CreatedNftOrder,
  CompletedNftOffer,
  CanceledNftOffer,
  TokenOfferUpdated,
  NftOfferUpdated,
  UpdatedTokenOfferExpiry,
  UpdatedNftOfferExpiry,
} from '../types/dOTC/DOTCManager'
import { Offer, Order, NftOffer, NftOrder } from '../types/schema'
import { bigIntToDecimal } from './helpers'
import { ERC20Token } from '../wrappers/dOTCTokens'
import { ZERO_BD } from '../constants/math'

export function handleNewOffer(event: CreatedOffer): void {
  let offer = Offer.load(event.params.offerId.toHex())
  if (offer == null) {
    offer = new Offer(event.params.offerId.toHex())
  }
  offer.maker = event.params.maker

  let tokenIn = ERC20Token.safeLoad(event.params.tokenIn.toHexString())
  offer.tokenIn = tokenIn.id
  offer.amountIn = bigIntToDecimal(event.params.amountIn, tokenIn.decimals)

  let tokenOut = ERC20Token.safeLoad(event.params.tokenOut.toHexString())
  offer.tokenOut = tokenOut.id
  offer.amountOut = bigIntToDecimal(event.params.amountOut, tokenOut.decimals)

  if (offer.amountOut.gt(ZERO_BD) && offer.amountIn.gt(ZERO_BD)) {
    offer.price = offer.amountOut.div(offer.amountIn)
  } else {
    offer.price = ZERO_BD
  }

  offer.offerType = BigInt.fromI32(event.params.offerType)

  let specialAddress = event.params.specialAddress
  let isPrivate = Address.fromString(ZERO_ADDRESS).notEqual(specialAddress)
  offer.isPrivate = isPrivate
  if (isPrivate) {
    offer.specialAddress = specialAddress
  }

  offer.isCompleted = event.params.isComplete
  offer.availableAmount = bigIntToDecimal(
    event.params.amountIn,
    tokenIn.decimals,
  )
  offer.cancelled = false
  offer.expiresAt = event.params.expiryTime
  offer.createdAt = event.block.timestamp
  offer.save()
}

export function handleNewOrder(event: CreatedOrder): void {
  let order = Order.load(event.params.orderId.toHex())
  let offer = Offer.load(event.params.order.offerId.toHex())
  if (order == null) {
    order = new Order(event.params.orderId.toHex())
  }

  if (offer != null) {
    let tokenPaid = ERC20Token.safeLoad(offer.tokenOut)
    let amountPaid = bigIntToDecimal(
      event.params.order.amountToSend,
      tokenPaid.decimals,
    )

    order.amountPaid = amountPaid

    let tokenToReceive = ERC20Token.safeLoad(offer.tokenIn)
    let amountToReceive = bigIntToDecimal(
      event.params.order.amountToReceive,
      tokenToReceive.decimals,
    )
    order.amountToReceive = amountToReceive

    order.offers = offer.id
    offer.availableAmount = offer.availableAmount.gt(amountToReceive)
      ? offer.availableAmount.minus(amountToReceive)
      : ZERO_BD
    offer.amountOut = offer.amountOut.gt(amountPaid)
      ? offer.amountOut.minus(amountPaid)
      : ZERO_BD
    offer.save()
  } else {
    order.amountPaid = ZERO_BD
    order.amountToReceive = ZERO_BD
  }

  order.orderedBy = event.params.order.takerAddress
  order.createdAt = event.block.timestamp
  order.save()
}

export function handleOfferCompleted(event: CompletedOffer): void {
  let offer = Offer.load(event.params.offerId.toHex())
  if (offer != null) {
    offer.isCompleted = true
    offer.save()
  }
}

export function handleCanceledOffer(event: CanceledOffer): void {
  let offer = Offer.load(event.params.offerId.toHex())
  if (offer != null) {
    offer.cancelled = true
    offer.save()
  }
}

export function handleNewNftOffer(event: CreatedNftOffer): void {
  let offer = NftOffer.load(event.params.nftOfferId.toHex())
  if (offer == null) {
    offer = new NftOffer(event.params.nftOfferId.toHex())
  }
  offer.maker = event.transaction.from
  offer.nft = event.params.nftAddress.toHexString()
  offer.nftIds = event.params.nftIds
  offer.nftAmounts = event.params.nftAmounts
  offer.expiresAt = event.params.expiresAt
  let tokenOut = ERC20Token.safeLoad(event.params.tokenOutAddress.toHexString())
  offer.tokenOut = tokenOut.id
  offer.offerPrice = bigIntToDecimal(event.params.offerPrice, tokenOut.decimals)

  let specialAddress = event.params.specialAddress
  let isPrivate = Address.fromString(ZERO_ADDRESS).notEqual(specialAddress)
  offer.isPrivate = isPrivate
  if (isPrivate) {
    offer.specialAddress = specialAddress
  }

  offer.isCompleted = false
  offer.cancelled = false
  offer.createdAt = event.block.timestamp
  offer.save()
}

export function handleNewNftOrder(event: CreatedNftOrder): void {
  let order = NftOrder.load(event.params.orderId.toHex())
  let offer = NftOffer.load(event.params.nftOfferId.toHex())
  if (order == null) {
    order = new NftOrder(event.params.orderId.toHex())
  }

  if (offer != null) {
    let tokenPaid = ERC20Token.safeLoad(offer.tokenOut)
    order.amountPaid = bigIntToDecimal(event.params.amount, tokenPaid.decimals)

    order.offers = offer.id
    offer.isCompleted = true
    offer.save()
  } else {
    order.amountPaid = ZERO_BD
  }

  order.orderedBy = event.params.taker
  order.createdAt = event.block.timestamp
  order.save()
}

export function handleNftOfferCompleted(event: CompletedNftOffer): void {
  let offer = NftOffer.load(event.params.offerId.toHex())
  if (offer != null) {
    offer.isCompleted = true
    offer.save()
  }
}

export function handleCanceledNftOffer(event: CanceledNftOffer): void {
  let offer = NftOffer.load(event.params.offerId.toHex())
  if (offer != null) {
    offer.cancelled = true
    offer.save()
  }
}

export function handleTokenOfferUpdated(event: TokenOfferUpdated): void {
  let offer = Offer.load(event.params.offerId.toHex())
  if (offer != null) {
    let tokenOut = ERC20Token.safeLoad(offer.tokenOut)
    let newAmountOut = bigIntToDecimal(event.params.newOffer, tokenOut.decimals)
    offer.amountOut = newAmountOut
    if (newAmountOut.gt(ZERO_BD) && offer.availableAmount.gt(ZERO_BD)) {
      offer.price = newAmountOut.div(offer.availableAmount)
    } else {
      offer.price = ZERO_BD
    }
    offer.save()
  }
}

export function handleNftOfferUpdated(event: NftOfferUpdated): void {
  let offer = NftOffer.load(event.params.offerId.toHex())
  if (offer != null) {
    let tokenOut = ERC20Token.safeLoad(offer.tokenOut)
    offer.offerPrice = bigIntToDecimal(event.params.newOffer, tokenOut.decimals)
    offer.save()
  }
}

export function handleUpdatedTokenOfferExpiry(
  event: UpdatedTokenOfferExpiry,
): void {
  let offer = Offer.load(event.params.offerId.toHex())
  if (offer != null) {
    offer.expiresAt = event.params.newExpiryTimestamp
  }
}

export function handleUpdatedNftOfferExpiry(
  event: UpdatedNftOfferExpiry,
): void {
  let offer = NftOffer.load(event.params.offerId.toHex())
  if (offer != null) {
    offer.expiresAt = event.params.newExpiryTimestamp
  }
}
