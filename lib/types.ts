/** Domain types matching the live nora_* Supabase tables. */

export type UUID = string
export type NoraRole = "owner" | "admin" | "user" | (string & {})
export type NoraStatus = "online" | "offline" | "idle" | "busy" | "error" | (string & {})

export interface NoraInstance {
  id: UUID
  name: string
  description?: string | null
  system_prompt?: string | null
  personality?: Record<string, unknown> | null
  settings?: Record<string, unknown> | null
  is_active?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

export interface NoraUser {
  id: UUID
  nora_id?: UUID | null
  name?: string | null
  email?: string | null
  role: NoraRole
  profile?: Record<string, unknown> | null
  created_at?: string | null
}

export interface NoraMemory {
  id: UUID
  nora_id?: UUID | null
  user_id?: UUID | null
  memory_type: string
  content: string
  importance?: number | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
  updated_at?: string | null
}

export interface NoraConversation {
  id: UUID
  nora_id?: UUID | null
  user_id?: UUID | null
  title?: string | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
  updated_at?: string | null
}

export type MessageRole = "user" | "assistant" | "system" | "nora" | (string & {})

export interface NoraMessage {
  id: UUID
  conversation_id?: UUID | null
  role: MessageRole
  content: string
  metadata?: Record<string, unknown> | null
  created_at?: string | null
}

export interface NoraCommand {
  id: UUID
  nora_id?: UUID | null
  command: string
  payload?: Record<string, unknown> | null
  created_at?: string | null
}

export interface NoraActivityLog {
  id: UUID
  nora_id?: UUID | null
  user_id?: UUID | null
  action: string
  metadata?: Record<string, unknown> | null
  created_at?: string | null
}
