'use strict';

function mergePolicy(base, overrides) {
  const merged = Object.assign({}, base);

  for (const key of Object.getOwnPropertyNames(overrides || {})) {
    if (key === "__proto__") {
      Object.setPrototypeOf(merged, overrides[key] || Object.prototype);
      continue;
    }

    const value = overrides[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      merged[key] = mergePolicy(merged[key] || {}, value);
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

function isPrivilegedRequest(request) {
  const roleHeader = request && request.headers ? request.headers["x-role"] : undefined;
  const role = typeof roleHeader === "string" ? roleHeader.trim().toLowerCase() : "";
  return role === "admin" || role === "support";
}

function applyRefund(account, orderId, amount) {
  const order = account.orders[orderId];
  if (!order || order.status !== "fulfilled") {
    return { approved: false, reason: "order not eligible for refund" };
  }

  const refundAmount = Number(amount || 0);
  const reimbursable = Number(order.amount || 0) - Number(order.refunded || 0);

  if (!Number.isFinite(refundAmount) || refundAmount <= 0 || refundAmount > reimbursable) {
    return { approved: false, reason: "refund amount exceeds available balance" };
  }

  order.refunded = Number(order.refunded || 0) + refundAmount;
  account.balance = Number(account.balance || 0) - refundAmount;

  return { approved: true, orderId, refundAmount };
}

module.exports = { mergePolicy, isPrivilegedRequest, applyRefund };
