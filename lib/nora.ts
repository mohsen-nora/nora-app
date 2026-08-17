import "server-only"

import { createClient } from "@/lib/supabase/server"
import type {
  NoraActivityLog,
  NoraCommand,
  NoraConversation,
  NoraInstance,
  NoraMemory,
  NoraMessage,
  NoraUser,
} from "@/lib/types"

export interface QueryResult<T> {
  data: T
  error: string | null
}

function ok<T>(data: T): QueryResult<T> {
  return { data, error: null }
}

function fail<T>(fallback: T, error: unknown): QueryResult<T> {
  const message = error instanceof Error ? error.message : "خطای ناشناخته در ارتباط با پایگاه داده"
  return { data: fallback, error: message }
}

/**
 * All queries below run through the RLS-protected anon client bound to the
 * user's session. Row visibility is enforced by the database, not here.
 */

export async function getInstances(): Promise<QueryResult<NoraInstance[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("nora_instances").select("*").order("created_at", { ascending: false })
    if (error) throw error
    return ok((data ?? []) as NoraInstance[])
  } catch (error) {
    return fail<NoraInstance[]>([], error)
  }
}

export async function getConversations(): Promise<QueryResult<NoraConversation[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("nora_conversations")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) throw error
    return ok((data ?? []) as NoraConversation[])
  } catch (error) {
    return fail<NoraConversation[]>([], error)
  }
}

export async function getMessages(conversationId?: string): Promise<QueryResult<NoraMessage[]>> {
  try {
    const supabase = await createClient()
    let query = supabase.from("nora_messages").select("*").order("created_at", { ascending: true })
    if (conversationId) query = query.eq("conversation_id", conversationId)
    const { data, error } = await query.limit(500)
    if (error) throw error
    return ok((data ?? []) as NoraMessage[])
  } catch (error) {
    return fail<NoraMessage[]>([], error)
  }
}

export async function getMemories(): Promise<QueryResult<NoraMemory[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("nora_memory").select("*").order("created_at", { ascending: false })
    if (error) throw error
    return ok((data ?? []) as NoraMemory[])
  } catch (error) {
    return fail<NoraMemory[]>([], error)
  }
}

/* -------------------- Owner-only reads -------------------- */

export async function getAllUsers(): Promise<QueryResult<NoraUser[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("nora_users").select("*").order("created_at", { ascending: false })
    if (error) throw error
    return ok((data ?? []) as NoraUser[])
  } catch (error) {
    return fail<NoraUser[]>([], error)
  }
}

export async function getCommands(): Promise<QueryResult<NoraCommand[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("nora_commands").select("*").order("created_at", { ascending: false })
    if (error) throw error
    return ok((data ?? []) as NoraCommand[])
  } catch (error) {
    return fail<NoraCommand[]>([], error)
  }
}

export async function getActivityLogs(limit = 100): Promise<QueryResult<NoraActivityLog[]>> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("nora_activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error) throw error
    return ok((data ?? []) as NoraActivityLog[])
  } catch (error) {
    return fail<NoraActivityLog[]>([], error)
  }
}
