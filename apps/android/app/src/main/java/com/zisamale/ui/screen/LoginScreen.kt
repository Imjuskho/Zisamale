package com.zisamale.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.zisamale.ui.component.*
import com.zisamale.ui.theme.*

/**
 * Login — editorial cover page.
 *
 * Intent:     Grace at dawn, fatigued eyes, bright light. Get in fast.
 * Hierarchy:  Masthead leads (serif name), Sign In button is focal action.
 * Palette:    Parchment canvas, Ink text, Pine button, Blood error.
 */
@Composable
fun LoginScreen(
    onLogin: (username: String, password: String) -> Unit,
    error: String? = null,
    loading: Boolean = false,
) {
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(100.dp))

        // Masthead
        Masthead(
            title = "Zisamale",
            subtitle = "Community Health Intelligence",
            showRule = true,
        )

        Spacer(Modifier.height(40.dp))

        // Fields
        OutlinedTextField(
            value = username,
            onValueChange = { username = it },
            label = { Text("Username / Dzina") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )

        Spacer(Modifier.height(12.dp))

        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password / Chinsinsi") },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )

        Spacer(Modifier.height(20.dp))

        // Error
        error?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.bodySmall,
                color = Blood,
            )
            Spacer(Modifier.height(12.dp))
        }

        // Sign in
        Button(
            onClick = { onLogin(username, password) },
            enabled = !loading && username.isNotBlank() && password.isNotBlank(),
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = MaterialTheme.shapes.medium,
        ) {
            Text(
                if (loading) "Signing in… / Kuyambirirana…"
                else "Sign in / Lowani",
                style = MaterialTheme.typography.titleMedium,
            )
        }
    }
}
