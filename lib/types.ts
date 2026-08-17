/**
 * Domain types for the existing NORA database schema.
 *
 * These mirror the `nora_*` tables. Fields are kept permissive/optional so the
 * app renders safely even if the live schema has additional or slightly
 * different columns. Access is always constrained by Supabase RLS.
 */

export type UUID = string

export type NoraStatus = "online" | "offline" | "idle" | "busy" | "error" | (string & {})

export interface NoraInstance {
  id: UUID
  name?: string | null
  status?: NoraStatus | null
  owner_id?: UUID | null
  description?: string | null
  version?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
  updated_at?: string | null
  last_active_at?: string | null
}

export type NoraRole = "owner" | "admin" | "user" | (string & {})

export interface NoraUser {
  id: UUID
  auth_id?: UUID | null
  user_id?: UUID | null
  email?: string | null
  display_name?: string | null
  full_name?: string | null
  role?: NoraRole | null
  is_owner?: boolean | null
  instance_id?: UUID | null
  created_at?: string | null
}

export interface NoraMemory {
  id: UUID
  user_id?: UUID | null
  instance_id?: UUID | null
  key?: string | null
  title?: string | null
  content?: string | null
  value?: string | null
  category?: string | null
  importance?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export interface NoraConversation {
  id: UUID
  user_id?: UUID | null
  instance_id?: UUID | null
  title?: string | null
  summary?: string | null
  created_at?: string | null
  updated_at?: string | null
  last_message_at?: string | null
}

export type MessageRole = "user" | "assistant" | "system" | "nora" | (string & {})

export interface NoraMessage {
  id: UUID
  conversation_id?: UUID | null
  user_id?: UUID | null
  role?: MessageRole | null
  sender?: string | null
  content?: string | null
  body?: string | null
  created_at?: string | null
}

export interface NoraCommand {
  id: UUID
  instance_id?: UUID | null
  user_id?: UUID | null
  name?: string | null
  command?: string | null
  description?: string | null
  enabled?: boolean | null
  is_enabled?: boolean | null
  created_at?: string | null
}

export interface NoraActivityLog {
  id: UUID
  user_id?: UUID | null
  instance_id?: UUID | null
  action?: string | null
  event?: string | null
  type?: string | null
  description?: string | null
  detail?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
}
