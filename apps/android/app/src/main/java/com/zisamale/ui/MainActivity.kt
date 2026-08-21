package com.zisamale.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.zisamale.data.local.VisitEntity
import com.zisamale.data.local.ZisamaleDatabase
import com.zisamale.data.session.SessionStore
import com.zisamale.data.sync.SyncManager
import com.zisamale.ml.VisitAdvice
import com.zisamale.ml.VisitAdvisor
import com.zisamale.ui.navigation.Screen
import com.zisamale.ui.screen.DashboardScreen
import com.zisamale.ui.screen.FacilityOption
import com.zisamale.ui.screen.LoginScreen
import com.zisamale.ui.screen.PriorityVisitItem
import com.zisamale.ui.screen.ReferralFormScreen
import com.zisamale.ui.screen.VisitFormScreen
import com.zisamale.ui.theme.ZisamaleTheme
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    @Inject lateinit var syncManager: SyncManager
    @Inject lateinit var sessionStore: SessionStore
    @Inject lateinit var db: ZisamaleDatabase

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ZisamaleTheme {
                Surface(color = MaterialTheme.colorScheme.background) {
                    val navController = rememberNavController()
                    val scope = rememberCoroutineScope()
                    var loginError by remember { mutableStateOf<String?>(null) }
                    var loginBusy by remember { mutableStateOf(false) }
                    var visits by remember { mutableStateOf<List<PriorityVisitItem>>(emptyList()) }
                    val start = if (sessionStore.isLoggedIn) Screen.Dashboard.route else Screen.Login.route

                    NavHost(navController = navController, startDestination = start) {
                        composable(Screen.Login.route) {
                            LoginScreen(
                                error = loginError,
                                loading = loginBusy,
                                onLogin = { username, password ->
                                    loginBusy = true
                                    loginError = null
                                    scope.launch {
                                        try {
                                            syncManager.login(username, password)
                                            visits = syncManager.fetchPriorityList()
                                            navController.navigate(Screen.Dashboard.route) {
                                                popUpTo(Screen.Login.route) { inclusive = true }
                                            }
                                        } catch (e: Exception) {
                                            loginError = e.message ?: "Sign in failed"
                                        } finally {
                                            loginBusy = false
                                        }
                                    }
                                }
                            )
                        }
                        composable(Screen.Dashboard.route) {
                            LaunchedEffect(Unit) {
                                visits = syncManager.fetchPriorityList()
                                syncManager.syncAll()
                            }
                            DashboardScreen(
                                chwName = sessionStore.displayName ?: "CHW",
                                visits = visits,
                                onVisitClick = { id, type ->
                                    navController.navigate(Screen.VisitForm.createRoute(id, type))
                                }
                            )
                        }
                        composable(Screen.VisitForm.route) { backStackEntry ->
                            val householdId = backStackEntry.arguments?.getString("householdId") ?: ""
                            val visitType = backStackEntry.arguments?.getString("visitType") ?: "routine"
                            var dangerSigns by remember { mutableStateOf(setOf<String>()) }
                            var advice by remember { mutableStateOf<VisitAdvice?>(null) }
                            LaunchedEffect(householdId, visitType, dangerSigns) {
                                val household = db.householdDao().getById(householdId)
                                val pregnancy = if (visitType == "pregnancy") {
                                    db.pregnancyDao().getActiveByHousehold(householdId)
                                } else {
                                    null
                                }
                                val child = if (visitType == "child") {
                                    db.childDao().getByHousehold(householdId).firstOrNull()
                                } else {
                                    null
                                }
                                advice = VisitAdvisor.advise(
                                    visitType, household, pregnancy, child, dangerSigns
                                )
                            }
                            VisitFormScreen(
                                householdId = householdId,
                                visitType = visitType,
                                advice = advice,
                                onDangerSignsChange = { dangerSigns = it },
                                onSubmit = { submit ->
                                    scope.launch {
                                        val visitId = UUID.randomUUID().toString()
                                        val rec = submit.advice?.toRecommendationMap() ?: emptyMap()
                                        val recJson = JSONObject().apply {
                                            rec.forEach { (key, value) ->
                                                put(key, if (value is List<*>) JSONArray(value) else value)
                                            }
                                        }.toString()
                                        db.visitDao().insert(
                                            VisitEntity(
                                                visit_id = visitId,
                                                household_id = householdId,
                                                chw_id = sessionStore.catchmentId(),
                                                visit_date = System.currentTimeMillis(),
                                                pregnancy_id = submit.advice?.pregnancyId,
                                                child_id = submit.advice?.childId,
                                                visit_type = visitType,
                                                danger_signs = JSONArray(submit.dangerSigns.toList()).toString(),
                                                chw_notes = submit.notes,
                                                chw_override = submit.override,
                                                chw_override_reason = submit.overrideReason,
                                                ai_recommendation = recJson,
                                                ai_risk_score = submit.advice?.score?.riskScore,
                                                sync_status = "pending"
                                            )
                                        )
                                        syncManager.syncPendingVisits()
                                        navController.navigate(Screen.ReferralForm.createRoute(visitId))
                                    }
                                }
                            )
                        }
                        composable(Screen.ReferralForm.route) { backStackEntry ->
                            val visitId = backStackEntry.arguments?.getString("visitId") ?: ""
                            ReferralFormScreen(
                                visitId = visitId,
                                facilities = listOf(
                                    FacilityOption("f1", "Nsanje District Hospital", 12.0f, true, 8.5f),
                                    FacilityOption("f2", "Makhanga Health Centre", 5.0f, true, 7.2f),
                                    FacilityOption("f3", "Thyolo District Hospital", 25.0f, false, 5.8f)
                                ),
                                onSubmit = { _, _ ->
                                    scope.launch {
                                        syncManager.syncAll()
                                        visits = syncManager.fetchPriorityList()
                                        navController.navigate(Screen.Dashboard.route) {
                                            popUpTo(Screen.Dashboard.route) { inclusive = true }
                                        }
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}
