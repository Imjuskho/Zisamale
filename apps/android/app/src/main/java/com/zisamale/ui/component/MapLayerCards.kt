package com.zisamale.ui.component

/**
 * Map-layer summary cards for CHW-facing operational data
 * (immunization coverage, cold chain, maternity homes, supply trucks,
 * nutrition surveillance, health weather briefing). Mirrors the web
 * dashboard layer toggles 1:1.
 */
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.House
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/* ── Immunization village coverage ─────────────────────────────── */

data class Village(
    val villageId: String,
    val name: String,
    val taName: String,
    val under5Population: Int,
    val dpt3Coverage: Float
)

@Composable
fun ImmunizationVillageCard(
    village: Village,
    onClick: () -> Unit = {}
) {
    val coverageColor = when {
        village.dpt3Coverage >= 0.8f -> Color(0xFF2D7D46)
        village.dpt3Coverage >= 0.5f -> Color(0xFFF9A825)
        else -> Color(0xFFC62828)
    }
    val dotSize = when {
        village.under5Population > 500 -> 14.dp
        village.under5Population > 200 -> 10.dp
        else -> 6.dp
    }

    ZisamaleCard(
        modifier = Modifier.fillMaxWidth().clickable { onClick() }
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(dotSize)
                    .clip(CircleShape)
                    .background(coverageColor)
            )
            Spacer(Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(village.name, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                Text(village.taName, fontSize = 10.sp, color = Color(0xFF666666))
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    "DPT3: ${(village.dpt3Coverage * 100).toInt()}%",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = coverageColor
                )
                Text("Pop: ${village.under5Population}", fontSize = 9.sp, color = Color(0xFF999999))
            }
        }
    }
}

/* ── Cold chain status ─────────────────────────────────────────── */

data class ColdChainFacility(
    val facilityId: String,
    val name: String,
    val fridgeStatus: String,
    val lastTemperature: Float?,
    val solarPowered: Boolean
)

@Composable
fun ColdChainStatusCard(facility: ColdChainFacility) {
    val statusColor = when (facility.fridgeStatus) {
        "working" -> Color(0xFF2D7D46)
        "broken" -> Color(0xFFC62828)
        else -> Color(0xFF999999)
    }

    ZisamaleCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                if (facility.fridgeStatus == "working") Icons.Filled.Check else Icons.Filled.Clear,
                contentDescription = facility.fridgeStatus,
                tint = statusColor,
                modifier = Modifier.size(16.dp)
            )
            Spacer(Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(facility.name, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Text(
                    if (facility.fridgeStatus == "working") "${facility.lastTemperature ?: 0}°C"
                    else facility.fridgeStatus.uppercase(),
                    fontSize = 10.sp,
                    color = statusColor
                )
            }
            if (facility.solarPowered) {
                Icon(Icons.Filled.WbSunny, "Solar", tint = Color(0xFFF9A825), modifier = Modifier.size(12.dp))
            }
        }
    }
}

/* ── Maternity waiting home occupancy ──────────────────────────── */

data class MaternityWaitingHome(
    val mwhId: String,
    val name: String,
    val capacity: Int,
    val occupied: Int,
    val status: String
)

@Composable
fun MaternityHomeCard(
    home: MaternityWaitingHome,
    onClick: () -> Unit = {}
) {
    val statusColor = when (home.status) {
        "open" -> Color(0xFF2D7D46)
        "full" -> Color(0xFFE65100)
        else -> Color(0xFF999999)
    }
    val occupancyPct = if (home.capacity > 0) home.occupied.toFloat() / home.capacity else 0f

    ZisamaleCard(
        modifier = Modifier.fillMaxWidth().clickable { onClick() }
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.House, "Home", tint = statusColor, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(home.name, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Text(home.status.uppercase(), fontSize = 10.sp, color = statusColor, fontWeight = FontWeight.Bold)
            }
        }
        Spacer(Modifier.height(4.dp))
        LinearProgressIndicator(
            progress = { occupancyPct },
            modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
            color = statusColor,
            trackColor = Color(0xFFE0E0D8)
        )
        Text("${home.occupied}/${home.capacity} occupied", fontSize = 10.sp, color = Color(0xFF666666))
    }
}

/* ── Supply truck tracking ─────────────────────────────────────── */

data class SupplyTruck(
    val truckId: String,
    val driverName: String,
    val cargo: String,
    val destination: String,
    val etaHours: Int,
    val temperatureBreach: Boolean
)

@Composable
fun SupplyTruckCard(truck: SupplyTruck) {
    val borderColor = if (truck.temperatureBreach) Color(0xFFC62828) else Color(0xFF2D7D46)

    ZisamaleCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Filled.LocalShipping,
                "Truck",
                tint = borderColor,
                modifier = Modifier.size(16.dp)
            )
            Spacer(Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(truck.driverName, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Text("→ ${truck.destination} · ${truck.etaHours}h ETA", fontSize = 10.sp, color = Color(0xFF666666))
            }
        }
        Text("Cargo: ${truck.cargo}", fontSize = 10.sp, color = Color(0xFF444444))
        if (truck.temperatureBreach) {
            Text(
                "⚠ Temperature breach",
                fontSize = 10.sp,
                color = Color(0xFFC62828),
                fontWeight = FontWeight.Bold
            )
        }
    }
}

/* ── Nutrition surveillance ────────────────────────────────────── */

data class NutritionData(
    val villageId: String,
    val villageName: String,
    val stuntingRate: Float,
    val wastingRate: Float,
    val muacScreenings: Int,
    val rutfNeeded: Boolean
)

@Composable
fun NutritionCard(data: NutritionData) {
    val stuntingColor = when {
        data.stuntingRate < 0.2f -> Color(0xFF2D7D46)
        data.stuntingRate < 0.3f -> Color(0xFFF9A825)
        else -> Color(0xFFC62828)
    }

    ZisamaleCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(stuntingColor)
            )
            Spacer(Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(data.villageName, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Text(
                    "Stunting: ${(data.stuntingRate * 100).toInt()}% · Wasting: ${(data.wastingRate * 100).toInt()}%",
                    fontSize = 10.sp,
                    color = Color(0xFF666666)
                )
            }
            if (data.rutfNeeded) {
                Text(
                    "RUTF",
                    fontSize = 9.sp,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .background(Color(0xFFE65100), RoundedCornerShape(10.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                )
            }
        }
    }
}

/* ── Health weather daily briefing ─────────────────────────────── */

@Composable
fun HealthWeatherCard(
    district: String,
    riskSummary: String,
    alertLevel: String,
    actionItems: List<String>,
    onRefresh: () -> Unit = {}
) {
    val alertColor = when (alertLevel) {
        "red" -> Color(0xFFC62828)
        "yellow" -> Color(0xFFE65100)
        else -> Color(0xFF2D7D46)
    }

    ZisamaleCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.Bolt, "Weather", tint = alertColor, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
            Text("Health Weather — $district", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.weight(1f))
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(CircleShape)
                    .background(alertColor)
            )
        }
        Spacer(Modifier.height(4.dp))
        Text(riskSummary, fontSize = 11.sp, color = Color(0xFF444444))

        if (actionItems.isNotEmpty()) {
            Spacer(Modifier.height(6.dp))
            Text("Today's Actions:", fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
            actionItems.forEach { item ->
                Row(
                    verticalAlignment = Alignment.Top,
                    modifier = Modifier.padding(top = 2.dp)
                ) {
                    Text("→", fontSize = 10.sp, color = alertColor)
                    Spacer(Modifier.width(4.dp))
                    Text(item, fontSize = 10.sp)
                }
            }
        }

        Spacer(Modifier.height(6.dp))
        TextButton(onClick = onRefresh, modifier = Modifier.align(Alignment.End)) {
            Icon(Icons.Filled.CloudUpload, "Refresh", modifier = Modifier.size(14.dp))
            Spacer(Modifier.width(4.dp))
            Text("Refresh", fontSize = 10.sp)
        }
    }
}
