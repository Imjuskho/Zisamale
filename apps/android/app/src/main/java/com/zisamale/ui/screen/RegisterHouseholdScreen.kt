package com.zisamale.ui.screen

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.zisamale.ui.component.Masthead
import com.zisamale.ui.theme.*
import com.zisamale.util.GpsFix
import com.zisamale.util.LocationHelper

data class NewHouseholdDraft(
    val villageName: String,
    val taName: String?,
    val householdSize: Int?,
    val waterSource: String?,
    val distanceKm: Double?,
    val gps: GpsFix?
)

/**
 * Register Household — grouped sections, bilingual labels.
 *
 * Intent:     Quick field entry between households; sections reduce cognitive load.
 * Hierarchy:  Section labels guide the eye, Save button is focal.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterHouseholdScreen(
    onSubmit: (NewHouseholdDraft) -> Unit,
    onCancel: () -> Unit,
) {
    val context = LocalContext.current
    var village by remember { mutableStateOf("") }
    var ta by remember { mutableStateOf("") }
    var sizeText by remember { mutableStateOf("") }
    var waterSource by remember { mutableStateOf<String?>(null) }
    var waterExpanded by remember { mutableStateOf(false) }
    var distanceText by remember { mutableStateOf("") }
    var gps by remember { mutableStateOf<GpsFix?>(null) }
    var gpsMessage by remember { mutableStateOf<String?>(null) }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        if (grants.values.any { it }) {
            LocationHelper.getCurrent(context) { fix, error ->
                gps = fix ?: gps
                gpsMessage = error
            }
        } else {
            gpsMessage = "Location permission denied."
        }
    }

    fun captureGps() {
        if (LocationHelper.hasPermission(context)) {
            LocationHelper.getCurrent(context) { fix, error ->
                gps = fix ?: gps
                gpsMessage = error
            }
        } else {
            permissionLauncher.launch(arrayOf(
                android.Manifest.permission.ACCESS_FINE_LOCATION,
                android.Manifest.permission.ACCESS_COARSE_LOCATION,
            ))
        }
    }

    val size = sizeText.toIntOrNull()
    val distance = distanceText.toDoubleOrNull()
    val canSave = village.isNotBlank() && (size == null || size > 0)

    Column(modifier = Modifier.fillMaxSize()) {
        Masthead(
            title = "Register Household",
            subtitle = "Yambitsani nyumba",
            showRule = true,
            onBack = onCancel,
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Spacer(Modifier.height(4.dp))

            // Section: WHERE
            SectionLabel("Where / Kuti")
            OutlinedTextField(
                value = village,
                onValueChange = { village = it },
                label = { Text("Village / Mudzi *") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            OutlinedTextField(
                value = ta,
                onValueChange = { ta = it },
                label = { Text("Traditional Authority (TA)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            // Section: WHO
            SectionLabel("Who / Anthu")
            OutlinedTextField(
                value = sizeText,
                onValueChange = { sizeText = it.filter(Char::isDigit).take(2) },
                label = { Text("People in household / Anthu m'nyumba") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            // Section: WATER & DISTANCE
            SectionLabel("Water & distance / Madzi ndi kutalika")
            ExposedDropdownMenuBox(
                expanded = waterExpanded,
                onExpandedChange = { waterExpanded = it }
            ) {
                OutlinedTextField(
                    value = waterSource ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Primary water source / Chizowiro") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = waterExpanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = waterExpanded,
                    onDismissRequest = { waterExpanded = false }
                ) {
                    listOf(
                        "Borehole / Bowa" to "Borehole",
                        "Protected well / Phuluso lowotchedwa" to "Protected well",
                        "Unprotected well / Phuluso losatetezedwa" to "Unprotected well",
                        "Piped/tap / Pa buluu" to "Piped/tap",
                        "River/lake / Nyanja" to "River/lake",
                        "Other / Zina" to "Other",
                    ).forEach { (display, value) ->
                        DropdownMenuItem(
                            text = { Text(display) },
                            onClick = {
                                waterSource = value
                                waterExpanded = false
                            }
                        )
                    }
                }
            }
            OutlinedTextField(
                value = distanceText,
                onValueChange = { distanceText = it.filter { c -> c.isDigit() || c == '.' }.take(6) },
                label = { Text("Distance to facility (km) / Kutalika ku chipatala") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )

            // Section: LOCATION
            SectionLabel("Location / Malo")
            Surface(
                color = CardParchment,
                border = androidx.compose.foundation.BorderStroke(1.dp, WarmStone),
                shape = androidx.compose.foundation.shape.RoundedCornerShape(2.dp),
            ) {
                Column(Modifier.padding(14.dp)) {
                    if (gps != null) {
                        Text(
                            "%.5f, %.5f%s".format(
                                gps!!.lat, gps!!.lon,
                                gps!!.accuracyM?.let { " (±${it.toInt()}m)" } ?: ""
                            ),
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium,
                        )
                    } else {
                        Text(
                            "No fix yet / Palibe kusintha",
                            style = MaterialTheme.typography.bodySmall,
                            color = MutedInk,
                        )
                    }
                    gpsMessage?.let {
                        Spacer(Modifier.height(4.dp))
                        Text(it, style = MaterialTheme.typography.bodySmall, color = Terracotta)
                    }
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(onClick = ::captureGps) {
                        Icon(Icons.Default.LocationOn, null)
                        Spacer(Modifier.width(6.dp))
                        Text(if (gps == null) "Capture / Tangululani" else "Re-capture /뻼sinthani")
                    }
                }
            }

            Spacer(Modifier.height(16.dp))
        }

        // Sticky save footer — outside scrollable area
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(CardParchment)
                .border(1.dp, WarmStone, RoundedCornerShape(2.dp))
                .padding(horizontal = 16.dp, vertical = 10.dp),
        ) {
            Button(
                    onClick = {
                        onSubmit(NewHouseholdDraft(
                            villageName = village.trim(),
                            taName = ta.trim().ifBlank { null },
                            householdSize = size,
                            waterSource = waterSource,
                            distanceKm = distance,
                            gps = gps,
                        ))
                    },
                    enabled = canSave,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                ) {
                    Text(
                        "Save household / Tipilitse nyumba",
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
            Text(
                "Saved on this phone and synced when network allows.",
                style = MaterialTheme.typography.bodySmall,
                color = MutedInk,
            )
        }
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelLarge,
        color = Pine,
        fontWeight = androidx.compose.ui.text.font.FontWeight.Bold,
    )
}
