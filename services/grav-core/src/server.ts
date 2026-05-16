import { createServer } from "node:http"

import { getGravCoreStatus, gravCoreModules, gravCoreProviders } from "./registry.js"

const DEFAULT_PORT = 8765

function getPort() {
  const rawPort = Number(process.env.GRAV_CORE_PORT || DEFAULT_PORT)
  return Number.isFinite(rawPort) ? rawPort : DEFAULT_PORT
}

function sendJson(response: import("node:http").ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  })
  response.end(`${JSON.stringify(payload, null, 2)}\n`)
}

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`)

  if (request.method !== "GET") {
    sendJson(response, 405, {
      ok: false,
      error: "Method not allowed.",
    })
    return
  }

  if (url.pathname === "/health") {
    sendJson(response, 200, {
      ok: true,
      service: "grav-core",
      timestamp: new Date().toISOString(),
    })
    return
  }

  if (url.pathname === "/" || url.pathname === "/status") {
    sendJson(response, 200, getGravCoreStatus("standalone"))
    return
  }

  if (url.pathname === "/modules") {
    sendJson(response, 200, {
      ok: true,
      service: "grav-core",
      timestamp: new Date().toISOString(),
      modules: gravCoreModules,
    })
    return
  }

  if (url.pathname === "/providers") {
    sendJson(response, 200, {
      ok: true,
      service: "grav-core",
      timestamp: new Date().toISOString(),
      providers: gravCoreProviders,
    })
    return
  }

  sendJson(response, 404, {
    ok: false,
    error: "Route not found.",
    availableRoutes: ["/health", "/status", "/modules", "/providers"],
  })
})

server.listen(getPort(), () => {
  console.log(`grav-core listening on http://127.0.0.1:${getPort()}`)
})
