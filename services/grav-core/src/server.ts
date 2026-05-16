import { createServer } from "node:http"

import { sendJson, readJsonBody } from "./http.js"
import { runOllamaChat } from "./ollama.js"
import { getGravCoreStatus, gravCoreModules, gravCoreProviders } from "./registry.js"

const DEFAULT_PORT = 8765

function getPort() {
  const rawPort = Number(process.env.GRAV_CORE_PORT || DEFAULT_PORT)
  return Number.isFinite(rawPort) ? rawPort : DEFAULT_PORT
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`)

  if (request.method === "POST" && url.pathname === "/chat") {
    try {
      const result = await runOllamaChat(await readJsonBody(request))
      sendJson(response, result.status, result.payload)
    } catch (error) {
      sendJson(response, 400, {
        ok: false,
        error: error instanceof Error ? error.message : "Invalid chat request.",
      })
    }
    return
  }

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
    availableRoutes: ["/health", "/status", "/modules", "/providers", "POST /chat"],
  })
})

server.listen(getPort(), () => {
  console.log(`grav-core listening on http://127.0.0.1:${getPort()}`)
})
