package com.zisamale.ui.screen

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.zisamale.ui.component.*
import com.zisamale.ui.theme.*
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

data class ChildDraft(
    val childName: String,
    val dob: String?,
    val sex: String?,
    val birthWeightKg: Float?,
    val muac: Float?,
    val weightKg: Float?,
    val heightCm: Float?,
    val dangerSigns: Set<String>,
    val symptoms: Set<String>,
)

@Composable
fun RegisterChildScreen(
    householdId: String,
    onSubmit: (ChildDraft) -> Unit,
    onBack: () -> Unit,
) {
    var childName by remember { mutableStateOf("") }
    var dob by remember { mutableStateOf("") }
    var sex by remember { mutableStateOf<String?>(null) }
    var birthWeight by remember { mutableStateOf("") }
    var muac by remember { mutableStateOf("") }
    var weightKg by remember { mutableStateOf("") }
    var heightCm by remember { mutableStateOf("") }
    var dangerSignsSelected by remember { mutableStateOf(setOf<String>()) }
    var symptomsSelected by remember { mutableStateOf(setOf<String>()) }

    val ageMonths = remember(dob) {
        try {
            if (dob.isNotBlank()) {
                val birthDate = LocalDate.parse(dob, DateTimeFormatter.ISO_LOCAL_DATE)
                ChronoUnit.MONTHS.between(birthDate, LocalDate.now()).toInt().coerceAtLeast(0)
            } else null
        } catch (_: Exception) { null }
    }

    val canSave = childName.isNotBlank()

    val dangerSignOptions = listOf(
        "Fast breathing" to "Kufesa mwachangu",
        "Chest indrawing" to "Kutupa mimba",
        "Unable to drink/breastfeed" to "Sangamwe/angodya",
        "Vomits everything" to "Kunyansa zonse",
        "Convulsions" to "Kugwada",
        "Unconscious/lethargic" to "Wofoka/samva",
        "Stiff neck" to "Kuuma khosi",
        "Bulging fontanelle" to "Kutupa pamutu",
    )

    val symptomOptions = listOf(
        "Fever" to "Kutentha thupi",
        "Cough" to "Kupuma",
        "Diarrhea" to "KuGISI",
        "Ear pain" to "Kuuma khutu",
        "Skin rash" to "Chigamba pa thupi",
        "Eye discharge" to "Zitsemo m'maso",
    )

    Column(modifier = Modifier.fillMaxSize()) {
        Masthead(
            title = "Register Child",
            subtitle = "Yambitsani mwana",
            showRule = true,
            onBack = onBack,
            actions = {
                TextButton(
                    onClick = {
                        onSubmit(ChildDraft(
                            childName = childName.trim(),
                            dob = dob.ifBlank { null },
                            sex = sex,
                            birthWeightKg = birthWeight.toFloatOrNull(),
                            muac = muac.toFloatOrNull(),
                            weightKg = weightKg.toFloatOrNull(),
                            heightCm = heightCm.toFloatOrNull(),
                            dangerSigns = dangerSignsSelected,
                            symptoms = symptomsSelected,
                        ))
                    },
                    enabled = canSave,
                ) {
                    Text("Save", color = if (canSave) Pine else MutedInk)
                }
            },
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Spacer(Modifier.height(4.dp))

            // Section 01 — Identity
            SectionHeader("01", "Identity / Zidziwiro")
            OutlinedTextField(
                value = childName,
                onValueChange = { childName = it },
                label = { Text("Child's Name / Dzina la mwana") },
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = dob,
                onValueChange = { dob = it },
                label = { Text("Date of Birth (YYYY-MM-DD)") },
                modifier = Modifier.fillMaxWidth(),
            )
            if (ageMonths != null) {
                Text("Age: $ageMonths months", style = MaterialTheme.typography.bodySmall, color = MutedInk)
            }
            Text("Sex / Chibadwa", style = MaterialTheme.typography.bodySmall, color = MutedInk)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("male" to "Male / Amuna", "female" to "Female / Akazi").forEach { (value, label) ->
                    FilterChip(
                        selected = sex == value,
                        onClick = { sex = if (sex == value) null else value },
                        label = { Text(label, style = MaterialTheme.typography.bodySmall) },
                    )
                }
            }
            OutlinedTextField(
                value = birthWeight,
                onValueChange = { birthWeight = it },
                label = { Text("Birth Weight (kg)") },
                modifier = Modifier.fillMaxWidth(),
            )

            // Section 02 — Measurements
            SectionHeader("02", "Measurements / Kulemera")
            OutlinedTextField(
                value = muac,
                onValueChange = { muac = it },
                label = { Text("MUAC (cm)") },
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = weightKg,
                onValueChange = { weightKg = it },
                label = { Text("Weight (kg)") },
                modifier = Modifier.fillMaxWidth(),
            )
            OutlinedTextField(
                value = heightCm,
                onValueChange = { heightCm = it },
                label = { Text("Height (cm)") },
                modifier = Modifier.fillMaxWidth(),
            )

            // Section 03 — Danger Signs (iCCM)
            SectionHeader("03", "Danger Signs / Zizowoyera")
            dangerSignOptions.chunked(2).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    row.forEach { (en, ny) ->
                        FieldChip(
                            label = en,
                            selected = en in dangerSignsSelected,
                            onClick = {
                                dangerSignsSelected = if (en in dangerSignsSelected) dangerSignsSelected - en
                                               else dangerSignsSelected + en
                            },
                            caption = ny,
                            modifier = Modifier.weight(1f),
                        )
                    }
                    if (row.size == 1) Spacer(modifier = Modifier.weight(1f))
                }
            }

            // Section 04 — Symptoms
            SectionHeader("04", "Symptoms / Zizowoyera")
            symptomOptions.chunked(2).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    row.forEach { (en, ny) ->
                        FieldChip(
                            label = en,
                            selected = en in symptomsSelected,
                            onClick = {
                                symptomsSelected = if (en in symptomsSelected) symptomsSelected - en
                                              else symptomsSelected + en
                            },
                            caption = ny,
                            modifier = Modifier.weight(1f),
                        )
                    }
                    if (row.size == 1) Spacer(modifier = Modifier.weight(1f))
                }
            }

            Spacer(Modifier.height(16.dp))
        }
    }
}
