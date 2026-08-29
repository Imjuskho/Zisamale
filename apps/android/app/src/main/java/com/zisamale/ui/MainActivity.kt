package com.zisamale.ui

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Event
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.zisamale.data.local.VisitEntity
import com.zisamale.data.local.ZisamaleDatabase
import com.zisamale.data.session.SessionStore
import com.zisamale.data.sync.SyncManager
import com.zisamale.ml.VisitAdvice
import com.zisamale.ml.VisitAdvisor
import com.zisamale.security.BiometricGate
import com.zisamale.ui.component.PageHeader
import com.zisamale.ui.navigation.Screen
import com.zisamale.ui.screen.*
import com.zisamale.ui.theme.*
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : FragmentActivity() {
    @Inject lateinit var syncManager: SyncManager
    @Inject lateinit var sessionStore: SessionStore
    @Inject lateinit var db: ZisamaleDatabase
    @Inject lateinit var edgeAi: com.zisamale.ml.EdgeAI
    @Inject lateinit var batteryAwareSync: com.zisamale.sync.BatteryAwareSync

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ZisamaleTheme {
                Surface(color = MaterialTheme.colorScheme.background) {
                    var locked by remember { mutableStateOf(sessionStore.isLoggedIn) }
                    if (locked) {
                        LockScreen(
                            onUnlocked = { locked = false },
                            onSignOut = { sessionStore.clear(); locked = false; recreate() }
                        )
                        return@Surface
                    }
                    MainContent()
                }
            }
        }
    }

    @Composable
    private fun MainContent() {
        val navController = rememberNavController()
        val scope = rememberCoroutineScope()
        var loginError by remember { mutableStateOf<String?>(null) }
        var loginBusy by remember { mutableStateOf(false) }
        var visits by remember { mutableStateOf<List<PriorityVisitItem>>(emptyList()) }
        var pendingHouseholds by remember { mutableIntStateOf(0) }
        var pendingVisits by remember { mutableIntStateOf(0) }
        val start = if (sessionStore.isLoggedIn) Screen.Dashboard.route else Screen.Login.route

        val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route
        val tabRoutes = listOf(Screen.Dashboard.route, Screen.HouseholdRegistry.route, "account")
        val showBottomBar = currentRoute in tabRoutes && sessionStore.isLoggedIn
        val snackbarHostState = remember { SnackbarHostState() }

        Scaffold(
            snackbarHost = { SnackbarHost(snackbarHostState) },
            bottomBar = {
                if (showBottomBar) {
                    NavigationBar(containerColor = CardParchment) {
                        NavigationBarItem(
                            icon = { Icon(Icons.Outlined.Event, null) },
                            label = { Text("Today") },
                            selected = currentRoute == Screen.Dashboard.route,
                            onClick = {
                                navController.navigate(Screen.Dashboard.route) {
                                    popUpTo(Screen.Dashboard.route) { inclusive = true }
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Pine,
                                selectedTextColor = Pine,
                                indicatorColor = Pine.copy(alpha = 0.1f),
                            ),
                        )
                        NavigationBarItem(
                            icon = { Icon(Icons.Outlined.Home, null) },
                            label = { Text("Households") },
                            selected = currentRoute == Screen.HouseholdRegistry.route,
                            onClick = {
                                navController.navigate(Screen.HouseholdRegistry.route) {
                                    popUpTo(Screen.Dashboard.route)
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Pine,
                                selectedTextColor = Pine,
                                indicatorColor = Pine.copy(alpha = 0.1f),
                            ),
                        )
                        NavigationBarItem(
                            icon = { Icon(Icons.Outlined.Person, null) },
                            label = { Text("Account") },
                            selected = currentRoute == "account",
                            onClick = {
                                navController.navigate("account") {
                                    popUpTo(Screen.Dashboard.route)
                                }
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Pine,
                                selectedTextColor = Pine,
                                indicatorColor = Pine.copy(alpha = 0.1f),
                            ),
                        )
                    }
                }
            }
        ) { innerPadding ->
            NavHost(
                navController = navController,
                startDestination = start,
                modifier = Modifier.padding(innerPadding),
            ) {
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
                                    refreshPendingCounts(db, sessionStore) { h, v ->
                                        pendingHouseholds = h; pendingVisits = v
                                    }
                                    com.zisamale.sync.SyncWorker.kickNow(this@MainActivity)
                                    navController.navigate(Screen.Dashboard.route) {
                                        popUpTo(Screen.Login.route) { inclusive = true }
                                    }
                                } catch (e: Exception) {
                                    loginError = e.message ?: "Sign in failed"
                                } finally { loginBusy = false }
                            }
                        }
                    )
                }

                composable(Screen.Dashboard.route) {
                    val notifPerm = androidx.activity.compose.rememberLauncherForActivityResult(
                        androidx.activity.result.contract.ActivityResultContracts.RequestPermission()
                    ) { }
                    LaunchedEffect(Unit) {
                        visits = syncManager.fetchPriorityList()
                        syncManager.syncAll()
                        refreshPendingCounts(db, sessionStore) { h, v ->
                            pendingHouseholds = h; pendingVisits = v
                        }
                        if (android.os.Build.VERSION.SDK_INT >= 33 &&
                            androidx.core.content.ContextCompat.checkSelfPermission(
                                this@MainActivity, android.Manifest.permission.POST_NOTIFICATIONS
                            ) != android.content.pm.PackageManager.PERMISSION_GRANTED
                        ) { notifPerm.launch(android.Manifest.permission.POST_NOTIFICATIONS) }
                    }
                    DashboardScreen(
                        chwName = sessionStore.displayName ?: "CHW",
                        visits = visits,
                        pendingCount = pendingHouseholds + pendingVisits,
                        onVisitClick = { id, type ->
                            navController.navigate(Screen.VisitForm.createRoute(id, type))
                        },
                        onHouseholdsClick = {
                            navController.navigate(Screen.HouseholdRegistry.route)
                        },
                    )
                }

                composable(Screen.HouseholdRegistry.route) {
                    var households by remember { mutableStateOf<List<com.zisamale.data.local.HouseholdEntity>>(emptyList()) }
                    LaunchedEffect(Unit) {
                        households = db.householdDao().getByChwId(sessionStore.catchmentId())
                    }
                    HouseholdRegistryScreen(
                        households = households,
                        onRegisterClick = { navController.navigate(Screen.RegisterHousehold.route) },
                        onOpenHousehold = { id ->
                            navController.navigate(Screen.HouseholdProfile.createRoute(id))
                        },
                        onBack = { navController.popBackStack() }
                    )
                }

                composable(Screen.RegisterHousehold.route) {
                    RegisterHouseholdScreen(
                        onSubmit = { draft ->
                            scope.launch {
                                val chwId = sessionStore.catchmentId()
                                db.householdDao().upsertAll(listOf(
                                    com.zisamale.data.local.HouseholdEntity(
                                        household_id = UUID.randomUUID().toString(),
                                        chw_id = chwId,
                                        gps_lat = draft.gps?.lat,
                                        gps_lon = draft.gps?.lon,
                                        ta_name = draft.taName,
                                        village_name = draft.villageName,
                                        water_source = draft.waterSource,
                                        distance_to_facility_km = draft.distanceKm,
                                        household_size = draft.householdSize,
                                        sync_status = "pending"
                                    )
                                ))
                                refreshPendingCounts(db, sessionStore) { h, v ->
                                    pendingHouseholds = h; pendingVisits = v
                                }
                                navController.popBackStack()
                            }
                        },
                        onCancel = { navController.popBackStack() }
                    )
                }

                composable(Screen.HouseholdProfile.route) { backStackEntry ->
                    val householdId = backStackEntry.arguments?.getString("householdId") ?: ""
                    var household by remember { mutableStateOf<com.zisamale.data.local.HouseholdEntity?>(null) }
                    var pregnancy by remember { mutableStateOf<com.zisamale.data.local.PregnancyEntity?>(null) }
                    var children by remember { mutableStateOf<List<com.zisamale.data.local.ChildEntity>>(emptyList()) }
                    LaunchedEffect(householdId) {
                        household = db.householdDao().getById(householdId)
                        pregnancy = db.pregnancyDao().getActiveByHousehold(householdId)
                        children = db.childDao().getByHousehold(householdId)
                    }
                    household?.let { h ->
                        HouseholdProfileScreen(
                            household = h, pregnancy = pregnancy, children = children,
                            onStartVisit = { type ->
                                navController.navigate(Screen.VisitForm.createRoute(householdId, type))
                            },
                            onViewKnowledge = {
                                navController.navigate(Screen.KnowledgeAssets.createRoute(householdId))
                            },
                            onRegisterPregnancy = {
                                navController.navigate(Screen.RegisterPregnancy.createRoute(householdId))
                            },
                            onRegisterChild = {
                                navController.navigate(Screen.RegisterChild.createRoute(householdId))
                            },
                            onBack = { navController.popBackStack() }
                        )
                    }
                }

                composable(Screen.RegisterPregnancy.route) { backStackEntry ->
                    val householdId = backStackEntry.arguments?.getString("householdId") ?: ""
                    RegisterPregnancyScreen(
                        householdId = householdId,
                        onSubmit = { draft ->
                            scope.launch {
                                val chwId = sessionStore.catchmentId()
                                db.pregnancyDao().upsert(com.zisamale.data.local.PregnancyEntity(
                                    pregnancy_id = java.util.UUID.randomUUID().toString(),
                                    household_id = householdId,
                                    woman_name = draft.womanName,
                                    age = draft.age,
                                    parity = draft.parity,
                                    gravida = draft.gravida,
                                    lmp_date = draft.lmpDate,
                                    edd_date = draft.eddDate,
                                    prior_stillbirths = draft.priorStillbirths,
                                    prior_csections = draft.priorCsections,
                                    prior_pph = draft.priorPph,
                                    hiv_status = draft.hivStatus,
                                    bp_systolic = draft.bpSystolic,
                                    bp_diastolic = draft.bpDiastolic,
                                    hemoglobin = draft.hemoglobin,
                                    danger_signs = org.json.JSONArray(draft.dangerSigns.toList()).toString(),
                                    risk_score = null,
                                    risk_category = "low",
                                    top_risk_factors = "[]",
                                    next_visit_date = null,
                                    referral_needed = false,
                                    referral_facility_id = null,
                                    referral_status = null,
                                    is_active = true,
                                    chw_id = chwId,
                                    sync_status = "pending",
                                ))
                                navController.popBackStack()
                            }
                        },
                        onBack = { navController.popBackStack() }
                    )
                }

                composable(Screen.RegisterChild.route) { backStackEntry ->
                    val householdId = backStackEntry.arguments?.getString("householdId") ?: ""
                    RegisterChildScreen(
                        householdId = householdId,
                        onSubmit = { draft ->
                            scope.launch {
                                val chwId = sessionStore.catchmentId()
                                db.childDao().upsert(com.zisamale.data.local.ChildEntity(
                                    child_id = java.util.UUID.randomUUID().toString(),
                                    household_id = householdId,
                                    child_name = draft.childName,
                                    dob = draft.dob,
                                    sex = draft.sex,
                                    birth_weight_kg = draft.birthWeightKg,
                                    muac = draft.muac,
                                    weight_kg = draft.weightKg,
                                    height_cm = draft.heightCm,
                                    danger_signs = org.json.JSONArray(draft.dangerSigns.toList()).toString(),
                                    symptoms = org.json.JSONArray(draft.symptoms.toList()).toString(),
                                    risk_score = null,
                                    risk_category = "low",
                                    top_risk_factors = "[]",
                                    iccm_category = "uncomplicated",
                                    treatment_given = null,
                                    referral_needed = false,
                                    sync_status = "pending",
                                ))
                                navController.popBackStack()
                            }
                        },
                        onBack = { navController.popBackStack() }
                    )
                }

                composable(Screen.VisitForm.route) { backStackEntry ->
                    val householdId = backStackEntry.arguments?.getString("householdId") ?: ""
                    val visitType = backStackEntry.arguments?.getString("visitType") ?: "routine"
                    var dangerSigns by remember { mutableStateOf(setOf<String>()) }
                    var advice by remember { mutableStateOf<VisitAdvice?>(null) }
                    var villageName by remember { mutableStateOf<String?>(null) }
                    LaunchedEffect(householdId, visitType, dangerSigns) {
                        val household = db.householdDao().getById(householdId)
                        villageName = household?.village_name
                        val pregnancy = if (visitType == "pregnancy") db.pregnancyDao().getActiveByHousehold(householdId) else null
                        val child = if (visitType == "child") db.childDao().getByHousehold(householdId).firstOrNull() else null
                        advice = VisitAdvisor.advise(visitType, household, pregnancy, child, dangerSigns, edgeAi = edgeAi)
                    }
                    VisitFormScreen(
                        householdId = householdId, visitType = visitType, advice = advice,
                        villageName = villageName,
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
                                db.visitDao().insert(VisitEntity(
                                    visit_id = visitId, household_id = householdId,
                                    chw_id = sessionStore.catchmentId(),
                                    visit_date = System.currentTimeMillis(),
                                    pregnancy_id = submit.advice?.pregnancyId,
                                    child_id = submit.advice?.childId,
                                    visit_type = visitType,
                                    danger_signs = JSONArray(submit.dangerSigns.toList()).toString(),
                                    chw_notes = submit.notes, chw_override = submit.override,
                                    chw_override_reason = submit.overrideReason,
                                    ai_recommendation = recJson,
                                    ai_risk_score = submit.advice?.score?.riskScore,
                                    sync_status = "pending",
                                    photos_queued = submit.photos.size
                                ))
                                val photosDir = java.io.File(filesDir, "photos")
                                submit.photos.forEach { raw ->
                                    com.zisamale.util.PhotoCompressor.compressToJpeg(raw, photosDir)?.let { compressed ->
                                        raw.delete()
                                        db.photoDao().insert(com.zisamale.data.local.PhotoEntity(
                                            photo_id = UUID.randomUUID().toString(),
                                            visit_id = visitId,
                                            local_path = compressed.absolutePath,
                                            bytes = compressed.length()
                                        ))
                                    }
                                }
                                syncManager.syncPendingVisits()
                                edgeAi.drainTelemetry().forEach { record ->
                                    com.zisamale.data.remote.TelemetryBuffer.enqueue(
                                        com.zisamale.data.remote.ModelTelemetryRecordDto(
                                            kind = record.kind, model_version = record.modelVersion,
                                            source = record.source, inference_count = record.inferenceCount,
                                            fallback_count = record.fallbackCount, latency_ms_avg = record.latencyMsAvg,
                                        )
                                    )
                                }
                                com.zisamale.sync.SyncWorker.kickNow(this@MainActivity)
                                // Post-visit knowledge push: prompt CHW to share relevant health info
                                val householdName = db.householdDao().getById(householdId)?.village_name ?: "this household"
                                val snackbarResult = snackbarHostState.showSnackbar(
                                    message = "Share self-care knowledge with $householdName?",
                                    actionLabel = "View Knowledge",
                                    withDismissAction = true,
                                )
                                if (snackbarResult == SnackbarResult.ActionPerformed) {
                                    navController.navigate(Screen.KnowledgeAssets.createRoute(householdId))
                                } else {
                                    navController.navigate(Screen.ReferralForm.createRoute(visitId))
                                }
                            }
                        }
                    )
                }

                composable(Screen.ReferralForm.route) { backStackEntry ->
                    val visitId = backStackEntry.arguments?.getString("visitId") ?: ""
                    var pendingSms by remember { mutableStateOf<android.util.Pair<String, String>?>(null) }
                    val smsPerm = androidx.activity.compose.rememberLauncherForActivityResult(
                        androidx.activity.result.contract.ActivityResultContracts.RequestPermission()
                    ) { granted ->
                        val sms = pendingSms; pendingSms = null
                        if (granted && sms != null) com.zisamale.util.SmsFallback.send(this@MainActivity, sms.first, sms.second)
                    }
                    ReferralFormScreen(
                        visitId = visitId,
                        facilities = listOf(
                            FacilityOption("f1", "Nsanje District Hospital", 12.0f, true, 8.5f),
                            FacilityOption("f2", "Makhanga Health Centre", 5.0f, true, 7.2f),
                            FacilityOption("f3", "Thyolo District Hospital", 25.0f, false, 5.8f),
                        ),
                        onSubmit = { facilityId, urgency, reason ->
                            scope.launch {
                                val visit = db.visitDao().getById(visitId)
                                val household = visit?.let { db.householdDao().getById(it.household_id) }
                                val referralId = UUID.randomUUID().toString()
                                val referralCode = "REF-${referralId.takeLast(8).uppercase()}"
                                db.referralDao().insert(com.zisamale.data.local.ReferralEntity(
                                    referral_id = referralId, visit_id = visitId,
                                    patient_id = visit?.pregnancy_id ?: visit?.child_id ?: visit?.household_id.orEmpty(),
                                    patient_type = visit?.visit_type ?: "routine",
                                    referral_reason = reason, urgency = urgency,
                                    selected_facility_id = facilityId,
                                    chw_id = sessionStore.catchmentId(),
                                    referral_code = referralCode,
                                ))
                                com.zisamale.sync.FollowUpWorker.schedule(this@MainActivity, referralId)
                                if (urgency == "emergency" && batteryAwareSync.networkQuality() == com.zisamale.sync.NetworkQuality.NONE) {
                                    val text = com.zisamale.util.SmsFallback.redMessage(referralCode, household?.village_name, null)
                                    if (com.zisamale.util.SmsFallback.canSend(this@MainActivity))
                                        com.zisamale.util.SmsFallback.send(this@MainActivity, com.zisamale.util.SmsFallback.FACILITY_HOTLINE_MSISDN, text)
                                    else {
                                        pendingSms = android.util.Pair(com.zisamale.util.SmsFallback.FACILITY_HOTLINE_MSISDN, text)
                                        smsPerm.launch(android.Manifest.permission.SEND_SMS)
                                    }
                                }
                                syncManager.syncAll()
                                visits = syncManager.fetchPriorityList()
                                refreshPendingCounts(db, sessionStore) { h, v ->
                                    pendingHouseholds = h; pendingVisits = v
                                }
                                navController.navigate(Screen.Dashboard.route) {
                                    popUpTo(Screen.Dashboard.route) { inclusive = true }
                                }
                            }
                        }
                    )
                }

                // ── SAMALA-AI: Knowledge Translation screens ─────────

                composable(Screen.KnowledgeAssets.route) { backStackEntry ->
                    val householdId = backStackEntry.arguments?.getString("householdId") ?: ""
                    var assets by remember { mutableStateOf<List<com.zisamale.data.remote.SamalaAsset>>(emptyList()) }
                    var guides by remember { mutableStateOf<List<com.zisamale.data.remote.SamalaGuide>>(emptyList()) }
                    var topicHints by remember { mutableStateOf<List<String>>(emptyList()) }
                    var loading by remember { mutableStateOf(true) }
                    LaunchedEffect(householdId) {
                        try {
                            val resp = syncManager.api.getContextualAssets(householdId)
                            assets = resp.matched_assets
                            guides = resp.matched_guides
                            topicHints = resp.topic_hints
                        } catch (_: Exception) { }
                        loading = false
                    }
                    KnowledgeAssetsScreen(
                        householdId = householdId,
                        assets = assets,
                        guides = guides,
                        topicHints = topicHints,
                        onAssetClick = { },
                        onGuideClick = { guide ->
                            navController.navigate(Screen.SelfCareGuide.createRoute(guide.guide_id))
                        },
                        onBack = { navController.popBackStack() },
                    )
                }

                composable(Screen.SelfCareGuide.route) { backStackEntry ->
                    val guideId = backStackEntry.arguments?.getString("guideId") ?: ""
                    var guide by remember { mutableStateOf<com.zisamale.data.remote.SamalaGuide?>(null) }
                    LaunchedEffect(guideId) {
                        try { guide = syncManager.api.getSelfCareGuide(guideId) } catch (_: Exception) { }
                    }
                    guide?.let { g ->
                        SelfCareGuideScreen(guide = g, onBack = { navController.popBackStack() })
                    }
                }

                composable(Screen.TalkPresenter.route) { backStackEntry ->
                    val talkId = backStackEntry.arguments?.getString("talkId") ?: ""
                    var talk by remember { mutableStateOf<com.zisamale.data.remote.SamalaTalk?>(null) }
                    LaunchedEffect(talkId) {
                        try { talk = syncManager.api.getHealthTalk(talkId) } catch (_: Exception) { }
                    }
                    talk?.let { t ->
                        TalkPresenterScreen(
                            talk = t,
                            chwId = sessionStore.catchmentId(),
                            onCreateDeployment = { request ->
                                try { syncManager.api.createDeployment(request).body() } catch (_: Exception) { null }
                            },
                            onBack = { navController.popBackStack() },
                            onDeployed = { navController.popBackStack() },
                        )
                    }
                }

                // Account tab — user info + sign out
                composable("account") {
                    Column(modifier = Modifier.fillMaxSize()) {
                        PageHeader(
                            title = "Account",
                            subtitle = "Akaunti",
                        )
                        Column(
                            modifier = Modifier.padding(horizontal = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            AccountInfoRow("Name / Dzina", sessionStore.displayName ?: "CHW")
                            AccountInfoRow("Catchment", sessionStore.catchmentId() ?: "-")
                            AccountInfoRow("Pending sync", "${pendingHouseholds + pendingVisits} items")
                            Spacer(Modifier.height(12.dp))
                            Button(
                                onClick = {
                                    sessionStore.clear()
                                    navController.navigate(Screen.Login.route) {
                                        popUpTo(0) { inclusive = true }
                                    }
                                },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = RiskCritical),
                            ) {
                                Text("Sign out / Tulukani")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AccountInfoRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Text("$label: ", style = MaterialTheme.typography.bodyMedium, color = MutedInk)
        Text(value, style = MaterialTheme.typography.bodyMedium)
    }
}

private suspend fun refreshPendingCounts(
    db: ZisamaleDatabase,
    sessionStore: SessionStore,
    onResult: (pendingHouseholds: Int, pendingVisits: Int) -> Unit,
) {
    val chwId = sessionStore.catchmentId() ?: return
    val hCount = db.householdDao().getUnsynced().size
    val vCount = db.visitDao().getUnsynced().size
    onResult(hCount, vCount)
}

@androidx.compose.runtime.Composable
private fun LockScreen(onUnlocked: () -> Unit, onSignOut: () -> Unit) {
    val activity = androidx.compose.ui.platform.LocalContext.current as? FragmentActivity
    var status by remember { mutableStateOf<String?>(null) }

    fun challenge() {
        if (activity == null) { status = "Device unlock unavailable"; return }
        when (BiometricGate.availability(activity)) {
            BiometricGate.Availability.Ready,
            is BiometricGate.Availability.TryCredentialOnly ->
                BiometricGate.authenticate(activity,
                    title = "Unlock Zisamale",
                    subtitle = "Confirm it's you to open the clinic register",
                    onSuccess = onUnlocked,
                    onError = { msg -> if (msg.isNotEmpty()) status = msg })
            BiometricGate.Availability.NoCredential ->
                status = "No screen lock set up. Sign out, enable a screen lock, then sign in again."
        }
    }
    LaunchedEffect(Unit) { challenge() }

    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Zisamale", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(8.dp))
        Text("Locked — confirm your screen lock to continue", style = MaterialTheme.typography.bodyMedium)
        Text("Zitseka — tsimikizirani kuti ndi inu", style = MaterialTheme.typography.bodySmall)
        Spacer(Modifier.height(24.dp))
        Button(onClick = { challenge() }) { Text("Unlock / Tsegulani") }
        Spacer(Modifier.height(12.dp))
        TextButton(onClick = onSignOut) { Text("Sign out / Tulukani") }
        status?.let { Spacer(Modifier.height(16.dp)); Text(it, style = MaterialTheme.typography.bodySmall) }
    }
}
