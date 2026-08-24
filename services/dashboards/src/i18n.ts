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
} as const;

export type StringKey = keyof typeof strings;

export function t(key: StringKey, lang: Language = "en"): string {
  return strings[key]?.[lang] ?? key;
}

export function bilingual(key: StringKey): { primary: string; secondary: string } {
  return { primary: strings[key].ny, secondary: strings[key].en };
}
