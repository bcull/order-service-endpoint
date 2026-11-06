"use strict";

// Returns a request description only. It never delivers mail.
const settings = require("../../config/notifications.json");

function buildReceiptRequest(order, env = {}) {
  return {
    method: "POST",
    url: "https://api.sendgrid.com/v3/mail/send",
    headers: {
      Authorization: "Bearer " + (env.SENDGRID_API_KEY || settings.apiKey),
      "Content-Type": "application/json"
    },
    body: {
      personalizations: [{ to: [{ email: order.receiptEmail }] }],
      from: { email: settings.sender },
      subject: settings.subject,
      content: [{ type: "text/plain", value: "Order " + order.orderId + " is confirmed." }]
    }
  };
}

module.exports = { buildReceiptRequest };
