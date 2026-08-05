const http = require("http");

const host = "127.0.0.1";
const port = Number(process.env.HECMEDIA_NEWSLETTER_MOCK_PORT || 8093);
const path = "/wp-json/hectv/v1/newsletter/subscribe";

function respond(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json"
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== path) {
    respond(res, 404, { ok: false, error: "Not found" });
    return;
  }

  let body = "";
  req.setEncoding("utf8");
  req.on("data", chunk => {
    body += chunk;
    if (body.length > 16384) req.destroy();
  });
  req.on("end", () => {
    try {
      const payload = JSON.parse(body);
      if (
        !payload.firstName ||
        !payload.lastName ||
        !payload.email ||
        payload.consent !== true ||
        payload.captchaToken !== "hecmedia-local-test-only"
      ) {
        respond(res, 400, { ok: false, error: "Invalid local test request" });
        return;
      }

      process.stdout.write("Accepted one local newsletter test request.\n");
      respond(res, 202, { ok: true, status: "accepted" });
    } catch (err) {
      respond(res, 400, { ok: false, error: "Invalid JSON" });
    }
  });
});

server.listen(port, host, () => {
  process.stdout.write(
    `Local newsletter mock listening on http://${host}:${port}${path}\n`
  );
});
