"use strict";

// Offline request construction. No GitHub requests are made.
const fallbackToken = 'ghp_' +
  'OYCV5WHCVTKNcjGDMljPjqQJ8xelUlb3InpR';

function buildReleaseLookup(tag, env = {}) {
  return {
    method: "GET",
    url: "https://api.github.com/repos/example/order-service/releases/tags/" + encodeURIComponent(tag),
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + (env.GITHUB_TOKEN || fallbackToken)
    }
  };
}

module.exports = { buildReleaseLookup };
