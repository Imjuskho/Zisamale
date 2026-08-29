package com.zisamale.data.remote

/** SAMALA-AI knowledge translation data models for the Android app. */

data class SamalaAsset(
    val asset_id: String,
    val study_id: String? = null,
    val title: String,
    val title_chichewa: String? = null,
    val key_finding: String,
    val key_finding_chichewa: String? = null,
    val actionable_takeaways: List<String> = emptyList(),
    val actionable_takeaways_chichewa: List<String> = emptyList(),
    val asset_type: String,
    val health_topic: String,
    val severity: String = "info",
    val status: String = "draft",
)

data class SamalaGuide(
    val guide_id: String,
    val title: String,
    val title_chichewa: String? = null,
    val category: String,
    val severity: String = "info",
    val what_it_is: String? = null,
    val what_it_is_chichewa: String? = null,
    val what_to_do_now: List<String> = emptyList(),
    val what_to_do_now_chichewa: List<String> = emptyList(),
    val what_not_to_do: List<String> = emptyList(),
    val what_not_to_do_chichewa: List<String> = emptyList(),
    val when_to_seek_help: String? = null,
    val when_to_seek_help_chichewa: String? = null,
    val prevention: List<String> = emptyList(),
    val prevention_chichewa: List<String> = emptyList(),
)

data class SamalaTalk(
    val talk_id: String,
    val title: String,
    val title_chichewa: String? = null,
    val duration_minutes: Int = 15,
    val talking_points: List<String> = emptyList(),
    val talking_points_chichewa: List<String> = emptyList(),
    val discussion_questions: List<String> = emptyList(),
    val pledge_card_text: String? = null,
    val pledge_card_text_chichewa: String? = null,
    val health_topic: String,
)

data class ContextualAssetsResponse(
    val household_id: String,
    val matched_assets: List<SamalaAsset> = emptyList(),
    val matched_guides: List<SamalaGuide> = emptyList(),
    val topic_hints: List<String> = emptyList(),
)

data class DeploymentCreateRequest(
    val asset_id: String? = null,
    val talk_id: String? = null,
    val guide_id: String? = null,
    val chw_id: String? = null,
    val district_id: String? = null,
    val ta_name: String? = null,
    val village_name: String? = null,
    val delivery_method: String,
    val households_reached: Int = 0,
    val individuals_reached: Int = 0,
    val cases_identified: Int = 0,
    val referrals_made: Int = 0,
)

data class DeploymentCreateResponse(
    val deployment_id: String,
    val status: String,
)
