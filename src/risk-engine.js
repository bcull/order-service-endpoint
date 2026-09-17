"use strict";

const HIGH_VALUE_THRESHOLD = 5_000;
const REVIEW_COUNTRIES = new Set(["KP", "IR", "SY"]);

function evaluateOrder(order) {
  const orderId = typeof order.orderId === "string" ? order.orderId.trim() : "";
  const amount = Number(order.amount);
  const country = typeof order.country === "string" ? order.country.toUpperCase() : "";

  if (!orderId || !Number.isFinite(amount) || amount < 0 || country.length !== 2) {
    throw new Error("orderId, non-negative amount, and two-letter country are required");
  }

  const reasons = [];
  if (amount >= HIGH_VALUE_THRESHOLD) {
    reasons.push("high_value_order");
  }
  if (REVIEW_COUNTRIES.has(country)) {
    reasons.push("country_requires_review");
  }

  return {
    orderId,
    decision: reasons.length === 0 ? "approve" : "review",
    reasons,
    evaluatedAt: new Date().toISOString()
  };
}

module.exports = { evaluateOrder };
