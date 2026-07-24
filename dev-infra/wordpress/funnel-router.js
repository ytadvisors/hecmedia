const http = require("http");
const { URL } = require("url");

const LOCAL_OPERATIONS = new Set([
  "RailPromo",
  "TopbarCtas",
  "FeaturedVideos",
  "PostHeaderImageSize",
  // The nested-menu layout query requires MenuItem.parentDatabaseId, which
  // is registered by the staging WordPress stack but absent upstream.
  "PageLayout"
]);
const LOCAL_REST_PATHS = new Set(["/wp-json/hectv/v1/site-options"]);
const MAX_BODY_BYTES = 1024 * 1024;

function getOperationName(body) {
  if (body && typeof body.operationName === "string" && body.operationName) {
    return body.operationName;
  }

  const query = body && typeof body.query === "string" ? body.query : "";
  const match = query.match(/\b(?:query|mutation)\s+([_A-Za-z][_0-9A-Za-z]*)/);
  return match ? match[1] : "";
}

function isMutation(body) {
  const query = body && typeof body.query === "string" ? body.query : "";
  return /\bmutation\b/.test(query);
}

function isLocalGraphqlRead(body) {
  const operationName = getOperationName(body);
  if (operationName) return LOCAL_OPERATIONS.has(operationName);

  const query = body && typeof body.query === "string" ? body.query : "";
  return /\b(hectvSiteOptions|topbarCtas|featuredVideos|headerImageSize)\b/.test(
    query
  );
}

function isLocalFixtureRestRead(pathname, searchParams) {
  if (LOCAL_REST_PATHS.has(pathname)) return true;
  if (pathname !== "/wp-json/wp/v2/posts") return false;

  const fields = searchParams ? searchParams.get("_fields") || "" : "";
  return fields.split(",").includes("meta");
}

function chooseOrigin({
  pathname,
  searchParams,
  body,
  localOrigin,
  upstreamOrigin
}) {
  if (pathname === "/graphql" && isLocalGraphqlRead(body)) {
    return localOrigin;
  }

  if (isLocalFixtureRestRead(pathname, searchParams)) {
    return localOrigin;
  }

  return upstreamOrigin;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", chunk => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(
          Object.assign(new Error("request body too large"), { status: 413 })
        );
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function copyHeaders(headers) {
  const next = { ...headers };
  delete next.host;
  delete next.connection;
  delete next["content-length"];
  next["x-hecmedia-staging-router"] = "1";
  return next;
}

function createRouter({
  localOrigin = process.env.LOCAL_WP_ORIGIN || "http://127.0.0.1:18092",
  upstreamOrigin = process.env.UPSTREAM_WP_ORIGIN || "https://prod-wp.hectv.org"
} = {}) {
  return http.createServer(async (request, response) => {
    try {
      if (request.url === "/healthz") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ ok: true }));
        return;
      }

      const incoming = new URL(request.url, "http://router.invalid");
      const rawBody = await readBody(request);
      let parsedBody = null;
      if (incoming.pathname === "/graphql") {
        if (request.method === "GET") {
          parsedBody = { query: incoming.searchParams.get("query") || "" };
        } else if (request.method === "POST") {
          if (
            !(request.headers["content-type"] || "").includes(
              "application/json"
            )
          ) {
            throw Object.assign(
              new Error("GraphQL requires application/json"),
              {
                status: 415
              }
            );
          }
          parsedBody = JSON.parse(rawBody.toString("utf8"));
        } else {
          throw Object.assign(new Error("method not allowed"), { status: 405 });
        }

        if (isMutation(parsedBody)) {
          throw Object.assign(
            new Error("GraphQL mutations are disabled on staging"),
            { status: 405 }
          );
        }
      } else if (!["GET", "HEAD"].includes(request.method)) {
        throw Object.assign(new Error("REST writes are disabled on staging"), {
          status: 405
        });
      }

      const origin = chooseOrigin({
        pathname: incoming.pathname,
        searchParams: incoming.searchParams,
        body: parsedBody,
        localOrigin,
        upstreamOrigin
      });
      const target = new URL(`${incoming.pathname}${incoming.search}`, origin);
      const proxyRequest = (target.protocol === "https:"
        ? require("https")
        : http
      )
        .request(
          target,
          {
            method: request.method,
            headers: {
              ...copyHeaders(request.headers),
              ...(rawBody.length ? { "content-length": rawBody.length } : {})
            },
            timeout: 15000
          },
          proxyResponse => {
            response.writeHead(proxyResponse.statusCode || 502, {
              ...proxyResponse.headers,
              "x-hecmedia-staging-origin":
                origin === localOrigin ? "local" : "upstream"
            });
            proxyResponse.pipe(response);
          }
        )
        .on("timeout", function onTimeout() {
          this.destroy(new Error("upstream timeout"));
        })
        .on("error", error => {
          if (!response.headersSent) {
            response.writeHead(502, { "content-type": "application/json" });
          }
          response.end(JSON.stringify({ error: error.message }));
        });

      if (rawBody.length) proxyRequest.write(rawBody);
      proxyRequest.end();
    } catch (error) {
      response.writeHead(error.status || 400, {
        "content-type": "application/json"
      });
      response.end(JSON.stringify({ error: error.message }));
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 18093);
  createRouter().listen(port, "127.0.0.1", () => {
    process.stdout.write(`HEC staging router listening on 127.0.0.1:${port}\n`);
  });
}

module.exports = {
  chooseOrigin,
  createRouter,
  getOperationName,
  isLocalGraphqlRead,
  isLocalFixtureRestRead,
  isMutation
};
