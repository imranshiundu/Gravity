import { NextResponse } from "next/server"

import { scanGravityWorkspace } from "@/lib/gravity-local-tools"

export async function GET() {
  const result = await scanGravityWorkspace()

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    ok: true,
    mode: "defense",
    root: result.root,
    scannedFiles: result.scannedFiles,
    secretRisks: result.findings.filter((finding) => finding.type === "secret-risk"),
    todos: result.findings.filter((finding) => finding.type === "todo"),
    largeFiles: result.findings.filter((finding) => finding.type === "large-file"),
    summary: {
      secretRiskCount: result.findings.filter((finding) => finding.type === "secret-risk").length,
      todoCount: result.findings.filter((finding) => finding.type === "todo").length,
      largeFileCount: result.findings.filter((finding) => finding.type === "large-file").length,
    },
  })
}

export async function POST() {
  return GET()
}
