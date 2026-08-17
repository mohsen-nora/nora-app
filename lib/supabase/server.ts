import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Server Supabase client. Create a new instance within each function
 * (do not store in a global) so Fluid compute stays request-isolated.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: { secure: process.env.NODE_ENV === "production" },
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a Server Component. Safe to ignore because the
          // proxy/middleware refreshes the session.
        }
      },
    },
  })
}
