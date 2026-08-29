package com.zisamale.ui.screen

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zisamale.data.remote.SamalaGuide
import com.zisamale.ui.component.Masthead
import com.zisamale.ui.theme.*

/**
 * Self-care guide viewer — bilingual side-by-side content.
 *
 * Shows: what it is, what to do, what NOT to do, when to seek help, prevention.
 * CHWs use this during home visits to share with household members.
 */
@Composable
fun SelfCareGuideScreen(
    guide: SamalaGuide,
    onBack: () -> Unit,
) {
    val severityColor = when (guide.severity) {
        "emergency" -> Color(0xFFDC2626)
        "warning" -> Color(0xFFF59E0B)
        else -> Color(0xFF2563EB)
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Masthead(
            title = guide.title,
            subtitle = guide.title_chichewa,
            showRule = true,
            onBack = onBack,
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Spacer(Modifier.height(4.dp))

            // Severity badge
            Surface(
                color = severityColor.copy(alpha = 0.1f),
                border = BorderStroke(1.dp, severityColor),
                shape = RoundedCornerShape(4.dp),
            ) {
                Text(
                    text = guide.severity.uppercase(),
                    color = severityColor,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                )
            }

            // What is it
            guide.what_it_is?.let { whatIs ->
                SectionCard(title = "What is it? / Ndi chiyani?") {
                    Text(whatIs, fontSize = 14.sp, color = Pine)
                    guide.what_it_is_chichewa?.let {
                        Text(it, fontSize = 13.sp, color = Ochre, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            }

            // What to do now
            if (guide.what_to_do_now.isNotEmpty()) {
                SectionCard(title = "What to do now / Zochita tsopano", titleColor = Color(0xFF16A34A)) {
                    guide.what_to_do_now.forEachIndexed { i, item ->
                        ActionRow(icon = "✓", text = item, color = Color(0xFF16A34A))
                        guide.what_to_do_now_chichewa.getOrNull(i)?.let {
                            ActionRow(icon = "✓", text = it, color = Ochre, isItalic = true)
                        }
                    }
                }
            }

            // What NOT to do
            if (guide.what_not_to_do.isNotEmpty()) {
                SectionCard(title = "What NOT to do / ZOSACHITA", titleColor = Color(0xFFDC2626)) {
                    guide.what_not_to_do.forEach { item ->
                        ActionRow(icon = "✗", text = item, color = Color(0xFFDC2626))
                    }
                }
            }

            // When to seek help
            guide.when_to_seek_help?.let { help ->
                SectionCard(title = "When to seek help / Mutanthauzire thandizo", titleColor = Color(0xFFDC2626)) {
                    Text(help, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFFDC2626))
                    guide.when_to_seek_help_chichewa?.let {
                        Text(it, fontSize = 13.sp, color = Ochre, modifier = Modifier.padding(top = 4.dp))
                    }
                }
            }

            // Prevention
            if (guide.prevention.isNotEmpty()) {
                SectionCard(title = "Prevention / Kupewa") {
                    guide.prevention.forEach { item ->
                        ActionRow(icon = "•", text = item, color = Pine)
                    }
                }
            }

            Spacer(Modifier.height(16.dp))
        }
    }
}

@Composable
private fun SectionCard(
    title: String,
    titleColor: Color = Pine,
    content: @Composable ColumnScope.() -> Unit,
) {
    Surface(
        color = Color.White,
        border = BorderStroke(1.dp, WarmStone),
        shape = RoundedCornerShape(2.dp),
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(
                text = title,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = titleColor,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            content()
        }
    }
}

@Composable
private fun ActionRow(
    icon: String,
    text: String,
    color: Color,
    isItalic: Boolean = false,
) {
    Row(
        modifier = Modifier.padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(icon, color = color, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        Text(
            text,
            fontSize = 13.sp,
            color = if (isItalic) Ochre else Pine,
            fontStyle = if (isItalic) androidx.compose.ui.text.font.FontStyle.Italic else androidx.compose.ui.text.font.FontStyle.Normal,
        )
    }
}
