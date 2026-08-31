import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { NoraUser } from "@/lib/types"
import type { User } from "@supabase/supabase-js"

export interface SessionContext {
  authUser: User
  profile: NoraUser | null
  isOwner: boolean
}

/** Resolve the current auth user and their Nora profile. */
export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // In the live Nora schema, nora_users.id is the Supabase auth user id.
  const { data: profileRow } = await supabase
    .from("nora_users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  const profile = (profileRow as NoraUser | null) ?? null
  const isOwner = (profile?.role ?? "").toLowerCase() === "owner"

  return { authUser: user, profile, isOwner }
}

/** Server-side guard for owner-only resources. */
export async function requireOwner(): Promise<SessionContext | null> {
  const ctx = await getSessionContext()
  if (!ctx || !ctx.isOwner) return null
  return ctx
}
