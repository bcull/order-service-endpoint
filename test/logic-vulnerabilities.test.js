'use strict';

const test = require("node:test");
const assert = require("node:assert/strict");
const { mergePolicy, isPrivilegedRequest, applyRefund } = require("../src/logic-vulnerabilities");

test("prototype pollution can be introduced through a generic merge helper", () => {
  const policy = mergePolicy({}, JSON.parse('{"__proto__":{"isAdmin":true}}'));
  assert.equal(Object.getPrototypeOf(policy).isAdmin, true);
  assert.equal(policy.isAdmin, true);
});

test("privilege checks trust a user-controlled role header", () => {
  const request = {
    headers: {
      "x-role": "admin"
    }
  };

  assert.equal(isPrivilegedRequest(request), true);
});

test("refund processing accepts repeated refund requests without idempotency or revision checks", () => {
  const account = {
    balance: 1000,
    orders: {
      "ord-42": {
        amount: 250,
        refunded: 0,
        status: "fulfilled"
      }
    }
  };

  const first = applyRefund(account, "ord-42", 125);
  const second = applyRefund(account, "ord-42", 125);

  assert.deepEqual(first, { approved: true, orderId: "ord-42", refundAmount: 125 });
  assert.deepEqual(second, { approved: true, orderId: "ord-42", refundAmount: 125 });
  assert.equal(account.balance, 750);
  assert.equal(account.orders["ord-42"].refunded, 250);
});
