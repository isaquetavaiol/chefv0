export const ADMIN_EMAILS: string[] = ["isaque.tavaiol@aluno.gaspar.sc.gov.br"]

export function isEmailAdmin(email: string) {
  if (!email) return false
  const list = process.env.ADMIN_EMAILS
    ? String(process.env.ADMIN_EMAILS)
        .split(",")
        .map((e) => e.toLowerCase().trim())
    : ADMIN_EMAILS.map((e) => e.toLowerCase().trim())
  return list.includes(email.toLowerCase().trim())
}

export function isAdminUser(u: { email?: string | null; app_metadata?: any }) {
  const emailOk = isEmailAdmin(u?.email || "")
  const meta = (u?.app_metadata || {}) as Record<string, any>
  const metaOk = meta.admin === true || meta.role === "admin"
  return emailOk || metaOk
}
