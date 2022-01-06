import { CreatedOffer, CreatedOrder } from './../types/dOTC/DOTCManager';
import { Offer, Order } from '../types/schema';

export const handleNewOffer = (event: CreatedOffer) => {
    let offer = Offer.load(event.params.offerId.toHex());
    if (offer == null) {
        offer = new Offer(event.params.offerId.toHex()); 
    }
    offer.maker = event.params.maker;
    offer.tokenIn = event.params.tokenIn
    offer.tokenOut = event.params.tokenOut
    offer.tokenAmountIn = event.params.amountIn
    offer.tokenAmountOut = event.params.amountOut
    offer.offerType = event.params.offerType
    offer.specialAddress = event.params.specialAddress
    offer.isCompleted = event.params.isComplete
    offer.save();
}

export const handleNewOrder = (event: CreatedOrder) => {
    let order = Order.load(event.params.orderId.toHex())
    let offer = Offer.load(event.params.offerId.toHex())
    if (order == null) {
        order = new Order(event.params.orderId.toHex());
        order.amountPaid = event.params.amountPaid;
        order.amountToReceive = event.params.amountToReceive;
        order.orderedBy = event.params.orderedBy;
        // order.offer = offer.id;
        order.save()
    }
}