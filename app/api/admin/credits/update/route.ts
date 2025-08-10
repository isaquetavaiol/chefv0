import { NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase/admin"
import { isEmailAdmin } from "@/lib/admin"

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (!token) return new NextResponse("Unauthorized", { status: 401 })

    const payload = await req.json().catch(() => ({}))
    const userId = String(payload.userId || "")
    const op = String(payload.op || "add") as "add" | "set" | "reset"
    const amount = Number(payload.amount ?? 0)

    if (!userId) return new NextResponse("Bad request", { status: 400 })
    if (op === "add" && !(amount > 0)) return new NextResponse("Amount must be > 0", { status: 400 })
    if (op === "set" && !(amount >= 0)) return new NextResponse("Amount must be >= 0", { status: 400 })

    const admin = getAdminClient()

    // Verifica chamador
    const { data: me, error: meErr } = await admin.auth.getUser(token)
    if (meErr || !me?.user) return new NextResponse("Unauthorized", { status: 401 })
    if (!isEmailAdmin(me.user.email || "")) return new NextResponse("Forbidden", { status: 403 })

    // Busca usuário alvo
    const { data: got, error: getErr } = await admin.auth.admin.getUserById(userId)
    if (getErr || !got?.user) return new NextResponse("User not found", { status: 404 })

    const currentMeta = (got.user.app_metadata || {}) as Record<string, any>
    const currentCredits = Number(currentMeta.credits ?? 0)

    let nextCredits = currentCredits
    if (op === "add") nextCredits = currentCredits + amount
    if (op === "set") nextCredits = amount
    if (op === "reset") nextCredits = 0
    if (nextCredits < 0) nextCredits = 0

    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: { ...currentMeta, credits: nextCredits },
    })
    if (updErr) throw updErr

    return NextResponse.json({ credits: nextCredits })
  } catch (e: any) {
    return new NextResponse(e?.message || "Server error", { status: 500 })
  }
}
