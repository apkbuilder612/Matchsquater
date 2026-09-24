package com.matchsquater.app

import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.postgrest.Postgrest

object SupabaseClientProvider {

    const val SUPABASE_URL = "https://wgqpakywdbmqnsacusxr.supabase.co"
    const val SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndncXBha3l3ZGJtcW5zYWN1c3hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNTYxNjksImV4cCI6MjEwNTczMjE2OX0.yodWk8SKi89txbvXcKfsDL6FnVhp9q-jBumOokCSSMw"
    const val SUPER_ADMIN_EMAIL = "khaliabdullahi63@gmail.com"

    val client = createSupabaseClient(
        supabaseUrl = SUPABASE_URL,
        supabaseKey = SUPABASE_ANON_KEY
    ) {
        install(Auth) {
            scheme = "matchsquater"
            host = "login-callback"
        }
        install(Postgrest)
    }
}
