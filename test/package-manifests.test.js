"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const fixtureRoot = path.resolve(
  __dirname,
  "..",
  "test-fixtures",
  "package-reputation"
);

function readFixture(...segments) {
  return fs.readFileSync(path.join(fixtureRoot, ...segments), "utf8");
}

test("contains the npm package reputation cases", () => {
  const manifest = JSON.parse(readFixture("package.json"));

  assert.deepEqual(manifest.dependencies, {
    "@scope/tool": "1.2.3",
    eicar: "1.0.0",
    "left-pad": "1.3.0",
    lodash: "4.17.21"
  });
});

test("contains the NuGet package reputation case", () => {
  const project = readFixture("nuget", "OrderAudit.csproj");

  assert.match(
    project,
    /PackageReference Include="Newtonsoft\.Json" Version="13\.0\.3"/
  );
});

test("contains the PyPI package reputation case", () => {
  assert.equal(readFixture("pypi", "requirements.txt").trim(), "requests==2.32.3");
});

test("contains the Maven and Gradle package reputation cases", () => {
  const pom = readFixture("jvm", "pom.xml");
  const gradle = readFixture("jvm", "build.gradle");

  assert.match(pom, /<artifactId>commons-lang3<\/artifactId>/);
  assert.match(pom, /<version>3\.17\.0<\/version>/);
  assert.match(gradle, /org\.apache\.commons:commons-lang3:3\.17\.0/);
});

test("contains the Cargo package reputation case", () => {
  const lock = readFixture("cargo", "Cargo.lock");

  assert.match(lock, /name = "serde"\r?\nversion = "1\.0\.210"/);
});
