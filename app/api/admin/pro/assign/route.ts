import { NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase/admin"
import { isEmailAdmin } from "@/lib/admin"

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (!token) return new NextResponse("Unauthorized", { status: 401 })

    const payload = await req.json().catch(() => ({}))
    const userId = String(payload.userId || "")
    const plan = String(payload.plan || "freemium") as "pro" | "freemium"
    if (!userId || !["pro", "freemium"].includes(plan)) {
      return new NextResponse("Bad request", { status: 400 })
    }

    const admin = getAdminClient()
    // Verifica o usuário chamador
    const { data: me, error: meErr } = await admin.auth.getUser(token)
    if (meErr || !me?.user) return new NextResponse("Unauthorized", { status: 401 })
    if (!isEmailAdmin(me.user.email || "")) return new NextResponse("Forbidden", { status: 403 })

    // Busca usuário alvo para preservar app_metadata existente
    const { data: got, error: getErr } = await admin.auth.admin.getUserById(userId)
    if (getErr || !got?.user) return new NextResponse("User not found", { status: 404 })

    const currentMeta = (got.user.app_metadata || {}) as Record<string, any>
    const newMeta = { ...currentMeta, plan }

    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      app_metadata: newMeta,
    })
    if (updErr) throw updErr

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return new NextResponse(e?.message || "Server error", { status: 500 })
  }
}
