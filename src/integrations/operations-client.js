"use strict";

// Synthetic scanner input. This module has no network transport.
function buildReviewNotification(order, env = {}) {
  const botToken = env.SLACK_BOT_TOKEN || "xoxb-505402480950-799628915813-5DzIQ8FJFWlS61EFT2CMw097";
  return {
    method: "POST",
    url: "https://slack.com/api/chat.postMessage",
    headers: { Authorization: "Bearer " + botToken, "Content-Type": "application/json" },
    body: {
      channel: "C0123456789",
      text: "Order " + order.orderId + " requires merchant review."
    }
  };
}

module.exports = { buildReviewNotification };
