package com.matchsquater.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.matchsquater.app.ui.HomeScreen
import com.matchsquater.app.ui.LoginScreen
import com.matchsquater.app.ui.SignUpScreen
import io.github.jan.supabase.auth.SessionStatus
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.handleDeeplinks

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // If the app was opened from a Supabase email-confirmation deep link
        intent?.let { SupabaseClientProvider.client.handleDeeplinks(it) }

        setContent {
            MaterialTheme {
                Surface(modifier = Modifier) {
                    AppNav()
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        SupabaseClientProvider.client.handleDeeplinks(intent)
    }
}

@androidx.compose.runtime.Composable
fun AppNav() {
    val navController = rememberNavController()
    val sessionStatus by SupabaseClientProvider.client.auth.sessionStatus.collectAsState()

    LaunchedEffect(sessionStatus) {
        when (sessionStatus) {
            is SessionStatus.Authenticated -> navController.navigate("home") {
                popUpTo(0)
            }
            else -> Unit
        }
    }

    NavHost(navController = navController, startDestination = "login") {
        composable("login") {
            LoginScreen(
                onLoggedIn = { navController.navigate("home") { popUpTo(0) } },
                onGoToSignUp = { navController.navigate("signup") }
            )
        }
        composable("signup") {
            SignUpScreen(onGoToLogin = { navController.popBackStack() })
        }
        composable("home") {
            HomeScreen(onLogout = { navController.navigate("login") { popUpTo(0) } })
        }
    }
}
