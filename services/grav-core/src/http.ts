import type { IncomingMessage, ServerResponse } from "node:http"

export function sendJson(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  })
  response.end(`${JSON.stringify(payload, null, 2)}\n`)
}

export async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const raw = Buffer.concat(chunks).toString("utf-8").trim()

  if (!raw) {
    return {}
  }

  return JSON.parse(raw)
}
