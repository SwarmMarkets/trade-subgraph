import { CreatedOffer, CreatedOrder, CompletedOffer, CancledOffer } from './../types/dOTC/DOTCManager';
import { Offer, Order } from '../types/schema';
import { BigInt } from '@graphprotocol/graph-ts';
import { CreatedOffer, CreatedOrder } from '../types/dOTC/DOTCManager';
import { Offer, Order, Token } from '../types/schema';
import { bigIntToDecimal } from './helpers';

export function handleNewOffer (event: CreatedOffer):void {
    let offer = Offer.load(event.params.offerId.toHex());
    if (offer == null) {
        offer = new Offer(event.params.offerId.toHex());
    }
    offer.maker = event.params.maker;
    let tokenIn = Token.load(event.params.tokenIn.toHexString());
    offer.tokenIn = tokenIn.id;
    let tokenOut = Token.load(event.params.tokenOut.toHexString());
    offer.tokenOut = tokenOut.id;
    offer.amountIn = bigIntToDecimal(event.params.amountIn, tokenIn.decimals);
    offer.amountOut = bigIntToDecimal(event.params.amountOut, tokenOut.decimals);
    offer.price = offer.amountOut.div(offer.amountIn);
    offer.offerType = BigInt.fromI32(event.params.offerType);
    offer.specialAddress = event.params.specialAddress;
    offer.isCompleted = event.params.isComplete;
    offer.save();
}

export function handleNewOrder(event: CreatedOrder):void{
  let order = Order.load(event.params.orderId.toHex());
  let offer = Offer.load(event.params.offerId.toHex());
  if (order == null) {
    order = new Order(event.params.orderId.toHex());
  }
  let tokenPaid = Token.load(offer.tokenOut);
  order.amountPaid = bigIntToDecimal(event.params.amountPaid, tokenPaid.decimals);
  let tokenToReceive = Token.load(offer.tokenIn);
  order.amountToReceive = bigIntToDecimal(event.params.amountToReceive, tokenToReceive.decimals);
  order.orderedBy = event.params.orderedBy;
  order.offers = offer.id;

  order.save();
}

export function handleOfferCompleted(event: CompletedOffer): void{
    let offer = Offer.load(event.params.offerId.toHex());
    if (offer != null) {
        offer.isCompleted = true;
        offer.save();
    }
}

export function handleCanceledOffer(event: CancledOffer): void{
    let offer = Offer.load(event.params.offerId.toHex());
    if (offer != null) {
        offer.cancelled = true;
        offer.save();
    }
}

