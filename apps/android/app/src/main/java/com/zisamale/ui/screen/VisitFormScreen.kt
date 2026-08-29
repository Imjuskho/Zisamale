package com.zisamale.ui.screen

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.zisamale.ml.VisitAdvice
import com.zisamale.ui.component.*
import com.zisamale.ui.theme.*
import androidx.core.content.FileProvider
import java.io.File

data class VisitSubmit(
    val dangerSigns: Set<String>,
    val notes: String,
    val override: Boolean,
    val overrideReason: String?,
    val advice: VisitAdvice?,
    val photos: List<File> = emptyList()
)

/**
 * Visit form — village header, danger-sign chips grid, AI advisory, photos, submit.
 *
 * Intent:     Fast field entry between patients; danger signs are scanable + tappable.
 * Hierarchy:  Danger sign chips lead, advisory panel is supporting, submit is focal.
 * Depth:      Advisory card uses sage tint; photos use warm-stone surface.
 */
@Composable
fun VisitFormScreen(
    householdId: String,
    visitType: String,
    advice: VisitAdvice?,
    villageName: String? = null,
    onDangerSignsChange: (Set<String>) -> Unit = {},
    onSubmit: (VisitSubmit) -> Unit,
) {
    val context = LocalContext.current
    var notes by remember { mutableStateOf("") }
    var dangerSignsSelected by remember { mutableStateOf(setOf<String>()) }
    var showOverrideReason by remember { mutableStateOf(false) }
    var overrideReason by remember { mutableStateOf("") }
    val pendingPhotos = remember { mutableStateListOf<File>() }
    var cameraUri by remember { mutableStateOf<Uri?>(null) }

    val cameraLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.TakePicture()
    ) { captured ->
        if (captured) cameraUri?.let { uri ->
            uri.path?.let { path ->
                val file = resolveCameraFile(context, uri)
                if (file != null && file.exists()) pendingPhotos.add(file)
            }
        }
    }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) launchCamera(context, { cameraUri = it }, cameraLauncher::launch)
    }

    val dangerSignOptions = when (visitType) {
        "pregnancy" -> listOf(
            "Severe headache" to "Chiwawa chachikulu",
            "Blurred vision" to "Kuona kosajambula",
            "Vaginal bleeding" to "Kutuluka magazi kuchipapa",
            "Severe abdominal pain" to "Kuuma m'mimba",
            "Fever >38C" to "Kutentha thupi",
            "Oedema of face/hands" to "Kutupa mutu ndi manja",
            "Convulsions" to "Kugwada",
            "No fetal movement" to "Simva mwana akuyenda",
        )
        "child" -> listOf(
            "Can't drink/breastfeed" to "Sangamwe/angodya",
            "Vomiting everything" to "Kunyansa zonse",
            "Convulsions" to "Kugwada",
            "Lethargic/unconscious" to "Wofoka/samva",
            "Fast/difficult breathing" to "Kufesa mwachangu/ kolakatika",
            "Chest indrawing" to "Kutupa mimba",
            "Severe malnutrition" to "Kupsinjika kwambiri",
            "Fever >39C" to "Kutentha thupi kwambiri",
        )
        else -> listOf(
            "Fever" to "Kutentha thupi",
            "Cough" to "Kupuma",
            "Diarrhea" to "KuGISI",
            "Vomiting" to "Kunyansa",
            "Other" to "Zina",
        )
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Masthead(
            title = villageName ?: "Visit",
            subtitle = "${visitType.replaceFirstChar { it.uppercase() }} visit",
            showRule = true,
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Spacer(Modifier.height(4.dp))

            // Danger signs — 2-column chip grid (plain Column+Row to avoid scroll nesting)
            Text("Danger signs / Zizowoyera", style = MaterialTheme.typography.titleMedium)
            dangerSignOptions.chunked(2).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    row.forEach { (en, ny) ->
                        val selected = en in dangerSignsSelected
                        FieldChip(
                            label = en,
                            selected = selected,
                            onClick = {
                                dangerSignsSelected = if (selected) dangerSignsSelected - en
                                               else dangerSignsSelected + en
                                onDangerSignsChange(dangerSignsSelected)
                            },
                            caption = ny,
                            modifier = Modifier.weight(1f),
                        )
                    }
                    if (row.size == 1) Spacer(modifier = Modifier.weight(1f))
                }
            }

            // Notes
            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text("CHW Notes / Maoni a CHW") },
                modifier = Modifier.fillMaxWidth().height(100.dp),
            )

            // AI advisory panel
            Surface(
                color = Sage.copy(alpha = 0.1f),
                border = BorderStroke(1.dp, Sage),
                shape = RoundedCornerShape(2.dp),
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        "AI recommendation / Malangizo a AI",
                        style = MaterialTheme.typography.titleSmall,
                    )
                    Text(
                        "Advisory only — not a diagnosis / Malangizo chabe — osati chithunzi",
                        style = MaterialTheme.typography.labelMedium,
                        color = MutedInk,
                    )
                    Spacer(Modifier.height(6.dp))
                    if (advice == null) {
                        Text(
                            "Score this visit to get advice.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MutedInk,
                        )
                    } else {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            RiskBadge(
                                score = advice.score.riskScore.toInt().coerceIn(1, 10),
                                size = BadgeSize.MEDIUM,
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    advice.action.replace('_', ' ').replaceFirstChar { it.uppercase() },
                                    style = MaterialTheme.typography.bodyMedium,
                                )
                            }
                        }
                        advice.score.topFactors.forEach { factor ->
                            Text("• $factor", style = MaterialTheme.typography.bodySmall)
                        }
                        if (advice.chichewaFactors.isNotEmpty()) {
                            Spacer(Modifier.height(6.dp))
                            Text("Mu Chichewa:", style = MaterialTheme.typography.labelMedium)
                            advice.chichewaFactors.forEach { factor ->
                                Text("• $factor", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            }

            // Override reason
            if (showOverrideReason) {
                OutlinedTextField(
                    value = overrideReason,
                    onValueChange = { overrideReason = it },
                    label = { Text("Why do you disagree? / Chifukwa chani?") },
                    modifier = Modifier.fillMaxWidth(),
                    supportingText = {
                        Text("Required — overrides train the next model.")
                    }
                )
            }

            // Photos
            Surface(
                color = CardParchment,
                border = BorderStroke(1.dp, WarmStone),
                shape = RoundedCornerShape(2.dp),
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text(
                        "Visit photos / Zithunzi za odalira",
                        style = MaterialTheme.typography.titleSmall,
                    )
                    Text(
                        if (pendingPhotos.isEmpty()) "No photos attached / Palibe zithunzi"
                        else "${pendingPhotos.size} photo(s) staged for upload.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MutedInk,
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(onClick = {
                        val permission = android.Manifest.permission.CAMERA
                        val granted = androidx.core.content.ContextCompat.checkSelfPermission(
                            context, permission
                        ) == android.content.pm.PackageManager.PERMISSION_GRANTED
                        if (granted) launchCamera(context, { cameraUri = it }, cameraLauncher::launch)
                        else cameraPermissionLauncher.launch(permission)
                    }) {
                        Text("Add photo / Onjezani chithunzi")
                    }
                }
            }

            Spacer(Modifier.height(8.dp))
        }

        // Sticky submit bar
        Surface(
            color = CardParchment,
            border = BorderStroke(1.dp, WarmStone),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                OutlinedButton(
                    onClick = {
                        if (!showOverrideReason) showOverrideReason = true
                        else if (overrideReason.isNotBlank()) {
                            onSubmit(VisitSubmit(
                                dangerSigns = dangerSignsSelected,
                                notes = notes, override = true,
                                overrideReason = overrideReason.trim(),
                                advice = advice, photos = pendingPhotos.toList(),
                            ))
                        }
                    },
                    enabled = !showOverrideReason || overrideReason.isNotBlank(),
                    modifier = Modifier.weight(1f).height(48.dp),
                ) {
                    Text(if (showOverrideReason) "Submit override" else "I disagree / Sindikuvomera")
                }
                Button(
                    onClick = {
                        onSubmit(VisitSubmit(
                            dangerSigns = dangerSignsSelected,
                            notes = notes, override = false,
                            overrideReason = null,
                            advice = advice, photos = pendingPhotos.toList(),
                        ))
                    },
                    modifier = Modifier.weight(1f).height(48.dp),
                ) {
                    Text("Accept & submit / Vomera ndi kutumiza")
                }
            }
        }
    }
}

private fun launchCamera(context: android.content.Context, onUri: (Uri) -> Unit, launch: (Uri) -> Unit) {
    val imagesDir = File(context.cacheDir, "images").apply { mkdirs() }
    val file = File(imagesDir, "capture_${System.currentTimeMillis()}.jpg")
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    onUri(uri)
    launch(uri)
}

private fun resolveCameraFile(context: android.content.Context, uri: Uri): File? {
    val path = uri.encodedPath ?: return null
    val name = path.substringAfterLast('/')
    return File(File(context.cacheDir, "images"), name)
}
