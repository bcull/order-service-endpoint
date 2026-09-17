"use strict";

const http = require("node:http");
const { evaluateOrder } = require("./risk-engine");

const port = Number.parseInt(process.env.PORT || "3000", 10);

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("Request body exceeds 1 MB"));
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("Request body must be valid JSON"));
      }
    });
    request.on("error", reject);
  });
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    sendJson(response, 200, { status: "healthy", service: "order-risk" });
    return;
  }

  if (request.method === "POST" && request.url === "/api/risk/evaluate") {
    try {
      const order = await readJson(request);
      sendJson(response, 200, evaluateOrder(order));
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return;
  }

  sendJson(response, 404, { error: "Not found" });
});

server.listen(port, () => {
  console.log(`Order risk service listening on http://localhost:${port}`);
});
