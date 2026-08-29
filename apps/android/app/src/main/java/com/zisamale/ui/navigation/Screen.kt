package com.zisamale.ui.navigation

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Dashboard : Screen("dashboard")
    object HouseholdRegistry : Screen("households")
    object RegisterHousehold : Screen("household-register")
    object HouseholdProfile : Screen("household/{householdId}") {
        fun createRoute(householdId: String) = "household/$householdId"
    }
    object VisitForm : Screen("visit/{householdId}/{visitType}") {
        fun createRoute(householdId: String, visitType: String) = "visit/$householdId/$visitType"
    }
    object ReferralForm : Screen("referral/{visitId}") {
        fun createRoute(visitId: String) = "referral/$visitId"
    }
    object RegisterPregnancy : Screen("pregnancy-register/{householdId}") {
        fun createRoute(householdId: String) = "pregnancy-register/$householdId"
    }
    object RegisterChild : Screen("child-register/{householdId}") {
        fun createRoute(householdId: String) = "child-register/$householdId"
    }

    // ── SAMALA-AI: Knowledge Translation ──────────────────────

    object KnowledgeAssets : Screen("knowledge-assets/{householdId}") {
        fun createRoute(householdId: String) = "knowledge-assets/$householdId"
    }
    object SelfCareGuide : Screen("self-care-guide/{guideId}") {
        fun createRoute(guideId: String) = "self-care-guide/$guideId"
    }
    object TalkPresenter : Screen("talk-presenter/{talkId}") {
        fun createRoute(talkId: String) = "talk-presenter/$talkId"
    }
}
