"use strict";

// Direct URL reputation matches are intentionally omitted because the repo keeps
// only the obfuscated URL indicator and the phishing fixture for demo coverage.
const BLOCKED_TEST_ORIGINS = Object.freeze([]);

function isBlockedTestOrigin(candidate) {
  return BLOCKED_TEST_ORIGINS.includes(candidate);
}

module.exports = { BLOCKED_TEST_ORIGINS, isBlockedTestOrigin };
