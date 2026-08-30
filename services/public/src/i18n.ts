/** Samala (public Zisamale) bilingual strings. Chichewa is the default
 * reading language; English is a toggle. Components translate by key alone
 * through `useT()` — never inline ternaries. A parity test guards that every
 * key ships both languages. */

export type Language = "en" | "ny";

export const strings = {
  appName: { en: "Samala", ny: "Samala" },
  appTagline: {
    en: "Health knowledge your family can use",
    ny: "Chidziwitso cha thanzi chimene banja lanu lingagwiritsire ntchito",
  },
  communityNotice: {
    en: "A community health service from Zisamale",
    ny: "Ntchito ya thanzi kuchokera ku Zisamale",
  },

  // Navigation
  navHome: { en: "Home", ny: "Nyumba" },
  navGuides: { en: "Guides", ny: "Zindule" },
  navDistrict: { en: "Our district", ny: "Dziko lathu" },
  navHelp: { en: "Get help", ny: "Pezani thandizo" },

  // Risk levels — shared vocabulary with the dashboards
  riskCritical: { en: "Critical", ny: "YAMBIKANI" },
  riskHigh: { en: "High risk", ny: "CHANGU" },
  riskMedium: { en: "Medium risk", ny: "CHIDULE" },
  riskLow: { en: "Low risk", ny: "BWINO" },
  riskNone: { en: "No active alerts", ny: "Palibe xenjelo" },
  facilitiesUnits: { en: "facilities", ny: "zipatala" },
  riskSentence: {
    en: "{district} is at {level} risk this week",
    ny: "Boma la {district} lili pa ngozi ya {level} sabata lino",
  },
  noDistrictYet: {
    en: "Choose your district",
    ny: "Sankhani boma lanu",
  },
  chooseDistrictBody: {
    en: "So we can show you what matters where you live.",
    ny: "Kuti tikukuwetseni zofunika kumene mumakhala.",
  },
  changeDistrict: { en: "Change district", ny: "Sinthani boma" },
  districtLabel: { en: "District", ny: "Boma" },

  // Home
  homeWelcome: { en: "Look after your family", ny: "Samalani banja lanu" },
  homeSub: {
    en: "Clear, trusted health guidance — written in the language you speak at home.",
    ny: "Ulangizi wothandiza wa thanzi — wolembedwa m'chilankhulo chomwe mumalankhula panyumba.",
  },
  homeGuidesTitle: { en: "Guides for today", ny: "Zindule za lero" },
  homeGuidesSub: {
    en: "Read them, share them, use them tonight if you need to.",
    ny: "Werengani, gawani, mugwiritse ntchito usikuuno ngati pangafunike.",
  },
  featuredGuides: { en: "Most urgent first", ny: "Zofunika kwambiri zoyamba" },
  viewAllGuides: { en: "See all guides", ny: "Onani zindule zonse" },
  alertsWord: { en: "alerts", ny: "xenjelo" },

  // Our district
  districtPageBody: {
    en: "Health signals across the country, shown by district. {district} is highlighted when it is your chosen area.",
    ny: "Zizindikiro za thanzi m'dziko lonse, monga dera. {district} awonetsedwa ngati ndi dera lanu.",
  },
  districtPageNote: {
    en: "Risk levels come from active health alerts only — when nothing is active, a district shows no risk. Names and numbers stay at the district level; no family or household information is shown here.",
    ny: "Milandu ya ngozi imachokera ku xenjelo zogwira ntchito zokha — pamene palibe chinachake, dera silisonyeza ngozi. Mayina ndi manambala akhala pa mulingo wa dera; palibe zambiri za banja kapena nyumba zomwe zasonyezedwa pano.",
  },

  // Get help
  helpBody: {
    en: "A health worker in your village, or the nearest health centre. Call first if you can.",
    ny: "Mchito wa thanzi m'mudzi mwanu, kapena chipatala chapafupi. Fonani koyamba ngati kungatheke.",
  },
  emergencyNumbers: { en: "Emergency numbers", ny: "Manambala a ngozi" },
  helpNote: {
    en: "102 connects you to the national ambulance line. Tell them the village and what happened — they will guide you to the nearest ready health centre.",
    ny: "102 imakukudutsani ku foni ya ambulansi ya dziko. Auzeni mudzi ndi zomwe zachitika — akutsogolerani ku chipatala chapafupi chokonzeka.",
  },
  facilitiesTitle: { en: "Health centres", ny: "Zipatala" },
  searchFacilities: { en: "Search health centres", ny: "Fufuzani zipatala" },
  noFacilities: {
    en: "No health centres matched “{query}”. Check the name or change district.",
    ny: "Palibe zipatala zofanana ndi “{query}”. Yang'anani dzina kapena sinthani boma.",
  },
  maternity: { en: "Maternity", ny: "Udindo wa amayi" },
  lab: { en: "Lab", ny: "Lab" },
  pharmacy: { en: "Pharmacy", ny: "Mankhwala" },

  // Guides library
  guidesTitle: { en: "Health guides", ny: "Zindule za thanzi" },
  guidesSub: {
    en: "Short, kind, practical booklets for things families face.",
    ny: "Timabuku tafupifupi, tosavuta, tothandiza pa zinthu zimene mabanja amakumana nazo.",
  },
  topicLabel: { en: "Topic", ny: "Mutanda" },
  filterAll: { en: "All", ny: "Zonse" },
  severityInfo: { en: "Learn", ny: "Phunzirani" },
  severityWarning: { en: "Act", ny: "Chitani" },
  severityEmergency: { en: "Emergency", ny: "Ngozi yaikulu" },
  guidesCount: { en: "{n} guides", ny: "Ma zindule {n}" },
  noGuides: {
    en: "No guides here yet — checked content is being prepared.",
    ny: "Palibe zindule pano — zatsimikizidwa zikukonzedwa.",
  },
  readGuide: { en: "Open guide", ny: "Tsegulani" },

  // Guide detail
  sectionWhatIsIt: { en: "What it is", ny: "Kodi ndi chiyani" },
  sectionWhatToDoNow: { en: "What to do now", ny: "Chitani izi tsopano" },
  sectionWhatNotToDo: { en: "Do not do this", ny: "Musachite izi" },
  sectionWhenSeekHelp: { en: "When to seek help", ny: "Liti mukayenda ku chipatala" },
  sectionPrevention: { en: "How to prevent it", ny: "Momwe mungapewere" },
  callNow: { en: "Call for help", ny: "Fonani" },
  sendToPhone: { en: "Send to a phone", ny: "Tumizani pa foni" },
  printGuide: { en: "Print this guide", ny: "Sindikizani izi" },
  audienceFor: { en: "For: {audience}", ny: "Kwa: {audience}" },
  reviewedOn: { en: "Checked for accuracy", ny: "Zatsimikizidwa kuti ndi zolondola" },
  disclaimer: {
    en: "This information does not replace speaking with a health worker.",
    ny: "Ulangiziwu sukhala m'malo mwa kukambirana ndi mchito wa thanzi.",
  },
  shareText: {
    en: "From Samala: {title} — read it, share it, keep your family safe.",
    ny: "Kuchokera ku Samala: {title} — werengani, gawani, samalani banja lanu.",
  },

  // Emergency strip
  emergencyStrip: {
    en: "In an emergency, call a health worker or go to the nearest health centre now.",
    ny: "Ngati pali ngozi yaikulu, you kite m'dzidzi ndi ku chipatala patali pano.",
  },
  emergencyCall: { en: "Call health worker", ny: "Fonani mchito wa thanzi" },
  emergencyGo: { en: "Nearest health centre", ny: "Chipatala chapafupi" },

  // Shared
  retry: { en: "Try again", ny: "Yeseraninso" },
  loading: { en: "Loading…", ny: "Kuyikira…" },
  errorBody: {
    en: "We could not reach the health service just now.",
    ny: "Sitinathe kufikira ntchito ya thanzi tsopano.",
  },
  back: { en: "Back", ny: "Kumbuyo" },
  notFound: { en: "This page is not here", ny: "Tsambali lilibe" },
  notFoundBody: {
    en: "Check the address or go back home.",
    ny: "Onani adiresi kapena mukoni kumbuyo kwa nyumba.",
  },
};

export type StringKey = keyof typeof strings;

export function t(key: StringKey, language: Language): string {
  return strings[key][language];
}

/** Building blocks assemble a full Chichewa sentence per key — used in the
 * risk sentence, guide counts and share text. */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);
}