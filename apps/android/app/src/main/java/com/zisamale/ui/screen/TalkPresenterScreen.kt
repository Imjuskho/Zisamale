package com.zisamale.ui.screen

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zisamale.data.remote.DeploymentCreateRequest
import com.zisamale.data.remote.DeploymentCreateResponse
import com.zisamale.data.remote.SamalaTalk
import com.zisamale.ui.component.Masthead
import com.zisamale.ui.theme.*
import kotlinx.coroutines.launch

/**
 * Community health talk presenter mode — step-by-step walkthrough.
 *
 * Pages: talking points → discussion questions → pledge card.
 * CHWs use this on a tablet during village health meetings.
 * "Log Deployment" creates a deployment record via the API.
 */
@Composable
fun TalkPresenterScreen(
    talk: SamalaTalk,
    householdId: String? = null,
    districtId: String? = null,
    taName: String? = null,
    villageName: String? = null,
    chwId: String? = null,
    onCreateDeployment: suspend (DeploymentCreateRequest) -> DeploymentCreateResponse?,
    onBack: () -> Unit,
    onDeployed: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var showConfirm by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }

    val pages = buildList {
        talk.talking_points.forEachIndexed { i, point ->
            add(
                TalkPage(
                    type = "talking_point",
                    number = i + 1,
                    contentEn = point,
                    contentNy = talk.talking_points_chichewa.getOrNull(i) ?: "",
                )
            )
        }
        talk.discussion_questions.forEachIndexed { i, question ->
            add(
                TalkPage(
                    type = "discussion_question",
                    number = talk.talking_points.size + i + 1,
                    contentEn = question,
                    contentNy = question,
                )
            )
        }
        talk.pledge_card_text?.let { pledge ->
            add(
                TalkPage(
                    type = "pledge_card",
                    number = this.size + 1,
                    contentEn = pledge,
                    contentNy = talk.pledge_card_text_chichewa ?: "",
                )
            )
        }
    }

    val pagerState = rememberPagerState(pageCount = { pages.size })

    // Confirmation dialog
    if (showConfirm) {
        AlertDialog(
            onDismissRequest = { if (!isSubmitting) showConfirm = false },
            title = { Text("Log Deployment?") },
            text = {
                Text(
                    "Record that you presented \"${talk.title}\" to the community? " +
                    "This will count toward SAMALA-AI impact tracking."
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        isSubmitting = true
                        scope.launch {
                            val request = DeploymentCreateRequest(
                                talk_id = talk.talk_id,
                                chw_id = chwId,
                                district_id = districtId,
                                ta_name = taName,
                                village_name = villageName,
                                delivery_method = "community_meeting",
                                households_reached = 1,
                                individuals_reached = 5,
                            )
                            val result = onCreateDeployment(request)
                            isSubmitting = false
                            showConfirm = false
                            if (result != null) onDeployed()
                        }
                    },
                    enabled = !isSubmitting,
                    colors = ButtonDefaults.buttonColors(containerColor = Pine),
                ) {
                    Text(if (isSubmitting) "Saving..." else "Yes, Log It")
                }
            },
            dismissButton = {
                if (!isSubmitting) {
                    TextButton(onClick = { showConfirm = false }) {
                        Text("Cancel")
                    }
                }
            },
        )
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Masthead(
            title = talk.title,
            subtitle = "${talk.title_chichewa ?: ""} · ${talk.duration_minutes} min",
            showRule = true,
            onBack = onBack,
        )

        // Page indicator
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "Page ${pagerState.currentPage + 1} of ${pages.size}",
                fontSize = 13.sp,
                color = Stone500,
            )
        }

        // Pager
        HorizontalPager(
            state = pagerState,
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 16.dp),
        ) { pageIndex ->
            val page = pages[pageIndex]
            TalkPageCard(page = page)
        }

        // Bottom action bar
        Surface(
            color = Color.White,
            border = BorderStroke(1.dp, WarmStone),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Dots
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    pages.forEachIndexed { i, _ ->
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(
                                    color = if (i == pagerState.currentPage) Pine else Stone200,
                                    shape = CircleShape,
                                ),
                        )
                    }
                }

                Button(
                    onClick = { showConfirm = true },
                    colors = ButtonDefaults.buttonColors(containerColor = Ochre),
                    shape = RoundedCornerShape(4.dp),
                ) {
                    Text("Log Deployment", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
        }
    }
}

data class TalkPage(
    val type: String,
    val number: Int,
    val contentEn: String,
    val contentNy: String,
)

@Composable
private fun TalkPageCard(page: TalkPage) {
    val (bgColor, borderColor, typeLabel) = when (page.type) {
        "talking_point" -> Triple(Color(0xFFFAFAF5), WarmStone, "Talking Point")
        "discussion_question" -> Triple(Color(0xFFF0F7FF), Color(0xFF93C5FD), "Discussion")
        "pledge_card" -> Triple(Color(0xFFFFFBEB), Ochre, "Pledge Card")
        else -> Triple(Color.White, WarmStone, "")
    }

    Surface(
        color = bgColor,
        border = BorderStroke(2.dp, borderColor),
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.fillMaxSize(),
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                text = typeLabel,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = borderColor,
                letterSpacing = 1.sp,
            )

            Spacer(Modifier.height(8.dp))

            Text(
                text = "#${page.number}",
                fontSize = 48.sp,
                fontWeight = FontWeight.ExtraBold,
                color = borderColor.copy(alpha = 0.2f),
            )

            Spacer(Modifier.height(16.dp))

            Text(
                text = page.contentEn,
                fontSize = 20.sp,
                fontWeight = FontWeight.SemiBold,
                color = Pine,
                lineHeight = 28.sp,
            )

            Spacer(Modifier.height(16.dp))

            if (page.contentNy.isNotBlank() && page.contentNy != page.contentEn) {
                Text(
                    text = page.contentNy,
                    fontSize = 17.sp,
                    color = Ochre,
                    lineHeight = 24.sp,
                )
            }
        }
    }
}
