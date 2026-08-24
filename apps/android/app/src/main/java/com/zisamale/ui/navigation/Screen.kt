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
}
