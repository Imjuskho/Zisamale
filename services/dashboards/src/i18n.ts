/** Chichewa ↔ English bilingual strings for the Zisamale design system. */

export const strings = {
  // App
  appName: { en: "Zisamale", cy: "Zisamale" },
  welcome: { en: "Welcome to Zisamale", cy: "Takulandirani ku Zisamale!" },

  // Navigation
  overview: { en: "Overview", cy: "Onse" },
  riskMap: { en: "Risk Map", cy: "Chithunzi cha Mataro" },
  chws: { en: "CHWs", cy: "ASHA" },
  trends: { en: "Trends", cy: "Malingaliro" },
  alerts: { en: "Alerts", cy: "Xenjelo" },
  settings: { en: "Settings", cy: "Zosankha" },

  // Risk levels
  riskCritical: { en: "Critical", cy: "YAMBIKANI" },
  riskHigh: { en: "High Risk", cy: "CHANGU" },
  riskMedium: { en: "Medium Risk", cy: "CHIDULE" },
  riskLow: { en: "Low Risk", cy: "BWINO" },

  // Actions
  visitNow: { en: "Visit Now", cy: "Pitani Tsopano" },
  acknowledge: { en: "Acknowledge", cy: "Dziwitsani" },
  deployDRRT: { en: "Deploy DRRT", cy: "Tumizani Gulu" },
  requestSupplies: { en: "Request Supplies", cy: "Funsani Zida" },
  tryAgain: { en: "Try Again", cy: "Yesereni" },
  save: { en: "Save", cy: "Sungani" },
  cancel: { en: "Cancel", cy: "Ganizirani" },
  signIn: { en: "Sign In", cy: "Lowelani" },
  signOut: { en: "Sign Out", cy: "Tulukani" },
  syncNow: { en: "Sync Now", cy: "Sungani Tsopano" },
  continueWorking: { en: "Continue Working", cy: "Pitirizani Ntchito" },

  // Sync status
  syncing: { en: "Saving things...", cy: "Kusunga zinthu..." },
  syncComplete: { en: "Saved!", cy: "Zasungidwa!" },
  syncFailed: {
    en: "We couldn't save. Is your phone on the internet?",
    cy: "Sitinathe kusunga. Foni yanuyo ili pa intaneti?",
  },

  // Offline
  offlineTitle: { en: "You are offline", cy: "Muli pa intaneti" },
  offlineBody: {
    en: "Your data is safe. Sync when you have signal.",
    cy: "Zinthu zanu zili bwino. Sungani pamene muli ndi siginecha.",
  },

  // Empty states
  noVisitsToday: { en: "No visits today", cy: "Lero mulibe alendo" },
  noVisitsSubtext: { en: "You look like you know.", cy: "Mukuwoneka ngati mukudziwa." },

  // Error
  errorGeneric: {
    en: "Something went wrong. Let's try again.",
    cy: "Pali vuto. Tiyeserenso.",
  },
  errorNetwork: {
    en: "Connection problem. Your data is safe on your phone.",
    cy: "Vuto la kukhoma. Zinthu zanu zili pa foni yanu.",
  },
  errorInput: {
    en: "Please write numbers only. Example: 11.5",
    cy: "Chonde lembani nambala yokha. Chitsanzo: 11.5",
  },

  // Dashboard titles
  executiveSummary: { en: "Executive Summary", cy: "Mwachidule" },
  districtScorecard: { en: "District Health Scorecard", cy: "Kadi ya Zaumoyo ya D District" },
  resourceForecast: { en: "Resource Forecasting", cy: "Kufotokozera Zosungidwa" },

  // Greetings
  greetingMorning: { en: "Good morning", cy: "Mawa abwino" },
  greetingAfternoon: { en: "Good afternoon", cy: "Madzulo abwino" },
  greetingEvening: { en: "Good evening", cy: "Usiku wabwino" },

  // Actions
  acknowledgeMsg: {
    en: "You want to change? Thank you — your knowledge is important.",
    cy: "Mukufuna kusintha? Zikomo — kudziwa kwanu ndikofunika.",
  },
  overrideReason: { en: "Reason for override — optional", cy: "Chifukwa — osiyenera" },
  overridePatientRefused: { en: "Patient refused", cy: "Wodwalayo akana" },
  overrideKnowFamily: { en: "I know this family", cy: "Ndidziwa banthu ili" },
  overrideSymptomsChanged: { en: "S symptoms changed", cy: "Zizindikiro zasinthidwa" },
  overrideOther: { en: "Other", cy: "Zina" },

  // Chat / common
  howAreYou: { en: "How are you seeing the patient today?", cy: "Mukuwona bwanji lero?" },
  thankYou: { en: "Thank you for letting us know.", cy: "Zikomo chifukwa cha kudziwitsa." },

  // Placeholder
  tapToSpeak: { en: "Tap to speak", cy: "Dikirani kuyankhula" },
  typeHere: { en: "Type here...", cy: "Lembani apa..." },

  // Date
  lastSync: { en: "Last sync", cy: "Kusunga koyambirira" },
  lastVisit: { en: "Last visit", cy: "Chisuma choyambirira" },
  daysAgo: { en: "days ago", cy: "masiku apita" },
  dueToday: { en: "Due today", cy: "Lero" },
  overdue: { en: "Overdue", cy: "Kutherera" },
  dueIn: { en: "Due in", cy: "Lero mu" },

  // Table
  noData: { en: "No data available", cy: "Palibe deta" },
  search: { en: "Search", cy: "Sakani" },
  filter: { en: "Filter", cy: "Sankhani" },

  // Password
  password: { en: "Password", cy: "Mawu achinsinsi" },
  email: { en: "Email", cy: "Imelo" },
  username: { en: "Username", cy: "Dzina la wogwiritsa" },

  // Roles
  roleDHO: { en: "District Health Officer", cy: "Woyang'anira Zaumoyo" },
  roleMOHP: { en: "Ministry of Health Policy", cy: "Ofesi ya Zaumoyo" },
  roleCHW: { en: "Community Health Worker", cy: "Woyang'anira Thanzi la Mtundu" },
  rolePHIM: { en: "Public Health Information Manager", cy: "Woyang'anira Nkhokwe ya Thanzi" },
  roleSupervisor: { en: "Supervisor", cy: "Woyang'anira" },
} as const;

export type StringKey = keyof typeof strings;

export function t(key: StringKey, lang: "en" | "cy" = "en"): string {
  return strings[key]?.[lang] ?? key;
}

export function bilingual(key: StringKey): { primary: string; secondary: string } {
  return { primary: strings[key].cy, secondary: strings[key].en };
}
