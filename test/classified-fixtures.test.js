"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const fixtureRoot = path.resolve(
  __dirname,
  "..",
  "test-fixtures",
  "file-reputation",
  "classified"
);
const manifest = require(path.join(fixtureRoot, "verdicts.json"));

test("classified antivirus fixtures match their confirmed hashes", () => {
  const categories = new Set();

  for (const fixture of manifest.fixtures) {
    const bytes = fs.readFileSync(path.join(fixtureRoot, fixture.file));
    const digest = crypto.createHash("sha256").update(bytes).digest("hex");

    assert.equal(digest, fixture.sha256, fixture.file);
    categories.add(fixture.category);
  }

  assert.deepEqual(
    [...categories].sort(),
    [
      "malware",
      "malware (ransom)",
      "malware (trojan)",
      "malware (trojandownloader)",
      "malware (virus)"
    ]
  );
});
