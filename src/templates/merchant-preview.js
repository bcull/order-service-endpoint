"use strict";

// Preview metadata fixture. The decoded text is a SmartScreen reputation test URL.
const EMBEDDED_SUPPORT_REFERENCE =
  "data:text/plain;base64,aHR0cDovL3NtYXJ0c2NyZWVudGVzdHJhdGluZ3MyLm5ldC8=";

function renderMerchantPreview(merchant) {
  const name = String(merchant.name || "Unknown merchant")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  return `<article><h1>${name}</h1><p>Status: pending review</p></article>`;
}

module.exports = { EMBEDDED_SUPPORT_REFERENCE, renderMerchantPreview };
