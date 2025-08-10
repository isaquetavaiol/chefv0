import { NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase/admin"
import { isAdminUser, isEmailAdmin } from "@/lib/admin"

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (!token) return new NextResponse("Unauthorized", { status: 401 })

    const admin = getAdminClient()

    // Who is calling?
    const { data: me, error: meErr } = await admin.auth.getUser(token)
    if (meErr || !me?.user) return new NextResponse("Unauthorized", { status: 401 })
    const caller = me.user

    // If already admin, nothing to do
    if (isAdminUser(caller)) {
      return NextResponse.json({ ok: true, already: true })
    }

    // Check if there is any admin in the project (by email allowlist or app_metadata)
    let anyAdmin = false
    const pageSize = 50
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: pageSize })
      if (error) break
      const users = data?.users || []
      if (
        users.some(
          (u) =>
            isEmailAdmin(u.email || "") ||
            (u.app_metadata && (u.app_metadata as any).admin === true) ||
            (u.app_metadata && (u.app_metadata as any).role === "admin"),
        )
      ) {
        anyAdmin = true
        break
      }
      if (users.length < pageSize) break
    }

    if (anyAdmin) {
      return new NextResponse("Already initialized", { status: 409 })
    }

    // Bootstrap: make caller admin
    const { error: updErr } = await admin.auth.admin.updateUserById(caller.id, {
      app_metadata: { ...(caller.app_metadata || {}), admin: true },
    })
    if (updErr) throw updErr

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return new NextResponse(e?.message || "Server error", { status: 500 })
  }
}
