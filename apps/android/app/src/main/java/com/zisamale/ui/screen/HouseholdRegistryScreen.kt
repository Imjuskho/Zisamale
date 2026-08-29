package com.zisamale.ui.screen

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.zisamale.data.local.HouseholdEntity
import com.zisamale.ui.component.*
import com.zisamale.ui.theme.*

/**
 * Household registry — CHW's catchment list with search + sync filter.
 *
 * Intent:     Grace manages dozens of households; needs search and honest
 *             sync status at a glance. Tap any to open profile.
 * Hierarchy:  Masthead leads, search field is immediate, list is scanable.
 */
@Composable
fun HouseholdRegistryScreen(
    households: List<HouseholdEntity>,
    onRegisterClick: () -> Unit,
    onOpenHousehold: (String) -> Unit,
    onBack: () -> Unit,
) {
    var search by remember { mutableStateOf("") }
    var syncFilter by remember { mutableStateOf("all") } // all | pending | synced

    val filtered = households.filter { h ->
        val matchesSearch = search.isBlank() ||
                (h.village_name ?: "").contains(search, ignoreCase = true) ||
                (h.ta_name ?: "").contains(search, ignoreCase = true)
        val matchesSync = when (syncFilter) {
            "pending" -> h.sync_status != "synced"
            "synced" -> h.sync_status == "synced"
            else -> true
        }
        matchesSearch && matchesSync
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Masthead(
            title = "Households",
            subtitle = "Nyumba · ${households.size} registered",
            showRule = true,
            onBack = onBack,
            actions = {
                TextButton(onClick = onRegisterClick) {
                    Text("+ Register", color = Pine)
                }
            }
        )

        // Search
        OutlinedTextField(
            value = search,
            onValueChange = { search = it },
            label = { Text("Search village or TA / Fufuzani") },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            singleLine = true,
        )

        // Sync filter chips
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            listOf("all" to "All / Onse", "pending" to "Pending / Yosadikira", "synced" to "Synced / Yalumikizidwa").forEach { (key, label) ->
                Surface(
                    onClick = { syncFilter = key },
                    shape = RoundedCornerShape(2.dp),
                    color = if (syncFilter == key) Pine else CardParchment,
                    border = BorderStroke(1.dp, if (syncFilter == key) Pine else WarmStone),
                ) {
                    Text(
                        label,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        style = MaterialTheme.typography.labelLarge,
                        color = if (syncFilter == key) Parchment else Ink,
                    )
                }
            }
        }

        Spacer(Modifier.height(4.dp))

        // List
        if (filtered.isEmpty()) {
            EmptyState(
                title = "No households found",
                subtitle = if (search.isNotBlank()) "Try a different search term."
                           else "Register your first household to begin.",
                actionLabel = "Register",
                onAction = onRegisterClick,
                modifier = Modifier.weight(1f),
            )
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                items(filtered, key = { it.household_id }) { household ->
                    HouseholdRow(household) { onOpenHousehold(household.household_id) }
                }
            }
        }
    }
}

@Composable
private fun HouseholdRow(household: HouseholdEntity, onClick: () -> Unit) {
    val isSynced = household.sync_status == "synced"

    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(2.dp),
        color = CardParchment,
        border = BorderStroke(1.dp, WarmStone),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .heightIn(min = 56.dp)
                .padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Sync dot
            Surface(
                modifier = Modifier
                    .size(10.dp)
                    .clip(CircleShape),
                color = if (isSynced) RiskLow else RiskMedium,
            ) {}

            Spacer(Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    household.village_name ?: "Household ${household.household_id.takeLast(6)}",
                    style = MaterialTheme.typography.titleMedium,
                )
                val parts = buildList {
                    household.ta_name?.let { add(it) }
                    household.household_size?.let { add("$it members") }
                    if (household.gps_lat != null && household.gps_lon != null) add("GPS ✓")
                }
                Text(
                    parts.joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MutedInk,
                )
            }

            Text(
                if (isSynced) "Synced" else "Pending",
                style = MaterialTheme.typography.labelMedium,
                color = if (isSynced) RiskLow else Terracotta,
            )
        }
    }
}
