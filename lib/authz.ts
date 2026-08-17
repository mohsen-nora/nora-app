import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { NoraUser } from "@/lib/types"
import type { User } from "@supabase/supabase-js"

export interface SessionContext {
  authUser: User
  profile: NoraUser | null
  isOwner: boolean
}

/**
 * Resolve the current session, the matching `nora_users` profile, and whether
 * this user is an owner.
 *
 * IMPORTANT: This is a convenience read for the UI. It is NOT the security
 * boundary. Authorization is ultimately enforced by Supabase Row Level
 * Security on the `nora_*` tables and, for privileged reads, by an additional
 * server-side owner assertion (`requireOwner`). Never rely on hiding UI alone.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Match the profile row against whichever identity column the schema uses.
  const { data: profiles } = await supabase
    .from("nora_users")
    .select("*")
    .or(`id.eq.${user.id},user_id.eq.${user.id},auth_id.eq.${user.id}`)
    .limit(1)

  const profile = (profiles?.[0] as NoraUser | undefined) ?? null

  const isOwner = await computeIsOwner(user.id, profile)

  return { authUser: user, profile, isOwner }
}

/**
 * Determine owner status from the database. This queries `nora_instances`
 * (owner_id) in addition to the profile role so that access cannot be granted
 * client-side. RLS still governs which rows are visible.
 */
async function computeIsOwner(authUserId: string, profile: NoraUser | null): Promise<boolean> {
  if (profile) {
    if (profile.is_owner === true) return true
    const role = (profile.role ?? "").toString().toLowerCase()
    if (role === "owner" || role === "admin") return true
  }

  const supabase = await createClient()
  const { data: owned } = await supabase.from("nora_instances").select("id").eq("owner_id", authUserId).limit(1)

  return Boolean(owned && owned.length > 0)
}

/**
 * Server-side guard for owner-only resources. Returns the session context when
 * the user is a verified owner, otherwise null. Callers must handle null by
 * denying access (redirect / 403) — never by conditionally rendering UI.
 */
export async function requireOwner(): Promise<SessionContext | null> {
  const ctx = await getSessionContext()
  if (!ctx || !ctx.isOwner) return null
  return ctx
}
