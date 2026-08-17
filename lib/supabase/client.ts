import { createBrowserClient } from "@supabase/ssr"

/**
 * Browser Supabase client. Uses only the public anon key and public URL.
 * Never reference service-role or other secret keys in client code.
 */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    // Secure cookies in production; not in dev, so the preview still works.
    cookieOptions: { secure: process.env.NODE_ENV === "production" },
  })
}
