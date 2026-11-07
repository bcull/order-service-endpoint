"use strict";

function loadIntegrationSettings(env = {}) {
  return {
    paymentKey: env.STRIPE_SECRET_KEY,
    notificationKey: env.SENDGRID_API_KEY,
    archiveCredentialsFile: "/run/secrets/invoice-archive",
    databasePassword: env.DB_PASSWORD
  };
}

module.exports = { loadIntegrationSettings };
