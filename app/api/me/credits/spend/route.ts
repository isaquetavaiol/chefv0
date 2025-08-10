import { NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase/admin"

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (!token) return new NextResponse("Unauthorized", { status: 401 })

    const admin = getAdminClient()
    const { data: me, error: meErr } = await admin.auth.getUser(token)
    if (meErr || !me?.user) return new NextResponse("Unauthorized", { status: 401 })

    const { data: got, error: getErr } = await admin.auth.admin.getUserById(me.user.id)
    if (getErr || !got?.user) return new NextResponse("User not found", { status: 404 })

    const meta = (got.user.app_metadata || {}) as Record<string, any>
    const current = Number(meta.credits ?? 0)
    const next = Math.max(0, current - 1)

    if (next === current) {
      return NextResponse.json({ credits: current })
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(me.user.id, {
      app_metadata: { ...meta, credits: next },
    })
    if (updErr) throw updErr

    return NextResponse.json({ credits: next })
  } catch (e: any) {
    return new NextResponse(e?.message || "Server error", { status: 500 })
  }
}
