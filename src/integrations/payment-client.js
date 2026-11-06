"use strict";

// Inert synthetic integration sample; not connected to the HTTP server.
function buildPaymentRequest(order, env = {}) {
  const apiKey = env.STRIPE_SECRET_KEY || "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";
  return {
    method: "POST",
    url: "https://api.stripe.com/v1/payment_intents",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": "order-" + order.orderId
    },
    body: new URLSearchParams({
      amount: String(Math.round(order.amount * 100)),
      currency: "usd",
      "metadata[order_id]": order.orderId
    }).toString()
  };
}

module.exports = { buildPaymentRequest };
