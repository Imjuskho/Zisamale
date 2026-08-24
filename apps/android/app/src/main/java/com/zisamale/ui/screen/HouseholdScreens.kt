package com.zisamale.ui.screen

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.zisamale.data.local.ChildEntity
import com.zisamale.data.local.HouseholdEntity
import com.zisamale.data.local.PregnancyEntity
import com.zisamale.util.GpsFix
import com.zisamale.util.LocationHelper

/**
 * Household registry — the CHW's catchment list. Works fully offline;
 * rows show local sync status honestly.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HouseholdRegistryScreen(
    households: List<HouseholdEntity>,
    onRegisterClick: () -> Unit,
    onOpenHousehold: (String) -> Unit,
    onBack: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My Households") },
                navigationIcon = {
                    TextButton(onClick = onBack) { Text("Back") }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onRegisterClick,
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                text = { Text("Register") }
            )
        }
    ) { padding ->
        if (households.isEmpty()) {
            Column(
                modifier = Modifier.padding(padding).fillMaxSize(),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("No households registered yet", style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(8.dp))
                Text(
                    "Use Register to add your first household.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.Gray
                )
            }
        } else {
            LazyColumn(modifier = Modifier.padding(padding).padding(horizontal = 16.dp)) {
                items(households) { household ->
                    HouseholdRow(household) { onOpenHousehold(household.household_id) }
                }
            }
        }
    }
}

@Composable
private fun HouseholdRow(household: HouseholdEntity, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp).clickable(onClick = onClick)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier.size(44.dp),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Person, null, tint = MaterialTheme.colorScheme.primary)
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    household.village_name ?: "Household ${household.household_id.takeLast(6)}",
                    fontWeight = FontWeight.SemiBold
                )
                val parts = buildList {
                    household.ta_name?.let { add(it) }
                    household.household_size?.let { add("$it members") }
                    if (household.gps_lat != null && household.gps_lon != null) add("GPS set")
                }
                Text(parts.joinToString(" · "), style = MaterialTheme.typography.bodySmall, color = Color.Gray)
            }
            Text(
                when (household.sync_status) {
                    "synced" -> "Synced"
                    else -> "Pending"
                },
                style = MaterialTheme.typography.labelSmall,
                color = if (household.sync_status == "synced") Color(0xFF16A34A) else Color(0xFFD97706)
            )
        }
    }
}

/** Result of the registration form; MainActivity persists it locally. */
data class NewHouseholdDraft(
    val villageName: String,
    val taName: String?,
    val householdSize: Int?,
    val waterSource: String?,
    val distanceKm: Double?,
    val gps: GpsFix?
)

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
            gpsMessage = "Location permission denied — GPS will be left empty."
        }
    }

    fun captureGps() {
        if (LocationHelper.hasPermission(context)) {
            LocationHelper.getCurrent(context) { fix, error ->
                gps = fix ?: gps
                gpsMessage = error
            }
        } else {
            permissionLauncher.launch(
                arrayOf(
                    android.Manifest.permission.ACCESS_FINE_LOCATION,
                    android.Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    val size = sizeText.toIntOrNull()
    val distance = distanceText.toDoubleOrNull()
    val canSave = village.isNotBlank() && (size == null || size > 0)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Register Household") },
                navigationIcon = {
                    TextButton(onClick = onCancel) { Text("Cancel") }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedTextField(
                value = village,
                onValueChange = { village = it },
                label = { Text("Village / area name *") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            OutlinedTextField(
                value = ta,
                onValueChange = { ta = it },
                label = { Text("Traditional Authority (TA)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            OutlinedTextField(
                value = sizeText,
                onValueChange = { sizeText = it.filter(Char::isDigit).take(2) },
                label = { Text("People in household") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            ExposedDropdownMenuBox(
                expanded = waterExpanded,
                onExpandedChange = { waterExpanded = it }
            ) {
                OutlinedTextField(
                    value = waterSource ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Primary water source") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = waterExpanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = waterExpanded,
                    onDismissRequest = { waterExpanded = false }
                ) {
                    listOf("Borehole", "Protected well", "Unprotected well", "Piped/tap", "River/lake", "Other").forEach { option ->
                        DropdownMenuItem(
                            text = { Text(option) },
                            onClick = {
                                waterSource = option
                                waterExpanded = false
                            }
                        )
                    }
                }
            }

            OutlinedTextField(
                value = distanceText,
                onValueChange = { distanceText = it.filter { c -> c.isDigit() || c == '.' }.take(6) },
                label = { Text("Distance to facility (km)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                Column(Modifier.padding(16.dp)) {
                    Text("GPS capture", style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(8.dp))
                    if (gps != null) {
                        Text(
                            "%.5f, %.5f%s".format(gps!!.lat, gps!!.lon, gps!!.accuracyM?.let { " (±${it.toInt()}m)" } ?: ""),
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium
                        )
                    } else {
                        Text("No fix yet.", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                    }
                    gpsMessage?.let {
                        Spacer(Modifier.height(4.dp))
                        Text(it, style = MaterialTheme.typography.bodySmall, color = Color(0xFFD97706))
                    }
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(onClick = ::captureGps) {
                        Icon(Icons.Default.LocationOn, null)
                        Spacer(Modifier.width(6.dp))
                        Text(if (gps == null) "Capture location" else "Re-capture")
                    }
                }
            }

            Button(
                onClick = {
                    onSubmit(
                        NewHouseholdDraft(
                            villageName = village.trim(),
                            taName = ta.trim().ifBlank { null },
                            householdSize = size,
                            waterSource = waterSource,
                            distanceKm = distance,
                            gps = gps
                        )
                    )
                },
                enabled = canSave,
                modifier = Modifier.fillMaxWidth().height(52.dp)
            ) {
                Text("Save household", fontWeight = FontWeight.SemiBold)
            }
            Text(
                "Saved on this phone and synced when network allows.",
                style = MaterialTheme.typography.bodySmall,
                color = Color.Gray
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HouseholdProfileScreen(
    household: HouseholdEntity,
    pregnancy: PregnancyEntity?,
    children: List<ChildEntity>,
    onStartVisit: (String) -> Unit,
    onBack: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(household.village_name ?: "Household") },
                navigationIcon = {
                    TextButton(onClick = onBack) { Text("Back") }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    household.ta_name?.let { Text("TA: $it") }
                    household.household_size?.let { Text("${it} people") }
                    household.water_source?.let { Text("Water: ${it}") }
                    if (household.gps_lat != null && household.gps_lon != null) {
                        Text("GPS: %.5f, %.5f".format(household.gps_lat, household.gps_lon))
                    }
                    Text(
                        when (household.sync_status) {
                            "synced" -> "Synced to server"
                            else -> "Saved offline — will sync automatically"
                        },
                        style = MaterialTheme.typography.labelSmall,
                        color = if (household.sync_status == "synced") Color(0xFF16A34A) else Color(0xFFD97706)
                    )
                }
            }

            if (pregnancy != null) {
                Card {
                    Column(Modifier.padding(16.dp)) {
                        Text("Active pregnancy", style = MaterialTheme.typography.titleSmall)
                        Text(pregnancy.woman_name ?: "Unnamed", fontWeight = FontWeight.SemiBold)
                        Text(
                            "Risk: ${pregnancy.risk_category} (${pregnancy.risk_score ?: "-"})",
                            color = when (pregnancy.risk_category) {
                                "critical", "high" -> Color(0xFFDC2626)
                                "medium" -> Color(0xFFD97706)
                                else -> Color(0xFF16A34A)
                            }
                        )
                        Spacer(Modifier.height(8.dp))
                        Button(onClick = { onStartVisit("pregnancy") }, modifier = Modifier.fillMaxWidth()) {
                            Text("Start ANC visit")
                        }
                    }
                }
            }

            children.forEach { child ->
                Card {
                    Column(Modifier.padding(16.dp)) {
                        Text(child.child_name ?: "Child", fontWeight = FontWeight.SemiBold)
                        Text("MUAC: ${child.muac ?: "-"} · Risk: ${child.risk_category}")
                        Spacer(Modifier.height(8.dp))
                        OutlinedButton(onClick = { onStartVisit("child") }, modifier = Modifier.fillMaxWidth()) {
                            Text("Start sick-child visit")
                        }
                    }
                }
            }

            if (pregnancy == null && children.isEmpty()) {
                Text(
                    "No active pregnancies or children tracked for this household yet.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.Gray
                )
            }
        }
    }
}
