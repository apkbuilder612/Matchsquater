package com.matchsquater.app.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.matchsquater.app.SupabaseClientProvider
import com.matchsquater.app.model.Tournament
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns
import kotlinx.coroutines.launch

@Composable
fun HomeScreen(onLogout: () -> Unit) {
    var tournaments by remember { mutableStateOf<List<Tournament>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        try {
            tournaments = SupabaseClientProvider.client.postgrest["tournaments"]
                .select(Columns.list("id,title,game,target_players,status,announcement,created_at"))
                .decodeList()
        } catch (e: Exception) {
            error = e.message
        } finally {
            loading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Match Squater") },
                actions = {
                    TextButton(onClick = {
                        scope.launch {
                            SupabaseClientProvider.client.auth.signOut()
                            onLogout()
                        }
                    }) { Text("Ka bax") }
                }
            )
        }
    ) { padding ->
        Box(modifier = Modifier.padding(padding).fillMaxSize()) {
            when {
                loading -> CircularProgressIndicator(Modifier.align(androidx.compose.ui.Alignment.Center))
                error != null -> Text(
                    "Khalad: $error",
                    modifier = Modifier.align(androidx.compose.ui.Alignment.Center).padding(24.dp)
                )
                tournaments.isEmpty() -> Text(
                    "Hadda ma jiro tartan socda.",
                    modifier = Modifier.align(androidx.compose.ui.Alignment.Center)
                )
                else -> LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(tournaments) { t ->
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(16.dp)) {
                                Text(t.title, style = MaterialTheme.typography.titleMedium)
                                Spacer(Modifier.height(4.dp))
                                Text("${t.game} · ${t.status} · 🆓 Bilaash")
                                Text("Target: ${t.targetPlayers} tartame")
                            }
                        }
                    }
                }
            }
        }
    }
}
