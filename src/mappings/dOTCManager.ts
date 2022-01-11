import { CreatedOffer, CreatedOrder, CompletedOffer, CancledOffer } from './../types/dOTC/DOTCManager';
import { Offer, Order } from '../types/schema';
import { BigInt } from '@graphprotocol/graph-ts';

export function handleNewOffer (event: CreatedOffer):void {
    let offer = Offer.load(event.params.offerId.toHex());
    if (offer == null) {
        offer = new Offer(event.params.offerId.toHex()); 
    }
    offer.maker = event.params.maker;
    offer.tokenIn = event.params.tokenIn
    offer.tokenOut = event.params.tokenOut
    offer.AmountIn = event.params.amountIn
    offer.AmountOut = event.params.amountOut
    offer.offerType = BigInt.fromI32(event.params.offerType)
    offer.specialAddress = event.params.specialAddress
    offer.isCompleted = event.params.isComplete
    offer.cancelled = false
    offer.save();
}

export function handleNewOrder(event: CreatedOrder):void{
    let order = Order.load(event.params.orderId.toHex())
    let offer = Offer.load(event.params.offerId.toHex());
    if (order == null) {
        order = new Order(event.params.orderId.toHex());
    }
    order.amountPaid = event.params.amountPaid;
    order.amountToReceive = event.params.amountToReceive;
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