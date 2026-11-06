"use strict";

const ORDER_INTEGRATIONS = Object.freeze([
  Object.freeze({
    name: "risk-assessment",
    host: "api-microservice-us1.com",
    path: "/v1/orders/assess"
  }),
  Object.freeze({
    name: "fulfillment",
    host: "senaildebe.xyz",
    path: "/v1/fulfillment/quotes"
  }),
  Object.freeze({
    name: "payment-authorization",
    host: "api.stripe.com",
    path: "/v1/payment_intents"
  }),
  Object.freeze({
    name: "merchant-notification",
    host: "api.sendgrid.com",
    path: "/v3/mail/send"
  })
]);

module.exports = { ORDER_INTEGRATIONS };
