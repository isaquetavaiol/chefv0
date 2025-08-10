import { NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase/admin"
import { isEmailAdmin } from "@/lib/admin"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const query = (url.searchParams.get("query") || "").toLowerCase().trim()
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (!token) return new NextResponse("Unauthorized", { status: 401 })

    const admin = getAdminClient()
    // Verifica o usuário que está chamando
    const { data: me, error: meErr } = await admin.auth.getUser(token)
    if (meErr || !me?.user) return new NextResponse("Unauthorized", { status: 401 })
    if (!isEmailAdmin(me.user.email || "")) return new NextResponse("Forbidden", { status: 403 })

    if (!query) return NextResponse.json([])

    const pageSize = 50
    let page = 1
    const collected: any[] = []
    for (; page <= 5; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: pageSize })
      if (error) break
      const batch = (data?.users || []).filter((u) => (u.email || "").toLowerCase().includes(query))
      collected.push(...batch)
      if ((data?.users?.length || 0) < pageSize) break
    }

    const rows = collected.slice(0, 20).map((u) => ({
      id: u.id,
      email: u.email,
      plan: (u.app_metadata?.plan as "pro" | "freemium") || "freemium",
      credits: Number(u.app_metadata?.credits ?? 0),
    }))

    return NextResponse.json(rows)
  } catch (e: any) {
    return new NextResponse(e?.message || "Server error", { status: 500 })
  }
}
