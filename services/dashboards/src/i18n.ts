/** Chichewa ↔ English bilingual strings for the Zisamale design system. */

export type Language = "en" | "ny";

export const strings = {
  // App
  appName: { en: "Zisamale", ny: "Zisamale" },
  welcome: { en: "Welcome to Zisamale", ny: "Takulandirani ku Zisamale!" },

  // Navigation
  overview: { en: "Overview", ny: "Onse" },
  riskMap: { en: "Risk Map", ny: "Chithunzi cha Mataro" },
  chws: { en: "CHWs", ny: "ASHA" },
  trends: { en: "Trends", ny: "Malingaliro" },
  alerts: { en: "Alerts", ny: "Xenjelo" },
  settings: { en: "Settings", ny: "Zosankha" },

  // Risk levels
  riskCritical: { en: "Critical", ny: "YAMBIKANI" },
  riskHigh: { en: "High Risk", ny: "CHANGU" },
  riskMedium: { en: "Medium Risk", ny: "CHIDULE" },
  riskLow: { en: "Low Risk", ny: "BWINO" },

  // Actions
  visitNow: { en: "Visit Now", ny: "Pitani Tsopano" },
  acknowledge: { en: "Acknowledge", ny: "Dziwitsani" },
  deployDRRT: { en: "Deploy DRRT", ny: "Tumizani Gulu" },
  requestSupplies: { en: "Request Supplies", ny: "Funsani Zida" },
  tryAgain: { en: "Try Again", ny: "Yesereni" },
  save: { en: "Save", ny: "Sungani" },
  cancel: { en: "Cancel", ny: "Ganizirani" },
  signIn: { en: "Sign In", ny: "Lowelani" },
  signOut: { en: "Sign Out", ny: "Tulukani" },
  syncNow: { en: "Sync Now", ny: "Sungani Tsopano" },
  continueWorking: { en: "Continue Working", ny: "Pitirizani Ntchito" },

  // Data freshness (surveillance honesty)
  freshnessLive: { en: "Live", ny: "Yatsopano" },
  freshnessRecent: { en: "Recent", ny: "Kukhalaposa" },
  freshnessStale: { en: "Stale", ny: "Yakale" },
  freshnessHistoric: { en: "Historic", ny: "Zakalekwale" },
  freshnessNever: { en: "Never synced", ny: "Sanagwire ntchito" },
  freshnessNeverSynced: {
    en: "No sync on record",
    ny: "Palibe chogwirizana cholembedwa",
  },

  // Sync status
  syncing: { en: "Saving things...", ny: "Kusunga zinthu..." },
  syncComplete: { en: "Saved!", ny: "Zasungidwa!" },
  syncFailed: {
    en: "We couldn't save. Is your phone on the internet?",
    ny: "Sitinathe kusunga. Foni yanuyo ili pa intaneti?",
  },

  // Offline
  offlineTitle: { en: "You are offline", ny: "Muli pa intaneti" },
  offlineBody: {
    en: "Your data is safe. Sync when you have signal.",
    ny: "Zinthu zanu zili bwino. Sungani pamene muli ndi siginecha.",
  },

  // Empty states
  noVisitsToday: { en: "No visits today", ny: "Lero mulibe alendo" },
  noVisitsSubtext: { en: "You look like you know.", ny: "Mukuwoneka ngati mukudziwa." },

  // Error
  errorGeneric: {
    en: "Something went wrong. Let's try again.",
    ny: "Pali vuto. Tiyeserenso.",
  },
  errorNetwork: {
    en: "Connection problem. Your data is safe on your phone.",
    ny: "Vuto la kukhoma. Zinthu zanu zili pa foni yanu.",
  },
  errorInput: {
    en: "Please write numbers only. Example: 11.5",
    ny: "Chonde lembani nambala yokha. Chitsanzo: 11.5",
  },

  // Dashboard titles
  executiveSummary: { en: "Executive Summary", ny: "Mwachidule" },
  districtScorecard: { en: "District Health Scorecard", ny: "Kadi ya Zaumoyo ya D District" },
  resourceForecast: { en: "Resource Forecasting", ny: "Kufotokozera Zosungidwa" },
  fieldSurveillance: { en: "Field Surveillance", ny: "Kuyang'anira kwa M'munda" },
  fieldReport: { en: "Field Report", ny: "Chidule cha M'munda" },

  // Knowledge translation (SAMALA-AI)
  knowledgeTranslation: { en: "Knowledge Translation", ny: "Kusamalira Nzeru" },
  selfCare: { en: "Self-Care Guides", ny: "Malingaliro a Kuzisamala" },

  // Data gap report
  reportTitle: {
    en: "Monthly Field Intelligence Report",
    ny: "Chidule cha Mwezi wa M'munda",
  },
  reportSubtitle: {
    en: "Grant-ready report, honest about upstream data quality",
    ny: "Chidule cha zolingalira, choona za data mwachikhulupiriro",
  },
  reportPrint: { en: "Print", ny: "Kupira" },
  reportDownloadTxt: { en: "Download .txt", ny: "Tsitsa .txt" },
  loading: { en: "Loading...", ny: "Kutsata..." },

  // Report hub
  reports: { en: "Reports", ny: "Mas.splitContainer" },
  reportHubTitle: { en: "Reports", ny: "MasplitCube" },
  reportHubSubtitle: { en: "Generate visual reports for leadership, donors, and program management", ny: "Mapuleti a massplitCube a mutu" },
  reportFieldIntel: { en: "Field Intelligence Report", ny: "Chidule cha M'munda" },
  reportFieldIntelDesc: {
    en: "Grant-ready document covering upstream data quality, AI model performance, and platform value proposition for donors.",
    ny: "Kalata ya ndalama, ubwino wa data, ndi makhalidwe a AI kwa othandizira.",
  },
  reportQuickStats: { en: "Platform Overview", ny: "Kuwunika kwa Thanzi" },
  reportStudiesIngested: { en: "Studies Ingested", ny: "Kafukufuku Olowera" },
  reportAssetsCreated: { en: "Assets Created", ny: "Zolumikizira Zopangidwa" },
  reportGuidesAvailable: { en: "Self-Care Guides", ny: "Malingaliro a Kuzisamala" },
  reportTalksReady: { en: "Health Talks", ny: "Kukambirana Kwa Thanzi" },
  reportGenerationNote: { en: "About These Reports", ny: "Zokhuzana ndi MasplitCube" },
  reportGenerationNoteBody: {
    en: "Reports are generated from live data. Each report pulls from the same surveillance, knowledge translation, and field data that powers the dashboards. Print or save for grant reporting, district reviews, and MoHP briefings.",
    ny: "MasplitCube amapangidwa kuchokera ku data yamaundo. Kaliconse kamagwira ntchito ndi deta imodzi yomwe imathandiza ma dashboard.",
  },

  // District Health Report
  reportDistrictHealth: { en: "District Health Overview", ny: "Kuwunika kwa Boma" },
  reportDistrictHealthDesc: {
    en: "Monthly surveillance summary, CHW activity, fever trends, danger sign referrals, and AI override analysis.",
    ny: "Chidule cha mwezi, ntchito ya CHW, malungo, zizindikiro zowopsa, ndi kukambirana kwa AI.",
  },
  reportDistricts: { en: "districts reporting", ny: "maboma ochita malreport" },
  reportVisitsThisWeek: { en: "Visits This Week", ny: "Kuunikidwa Sabata Ino" },
  reportFeverCases: { en: "Fever Cases", ny: "Anthu Ndimalungo" },
  reportDangerReferrals: { en: "Danger Referrals", ny: "Othandizidwa Chifukwa Chowopsa" },
  reportAIOverrides: { en: "AI Overrides", ny: "Kusintha kwa AI" },
  reportActiveCHWs: { en: "active CHWs", ny: "CHW ogwira" },
  reportFeverTrend: { en: "Weekly Fever Trend", ny: "Malungo pa Sabata" },
  reportOverrideReasons: { en: "Override Reasons", ny: "Zifukwa zosintha" },
  reportDistrictComparison: { en: "District Comparison: CHW vs DHIS2", ny: "Kufanizira: CHW vs DHIS2" },
  reportCHWFever: { en: "CHW Fever", ny: "Malungo CHW" },
  reportDataQuality: { en: "Upstream Data Quality", ny: "Ubwinobwino wa Data" },
  reportDHIS2Note: { en: "Not connected — facility columns stay empty", ny: "Sagwirizana — mndandanda wa chipatala umakhala wopanda kanthu" },
  reportICHISNote: { en: "Not connected — sync status unknown", ny: "Sagwirizana — status ya kusakaniza sangadziwike" },
  reportLMISNote: { en: "Not connected — stock data unavailable", ny: "Sagwirizana — deta ya ziweto ilibe" },
  reportNoData: { en: "No data available for this period", ny: "Palibe data kwa nthawi imeneyi" },
  reportNoOverrides: { en: "No AI overrides recorded", ny: "Palibe kusintha kwa AI" },
  reportNarrative: { en: "Executive Summary", ny: "Mwachidule" },
  reportNarrativeBody1: {
    en: "This reporting period recorded",
    ny: "Nthawi imeneyi ina",
  },
  reportNarrativeBody2: {
    en: "home visits across all districts.",
    ny: "kuunikidwa kunyumba m'maboma onse.",
  },
  reportNarrativeBody3: {
    en: "CHWs were active this period.",
    ny: "CHW ogwira ntchito pa nthawi imeneyi.",
  },
  reportNarrativeBody4: {
    en: "AI recommendation overrides were logged.",
    ny: "Kusintha kwa ma AI recommendation kunalembedwa.",
  },
  reportNarrativeBody5: {
    en: "Each override should be reviewed to improve future recommendations.",
    ny: "Kusintha kulikonse kuyenera kuunikidwa kuti malingaliro amtsogolo akhale abwino.",
  },
  reportNarrativeFooter: {
    en: "Note: DHIS2, iCHIS/CHT, and LMIS integrations are not yet connected. This report reflects only CHW-reported field data.",
    ny: "Chenjezo: DHIS2, iCHIS/CHT, ndi LMIS zilibe chigwirizano. Chidulechi chimaonetsa data ya m'munda ya CHW.",
  },

  // SAMALA Report
  reportSAMALA: { en: "Knowledge Translation Impact", ny: "Kudzifunira Kudzifunira" },
  reportSAMALADesc: {
    en: "Research deployment status, asset inventory, community health talks, and self-care guide coverage.",
    ny: "Ntchito ya kafukufuku, ziweto, kukambirana, ndi malingaliro a kuzisamala.",
  },
  reportStudies: { en: "studies", ny: "kafukufuku" },
  reportAssets: { en: "assets", ny: "ziweto" },
  reportTotalStudies: { en: "Total Studies", ny: "Kafukufuku Onse" },
  reportTotalAssets: { en: "Knowledge Assets", ny: "Ziweto Zanzeru" },
  reportTotalGuides: { en: "Self-Care Guides", ny: "Malingaliro a Kuzisamala" },
  reportTotalTalks: { en: "Community Talks", ny: "Kukambirana" },
  reportTopicCoverage: { en: "Topic Coverage", ny: "Kufikira Kwa Mutu" },
  reportAssetsAndStudies: { en: "Assets & Studies", ny: "Ziweto ndi Kafukufuku" },
  reportAssetTypes: { en: "Asset Type Distribution", ny: "Kugawidwa Kwa Ziweto" },
  reportStudyStatus: { en: "Study Status", ny: "Status ya Kafukufuku" },
  reportDeploymentStatus: { en: "Deployment & Impact", ny: "Kutumiza ndi Kubwera" },
  reportDeployments: { en: "Deployments", ny: "Kutumiza" },
  reportHouseholdsReached: { en: "Households Reached", ny: "Banja Lokwafikira" },
  reportKnowledgeChange: { en: "Knowledge Change", ny: "Kusintha kwa Nzeru" },
  reportDeploymentNote: {
    en: "No deployments recorded yet. Deploy knowledge assets through CHW home visits to start tracking impact.",
    ny: "Palibe kutumiza kwalembedwa. Tumizani ziweto m'nyumba kuti muwone ubwino wake.",
  },
  reportStudiesInventory: { en: "Studies Inventory", ny: "Mwandandanda wa Kafukufuku" },
  reportTableTitle: { en: "Title", ny: "Diwa" },
  reportTableTopic: { en: "Topic", ny: "Mutu" },
  reportTableDesign: { en: "Design", ny: "Kwapangidwa" },
  reportTableDistrict: { en: "District", ny: "Boma" },
  reportTableConsent: { en: "Consent", ny: "Kuvomereza" },
  reportTableStatus: { en: "Status", ny: "Status" },
  reportSelfCareGuides: { en: "Self-Care Guides", ny: "Malingaliro a Kuzisamala" },
  reportCommunityTalks: { en: "Community Health Talks", ny: "Kukambirana Kwa Thanzi" },
  reportSAMALANarrative: { en: "Impact Summary", ny: "Mwachidule Wabwino" },
  reportSAMALANarrativeBody1: {
    en: "SAMALA-AI has ingested",
    ny: "SAMALA-AI wabwezera",
  },
  reportSAMALANarrativeBody2: {
    en: "research studies covering",
    ny: "kafukufuku okhuzana ndi",
  },
  reportSAMALANarrativeBody3: {
    en: "health topics from Malawi.",
    ny: "mautumizinga a thanzi ku Malawi.",
  },
  reportSAMALANarrativeBody4: {
    en: "From these studies,",
    ny: "Kuchokera ku kafukufuku amenewa,",
  },
  reportSAMALANarrativeBody5: {
    en: "knowledge assets have been synthesized for community deployment.",
    ny: "ziweto zanzeru zapangidwa kuti zitumizidwe kwa anthu.",
  },
  reportSAMALANarrativeFooter: {
    en: "All content is bilingual (English + Chichewa) and designed for CHW delivery through home visits and community meetings.",
    ny: "Zonse zili mbili (Chingerezi + Chichewa) ndi zapangidwa kuti CHW azitumiza m'nyumba ndi kukambirana.",
  },

  // Field surveillance page
  facilityView: { en: "Facility View", ny: "Chidule cha Chipatala" },
  fieldView: { en: "Field View", ny: "Chidule cha M'munda" },
  surveillanceTitle: { en: "Field Surveillance", ny: "Kuyang'anira kwa M'munda" },
  surveillanceSubtitle: {
    en: "Real-time signal from community health workers, independent of facility reporting",
    ny: "Chidule choona nthawi yomweyo kwa othandiza a thanzi, osadalira mipando ya chipatala",
  },
  visitsThisWeek: { en: "Visits this week", ny: "Kuunikidwa sabata ino" },
  feverClusters: { en: "Fever clusters", ny: "Malungo mong'onoza" },
  dangerReferrals: { en: "Danger-sign referrals", ny: "Zizindikiro zowopsa" },
  taHeatmap: { en: "TA activity heatmap", ny: "Madera a TA" },
  feverTrend: { en: "Fever reports by week", ny: "Malungo pa sabata" },
  overridePatterns: { en: "CHW override patterns", ny: "Zosintha za othandiza" },
  dataComparison: { en: "CHW vs DHIS2 comparison", ny: "Kufanizira CHW na DHIS2" },
  comparisonNote: {
    en: "DHIS2 case counts are not connected yet; those columns stay empty rather than showing invented numbers.",
    ny: "DHIS2 sinagwirizane; mipango imeneyi ikhali yopanda kanthu, osati nambala zopangidwa.",
  },
  colReason: { en: "Reason", ny: "Chifukwa" },
  colCount: { en: "Count", ny: "Chiwerengero" },
  colTrend: { en: "Trend", ny: "Kusintha" },
  colDistricts: { en: "Districts", ny: "Maboma" },
  colDistrictName: { en: "District", ny: "Boma" },
  colChwFever: { en: "CHW fever", ny: "Malungo CHW" },
  colDhis2Malaria: { en: "DHIS2 malaria", ny: "Malungo DHIS2" },
  colGap: { en: "Gap", ny: "Kusiyana" },
  noVisitsRecorded: { en: "No visits recorded", ny: "Palibe kuunikidwa" },


  // Greetings
  greetingMorning: { en: "Good morning", ny: "Mawa abwino" },
  greetingAfternoon: { en: "Good afternoon", ny: "Madzulo abwino" },
  greetingEvening: { en: "Good evening", ny: "Usiku wabwino" },

  // Actions
  acknowledgeMsg: {
    en: "You want to change? Thank you — your knowledge is important.",
    ny: "Mukufuna kusintha? Zikomo — kudziwa kwanu ndikofunika.",
  },
  overrideReason: { en: "Reason for override — optional", ny: "Chifukwa — osiyenera" },
  overridePatientRefused: { en: "Patient refused", ny: "Wodwalayo akana" },
  overrideKnowFamily: { en: "I know this family", ny: "Ndidziwa banthu ili" },
  overrideSymptomsChanged: { en: "S symptoms changed", ny: "Zizindikiro zasinthidwa" },
  overrideOther: { en: "Other", ny: "Zina" },

  // Chat / common
  howAreYou: { en: "How are you seeing the patient today?", ny: "Mukuwona bwanji lero?" },
  thankYou: { en: "Thank you for letting us know.", ny: "Zikomo chifukwa cha kudziwitsa." },

  // Placeholder
  tapToSpeak: { en: "Tap to speak", ny: "Dikirani kuyankhula" },
  typeHere: { en: "Type here...", ny: "Lembani apa..." },

  // Date
  lastSync: { en: "Last sync", ny: "Kusunga koyambirira" },
  lastVisit: { en: "Last visit", ny: "Chisuma choyambirira" },
  daysAgo: { en: "days ago", ny: "masiku apita" },
  dueToday: { en: "Due today", ny: "Lero" },
  overdue: { en: "Overdue", ny: "Kutherera" },
  dueIn: { en: "Due in", ny: "Lero mu" },

  // Table
  noData: { en: "No data available", ny: "Palibe deta" },
  search: { en: "Search", ny: "Sakani" },
  filter: { en: "Filter", ny: "Sankhani" },

  // Password
  password: { en: "Password", ny: "Mawu achinsinsi" },
  email: { en: "Email", ny: "Imelo" },
  username: { en: "Username", ny: "Dzina la wogwiritsa" },

  // Roles
  roleDHO: { en: "District Health Officer", ny: "Woyang'anira Zaumoyo" },
  roleMOHP: { en: "Ministry of Health Policy", ny: "Ofesi ya Zaumoyo" },
  roleCHW: { en: "Community Health Worker", ny: "Woyang'anira Thanzi la Mtundu" },
  rolePHIM: { en: "Public Health Information Manager", ny: "Woyang'anira Nkhokwe ya Thanzi" },
  roleSupervisor: { en: "Supervisor", ny: "Woyang'anira" },

  // Moyo Map header
  moyoMapTitle: { en: "Moyo Map", ny: "Mapu ya Moyo" },
  moyoMapTagline: { en: "Spatial Health Intelligence", ny: "Chidziwitso za Umoyo pa Mapu" },
  moyoMapSubtitle: {
    en: "Real-time decision support for health delivery",
    ny: "Chithandizo chosavuta popanda kuchedwa",
  },
  live: { en: "Live", ny: "Mwamva" },
  refresh: { en: "Refresh", ny: "Sinthani" },

  // Scorecard carousel
  showingOnMap: { en: "Showing on map — press ESC to reset", ny: "Kuwonekera pa mapu — kankhira ESC" },
  facilitiesWord: { en: "facilities", ny: "zipatala" },
  alertsWord: { en: "alerts", ny: "mapepala ochenjera" },
  stockoutsWord: { en: "stockouts", ny: "zosowa" },
  allClear: { en: "All clear", ny: "Zili bwino" },
  noRiskData: { en: "No data", ny: "Palibe data" },
  previousDistrict: { en: "Previous district", ny: "Boma lapitala" },
  nextDistrict: { en: "Next district", ny: "Boma lina" },

  // Executive summary
  weeklyExecSummary: { en: "Weekly Executive Summary", ny: "Chidule cha Sabata" },
  generatedByAi: { en: "Generated by Zisamale AI", ny: "Anapanga Zisamale AI" },
  aiRecommendation: { en: "AI Recommendation", ny: "Malangizo a AI" },
  exportText: { en: "Export as Text", ny: "Kopera Mawu" },
  modelInChuma: { en: "Model in CHUMA", ny: "Yesani mu CHUMA" },
  shareWithFinance: { en: "Share with Finance", ny: "Gawani ndi Finance" },

  // Layer control
  mapLayers: { en: "Map Layers", ny: "Mapu Maofesi" },
  layersLabel: { en: "Layers", ny: "Maofesi" },
  resetDefaults: { en: "Reset to defaults", ny: "Kubwerera Koyamba" },

  // Recovery actions
  clearFilters: { en: "Clear all filters", ny: "Chotsani zosankha zonse" },
  undo: { en: "Undo", ny: "Bwezerani" },
  alertDismissed: {
    en: "Alert dismissed.",
    ny: "Chenjelo chachotsedwa.",
  },
  noAlertsAtAll: {
    en: "No alerts right now. New alerts appear here when the model flags rising risk.",
    ny: "Palibe chenjelo tsopano. Zidzawonekera apa pamene ziwopseza zakula.",
  },

  // Knowledge topics & dissemination
  researchSearch: { en: "Research Library", ny: "Kafukufuku wa Zaumoyo" },
  communityBrief: { en: "Community Action Brief", ny: "Malangizo a m'Mudzi" },
  clinicalEvidence: { en: "Clinical Evidence", ny: "Zotsatira za Chipatala" },
  knowledgeTopics: { en: "Knowledge Topics", ny: "Mautumiki wa Chidziwitso" },
  knowledgeAssets: { en: "Knowledge Assets", ny: "Zinthu za Chidziwitso" },
  deploymentHeatmap: { en: "Deployment Heatmap", ny: "Chithunzi cha Kutumiza" },
  impactTrajectory: { en: "Impact Trajectory", ny: "Kuyenda kwa Mphamvu" },
  pipelineView: { en: "Knowledge Pipeline", ny: "Mtundu wa Chidziwitso" },
  exportPrint: { en: "Export & Print", ny: "Tulutsani & Printing" },
  studies: { en: "Studies", ny: "Kafukufuku" },
  assets: { en: "Assets", ny: "Zinthu" },
  deployments: { en: "Deployments", ny: "Kutumiza" },
  householdsReached: { en: "Households Reached", ny: "Nyumba Zofikidwa" },
  guides: { en: "Guides", ny: "Mawu" },
  talks: { en: "Talks", ny: "Kulankhula" },
  topics: { en: "Topics", ny: "Mawu" },
  preScore: { en: "Pre-Score", ny: "Kadi Yoyambira" },
  postScore: { en: "Post-Score", ny: "Kadi Yotsiriza" },
  improvement: { en: "Improvement", ny: "Kukweza" },
  allTopics: { en: "All Topics", ny: "Mawu Onse" },
  allTypes: { en: "All Types", ny: "Mitundu Yonse" },
  english: { en: "English", ny: "Chingerezi" },
  chichewa: { en: "Chichewa", ny: "Chichewa" },
  keyActions: { en: "Key Actions", ny: "Zochita Zofunika" },
  noDeploymentsYet: { en: "No deployments yet. Deploy assets to see the heatmap.", ny: "Palibe kutumizira. Tumizani zinthu kuona chithunzi." },
  monthlyBrief: { en: "Monthly Brief", ny: "Nkhani ya Mwezi" },
  talkKit: { en: "Talk Kit", ny: "Kiti ya Kulankhula" },
  guidePoster: { en: "Guide Poster", ny: "Poster ya Mawu" },
  printSavePdf: { en: "Print / Save as PDF", ny: "Sindikizani / Sungani ngati PDF" },
  selectTalk: { en: "Select a talk...", ny: "Sankhani kulankhula..." },
  selectGuide: { en: "Select a guide...", ny: "Sankhani mawu..." },
  sourceResearch: { en: "Source Research", ny: "Kafukufuku Wochokera" },
  discussionQuestions: { en: "Discussion Questions", ny: "Mafunso owokera" },
  pledgeCard: { en: "Pledge Card", ny: "Khadi ya Lumbikano" },
  whatIsIt: { en: "What is it?", ny: "Ndi chiyani?" },
  whatToDoNow: { en: "What to do now", ny: "Chochita tsopano" },
  whatNotToDo: { en: "What NOT to do", ny: "ZOSACHITA" },
  whenToSeekHelp: { en: "When to seek help immediately", ny: "Mutanthauzire thandizo nthawi yomweyo" },
  prevention: { en: "Prevention", ny: "Kupewa" },
  generatedBy: { en: "Generated by Zisamale SAMALA-AI", ny: "Zapangidwa ndi Zisamale SAMALA-AI" },
  pocketCards: { en: "Pocket Cards", ny: "Makhadi a PA manja" },
  flipbook: { en: "Flipbook", ny: "Buku la Zithunzi" },
  communityHealthTalk: { en: "Community Health Talk", ny: "Kukambirana Thanzi la Anthu" },
  printFlipbook: { en: "Print Flipbook", ny: "Sindikizani Buku" },
  talkQuickCards: { en: "Talk Quick Cards", ny: "Makhadi a Kulankhula" },
} as const;

export type StringKey = keyof typeof strings;

export function t(key: StringKey, lang: Language = "en"): string {
  return strings[key]?.[lang] ?? key;
}

export function bilingual(key: StringKey): { primary: string; secondary: string } {
  return { primary: strings[key].ny, secondary: strings[key].en };
}
