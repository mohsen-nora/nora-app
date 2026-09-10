import { redirect } from "next/navigation"
import { getSessionContext } from "@/lib/authz"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const ctx = await getSessionContext()
  if (!ctx) redirect("/auth/login?next=/dashboard")
  redirect("/chat")
}
