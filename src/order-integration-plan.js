"use strict";

const { ORDER_INTEGRATIONS } = require("./config/order-integrations");
const { evaluateOrder } = require("./risk-engine");

function buildOrderIntegrationPlan(order) {
  const evaluation = evaluateOrder(order);

  return {
    orderId: evaluation.orderId,
    decision: evaluation.decision,
    requests: ORDER_INTEGRATIONS.map((integration) => ({
      service: integration.name,
      method: "POST",
      url: new URL(integration.path, `https://${integration.host}/`).href
    }))
  };
}

module.exports = { buildOrderIntegrationPlan };
