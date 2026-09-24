package com.matchsquater.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.matchsquater.app.SupabaseClientProvider
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Email
import kotlinx.coroutines.launch

@Composable
fun SignUpScreen(onGoToLogin: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var done by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text("Is-diiwaan Geli", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(24.dp))

        if (done) {
            Text("✅ Hubi email-kaaga si aad u xaqiijiso account-ka, dabadeed soo gal.")
            Spacer(Modifier.height(16.dp))
            TextButton(onClick = onGoToLogin) { Text("Dib ugu noqo Login") }
            return@Column
        }

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password (ugu yaraan 6 xaraf)") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth()
        )

        error?.let {
            Spacer(Modifier.height(8.dp))
            Text(it, color = MaterialTheme.colorScheme.error)
        }

        Spacer(Modifier.height(20.dp))
        Button(
            onClick = {
                error = null
                loading = true
                scope.launch {
                    try {
                        SupabaseClientProvider.client.auth.signUpWith(Email) {
                            this.email = email
                            this.password = password
                        }
                        done = true
                    } catch (e: Exception) {
                        error = e.message ?: "Khalad ayaa dhacay"
                    } finally {
                        loading = false
                    }
                }
            },
            enabled = !loading && email.isNotBlank() && password.length >= 6,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(if (loading) "..." else "Samee Account")
        }

        Spacer(Modifier.height(12.dp))
        TextButton(onClick = onGoToLogin) {
            Text("Horey account ayaad u lahayd? Soo gal")
        }
    }
}
