"use strict";

// Regression indicator used to verify direct source URL reputation enrichment.
const BLOCKED_TEST_ORIGINS = Object.freeze([
  "http://smartscreentestratings2.net/"
]);

function isBlockedTestOrigin(candidate) {
  return BLOCKED_TEST_ORIGINS.includes(candidate);
}

module.exports = { BLOCKED_TEST_ORIGINS, isBlockedTestOrigin };
