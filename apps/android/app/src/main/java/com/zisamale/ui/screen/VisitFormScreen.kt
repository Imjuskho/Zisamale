package com.zisamale.ui.screen

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.zisamale.ml.VisitAdvice

data class VisitSubmit(
    val dangerSigns: Set<String>,
    val notes: String,
    val override: Boolean,
    val overrideReason: String?,
    val advice: VisitAdvice?
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VisitFormScreen(
    householdId: String,
    visitType: String,
    advice: VisitAdvice?,
    onDangerSignsChange: (Set<String>) -> Unit = {},
    onSubmit: (VisitSubmit) -> Unit
) {
    var notes by remember { mutableStateOf("") }
    var dangerSignsSelected by remember { mutableStateOf(setOf<String>()) }
    var showOverrideReason by remember { mutableStateOf(false) }
    var overrideReason by remember { mutableStateOf("") }

    val dangerSignOptions = when (visitType) {
        "pregnancy" -> listOf(
            "Severe headache", "Blurred vision", "Vaginal bleeding",
            "Severe abdominal pain", "Fever >38C", "Oedema of face/hands",
            "Convulsions", "No fetal movement"
        )
        "child" -> listOf(
            "Inability to drink/breastfeed", "Vomiting everything",
            "Convulsions", "Lethargic/unconscious", "Fast/difficult breathing",
            "Chest indrawing", "Severe malnutrition (oedema)", "Fever >39C"
        )
        else -> listOf("Fever", "Cough", "Diarrhea", "Vomiting", "Other")
    }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Visit Form - ${visitType.replaceFirstChar { it.uppercase() }}") })
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Text("Household: $householdId", style = MaterialTheme.typography.bodySmall)

            Spacer(modifier = Modifier.height(16.dp))

            Text("Danger Signs", style = MaterialTheme.typography.titleMedium)

            dangerSignOptions.forEach { sign ->
                Row(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
                    Checkbox(
                        checked = sign in dangerSignsSelected,
                        onCheckedChange = { checked ->
                            dangerSignsSelected = if (checked) dangerSignsSelected + sign
                            else dangerSignsSelected - sign
                            onDangerSignsChange(dangerSignsSelected)
                        }
                    )
                    Text(sign, modifier = Modifier.padding(top = 12.dp))
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text("CHW Notes") },
                modifier = Modifier.fillMaxWidth().height(120.dp)
            )

            Spacer(modifier = Modifier.height(24.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.tertiaryContainer
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("AI recommendation (advisory)", style = MaterialTheme.typography.titleSmall)
                    if (advice == null) {
                        Text(
                            "Score this visit from the household register. Advice is not a diagnosis.",
                            style = MaterialTheme.typography.bodySmall
                        )
                    } else {
                        Text(
                            "Risk ${advice.score.riskScore} (${advice.score.riskCategory.name.lowercase()}) — ${advice.action.replace('_', ' ')}",
                            style = MaterialTheme.typography.bodyMedium
                        )
                        advice.score.topFactors.forEach { factor ->
                            Text("• $factor", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }

            if (showOverrideReason) {
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = overrideReason,
                    onValueChange = { overrideReason = it },
                    label = { Text("Why do you disagree?") },
                    modifier = Modifier.fillMaxWidth(),
                    supportingText = {
                        Text("Required. Overrides train the next model.")
                    }
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(
                    onClick = {
                        if (!showOverrideReason) {
                            showOverrideReason = true
                        } else if (overrideReason.isNotBlank()) {
                            onSubmit(
                                VisitSubmit(
                                    dangerSigns = dangerSignsSelected,
                                    notes = notes,
                                    override = true,
                                    overrideReason = overrideReason.trim(),
                                    advice = advice
                                )
                            )
                        }
                    },
                    enabled = !showOverrideReason || overrideReason.isNotBlank(),
                    modifier = Modifier.weight(1f)
                ) {
                    Text(if (showOverrideReason) "Submit override" else "I disagree")
                }
                Button(
                    onClick = {
                        onSubmit(
                            VisitSubmit(
                                dangerSigns = dangerSignsSelected,
                                notes = notes,
                                override = false,
                                overrideReason = null,
                                advice = advice
                            )
                        )
                    },
                    modifier = Modifier.weight(1f)
                ) {
                    Text("Accept & submit")
                }
            }
        }
    }
}
