package com.zisamale.ui.screen

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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

data class PregnancyDraft(
    val womanName: String,
    val age: Int,
    val parity: Int,
    val gravida: Int,
    val lmpDate: String?,
    val eddDate: String?,
    val priorStillbirths: Int,
    val priorCsections: Int,
    val priorPph: Int,
    val hivStatus: String?,
    val bpSystolic: Int?,
    val bpDiastolic: Int?,
    val hemoglobin: Float?,
    val dangerSigns: Set<String>,
)

@Composable
fun RegisterPregnancyScreen(
    householdId: String,
    onSubmit: (PregnancyDraft) -> Unit,
    onBack: () -> Unit,
) {
    var womanName by remember { mutableStateOf("") }
    var age by remember { mutableStateOf(25) }
    var parity by remember { mutableStateOf(0) }
    var gravida by remember { mutableStateOf(1) }
    var lmpDate by remember { mutableStateOf("") }
    var priorStillbirths by remember { mutableStateOf(0) }
    var priorCsections by remember { mutableStateOf(0) }
    var priorPph by remember { mutableStateOf(0) }
    var hivStatus by remember { mutableStateOf<String?>(null) }
    var bpSystolic by remember { mutableStateOf("") }
    var bpDiastolic by remember { mutableStateOf("") }
    var hemoglobin by remember { mutableStateOf("") }
    var dangerSignsSelected by remember { mutableStateOf(setOf<String>()) }

    // EDD auto-calculation: LMP + 280 days
    val eddDate = remember(lmpDate) {
        try {
            if (lmpDate.isNotBlank()) {
                val lmp = LocalDate.parse(lmpDate, DateTimeFormatter.ISO_LOCAL_DATE)
                lmp.plusDays(280).format(DateTimeFormatter.ISO_LOCAL_DATE)
            } else null
        } catch (_: Exception) { null }
    }

    val canSave = womanName.isNotBlank() && age in 12..55

    val dangerSignOptions = listOf(
        "Severe headache" to "Mutu wolemetsa",
        "Blurred vision" to "Maso osanenepa",
        "Bleeding" to "Kutuluka magazi",
        "Severe abdominal pain" to "Kuuma m'mimba",
        "Fever >38C" to "Kutentha thupi",
        "Reduced fetal movement" to "Simva mwana akuyenda",
        "Severe vomiting" to "Kunyansa kwambiri",
        "Convulsions" to "Kugwada",
    )

    val hivOptions = listOf("negative", "positive", "unknown", "declined")

    Column(modifier = Modifier.fillMaxSize()) {
        Masthead(
            title = "Register Pregnancy",
            subtitle = "Yambitsani mimba",
            showRule = true,
            onBack = onBack,
            actions = {
                TextButton(
                    onClick = {
                        onSubmit(PregnancyDraft(
                            womanName = womanName.trim(),
                            age = age,
                            parity = parity,
                            gravida = gravida,
                            lmpDate = lmpDate.ifBlank { null },
                            eddDate = eddDate,
                            priorStillbirths = priorStillbirths,
                            priorCsections = priorCsections,
                            priorPph = priorPph,
                            hivStatus = hivStatus,
                            bpSystolic = bpSystolic.toIntOrNull(),
                            bpDiastolic = bpDiastolic.toIntOrNull(),
                            hemoglobin = hemoglobin.toFloatOrNull(),
                            dangerSigns = dangerSignsSelected,
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
                value = womanName,
                onValueChange = { womanName = it },
                label = { Text("Woman's Name / Dzina la mkazi") },
                modifier = Modifier.fillMaxWidth(),
            )
            StepperField("Age / Zaka", age, 12..55) { age = it }
            StepperField("Gravida", gravida, 1..20) { gravida = it }
            StepperField("Parity", parity, 0..15) { parity = it }
            OutlinedTextField(
                value = lmpDate,
                onValueChange = { lmpDate = it },
                label = { Text("LMP Date (YYYY-MM-DD)") },
                modifier = Modifier.fillMaxWidth(),
            )
            if (eddDate != null) {
                Surface(
                    color = Sage.copy(alpha = 0.1f),
                    border = BorderStroke(1.dp, Sage),
                    shape = RoundedCornerShape(2.dp),
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp).fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text("EDD (auto)", style = MaterialTheme.typography.bodyMedium)
                        Text(eddDate!!, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // Section 02 — Medical History
            SectionHeader("02", "Medical History / Mbiri ya Za Saula")
            ToggleField("Prior stillbirths?", priorStillbirths > 0) { priorStillbirths = if (it) 1 else 0 }
            ToggleField("Prior C-sections?", priorCsections > 0) { priorCsections = if (it) 1 else 0 }
            ToggleField("Prior PPH?", priorPph > 0) { priorPph = if (it) 1 else 0 }
            Text("HIV Status / Momwe muliri ndi HIV", style = MaterialTheme.typography.bodySmall, color = MutedInk)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                hivOptions.forEach { opt ->
                    FilterChip(
                        selected = hivStatus == opt,
                        onClick = { hivStatus = if (hivStatus == opt) null else opt },
                        label = { Text(opt.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.bodySmall) },
                    )
                }
            }

            // Section 03 — Vital Signs
            SectionHeader("03", "Vital Signs / Zizowoyera za Thupi")
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = bpSystolic,
                    onValueChange = { bpSystolic = it.filter { c -> c.isDigit() } },
                    label = { Text("BP Systolic") },
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = bpDiastolic,
                    onValueChange = { bpDiastolic = it.filter { c -> c.isDigit() } },
                    label = { Text("BP Diastolic") },
                    modifier = Modifier.weight(1f),
                )
            }
            OutlinedTextField(
                value = hemoglobin,
                onValueChange = { hemoglobin = it },
                label = { Text("Hemoglobin (g/dL)") },
                modifier = Modifier.fillMaxWidth(),
            )

            // Section 04 — Danger Signs
            SectionHeader("04", "Danger Signs / Zizowoyera")
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

            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
internal fun SectionHeader(number: String, title: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(number, style = MaterialTheme.typography.titleMedium, color = Terracotta, fontWeight = FontWeight.Bold)
        Text(title, style = MaterialTheme.typography.titleMedium)
    }
    Divider(color = WarmStone, thickness = 1.dp)
}

@Composable
private fun StepperField(label: String, value: Int, range: IntRange, onValueChange: (Int) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium)
        Row(verticalAlignment = Alignment.CenterVertically) {
            Button(
                onClick = { if (value > range.first) onValueChange(value - 1) },
                enabled = value > range.first,
                modifier = Modifier.size(40.dp),
                contentPadding = PaddingValues(0.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Pine),
            ) { Text("-", color = Parchment) }
            Text("  $value  ", style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Bold)
            Button(
                onClick = { if (value < range.last) onValueChange(value + 1) },
                enabled = value < range.last,
                modifier = Modifier.size(40.dp),
                contentPadding = PaddingValues(0.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Pine),
            ) { Text("+", color = Parchment) }
        }
    }
}

@Composable
private fun ToggleField(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().clickable { onCheckedChange(!checked) },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, style = MaterialTheme.typography.bodyMedium)
        Checkbox(checked = checked, onCheckedChange = onCheckedChange)
    }
}
