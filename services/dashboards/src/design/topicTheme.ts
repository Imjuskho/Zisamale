/**
 * Centralized topic and asset-type visual theme registry.
 *
 * Apple redesign: topics use a single blue accent (#0066cc),
 * differentiated by icon. Severity retains semantic colors
 * (health-domain necessity). Asset types and statuses use
 * Apple's gray scale.
 *
 * THIS IS THE SINGLE SOURCE OF TRUTH.
 * Never hardcode topic colors or icons elsewhere — import from here.
 */

// ── Topic Theme ──────────────────────────────────────────────

export interface TopicTheme {
  icon: string;
  hex: string;
  bgTailwind: string;
  textTailwind: string;
  borderTailwind: string;
  label: string;
  labelNy: string;
}

export const TOPIC_THEMES: Record<string, TopicTheme> = {
  malaria: {
    icon: "Virus",
    hex: "#0066cc",
    bgTailwind: "bg-apple-blue/10",
    textTailwind: "text-apple-blue",
    borderTailwind: "border-apple-blue/20",
    label: "Malaria",
    labelNy: "Malavia",
  },
  hiv: {
    icon: "ShieldCheck",
    hex: "#0066cc",
    bgTailwind: "bg-apple-blue/10",
    textTailwind: "text-apple-blue",
    borderTailwind: "border-apple-blue/20",
    label: "HIV",
    labelNy: "HIV",
  },
  tb: {
    icon: "FirstAid",
    hex: "#0066cc",
    bgTailwind: "bg-apple-blue/10",
    textTailwind: "text-apple-blue",
    borderTailwind: "border-apple-blue/20",
    label: "TB",
    labelNy: "TB",
  },
  maternal_health: {
    icon: "Heart",
    hex: "#0066cc",
    bgTailwind: "bg-apple-blue/10",
    textTailwind: "text-apple-blue",
    borderTailwind: "border-apple-blue/20",
    label: "Maternal Health",
    labelNy: "Thanzi la Amayi",
  },
  child_health: {
    icon: "Baby",
    hex: "#0066cc",
    bgTailwind: "bg-apple-blue/10",
    textTailwind: "text-apple-blue",
    borderTailwind: "border-apple-blue/20",
    label: "Child Health",
    labelNy: "Thanzi la Ana",
  },
  nutrition: {
    icon: "ForkKnife",
    hex: "#0066cc",
    bgTailwind: "bg-apple-blue/10",
    textTailwind: "text-apple-blue",
    borderTailwind: "border-apple-blue/20",
    label: "Nutrition",
    labelNy: "Chakudya",
  },
  diarrhea: {
    icon: "Drop",
    hex: "#0066cc",
    bgTailwind: "bg-apple-blue/10",
    textTailwind: "text-apple-blue",
    borderTailwind: "border-apple-blue/20",
    label: "Diarrhea",
    labelNy: "Khosi",
  },
  pneumonia: {
    icon: "Wind",
    hex: "#0066cc",
    bgTailwind: "bg-apple-blue/10",
    textTailwind: "text-apple-blue",
    borderTailwind: "border-apple-blue/20",
    label: "Pneumonia",
    labelNy: "Pnumonia",
  },
  mental_health: {
    icon: "Brain",
    hex: "#0066cc",
    bgTailwind: "bg-apple-blue/10",
    textTailwind: "text-apple-blue",
    borderTailwind: "border-apple-blue/20",
    label: "Mental Health",
    labelNy: "Thanzi wa Mutu",
  },
  ncd: {
    icon: "Heartbeat",
    hex: "#0066cc",
    bgTailwind: "bg-apple-blue/10",
    textTailwind: "text-apple-blue",
    borderTailwind: "border-apple-blue/20",
    label: "NCDs",
    labelNy: "Matenda Opititsa",
  },
  family_planning: {
    icon: "Users",
    hex: "#0066cc",
    bgTailwind: "bg-apple-blue/10",
    textTailwind: "text-apple-blue",
    borderTailwind: "border-apple-blue/20",
    label: "Family Planning",
    labelNy: "Plan ya Banthu",
  },
  acute_poisoning: {
    icon: "Skull",
    hex: "#0066cc",
    bgTailwind: "bg-apple-blue/10",
    textTailwind: "text-apple-blue",
    borderTailwind: "border-apple-blue/20",
    label: "Acute Poisoning",
    labelNy: "Poison Wachule",
  },
  digital_health: {
    icon: "DeviceMobile",
    hex: "#0066cc",
    bgTailwind: "bg-apple-blue/10",
    textTailwind: "text-apple-blue",
    borderTailwind: "border-apple-blue/20",
    label: "Digital Health",
    labelNy: "Thanzi wa Digitalo",
  },
};

const FALLBACK_TOPIC: TopicTheme = {
  icon: "Info",
  hex: "#8e8e93",
  bgTailwind: "bg-apple-gray300/30",
  textTailwind: "text-apple-gray500",
  borderTailwind: "border-apple-gray300",
  label: "Other",
  labelNy: "Zina",
};

export function getTopicTheme(topic: string): TopicTheme {
  return TOPIC_THEMES[topic] ?? FALLBACK_TOPIC;
}

/** All topic keys in display order */
export const ALL_TOPIC_KEYS = Object.keys(TOPIC_THEMES);

// ── Asset Type Theme ─────────────────────────────────────────

export interface AssetTypeTheme {
  icon: string;
  hex: string;
  bgTailwind: string;
  textTailwind: string;
  label: string;
  labelNy: string;
}

export const ASSET_TYPE_THEMES: Record<string, AssetTypeTheme> = {
  chw_brief: {
    icon: "FileText",
    hex: "#0066cc",
    bgTailwind: "bg-apple-blue/10",
    textTailwind: "text-apple-blue",
    label: "CHW Brief",
    labelNy: "Chidule cha CHW",
  },
  infographic: {
    icon: "ChartBar",
    hex: "#48484a",
    bgTailwind: "bg-apple-gray700/10",
    textTailwind: "text-apple-gray700",
    label: "Infographic",
    labelNy: "Chithunzi",
  },
  poster: {
    icon: "Megaphone",
    hex: "#636366",
    bgTailwind: "bg-apple-gray600/10",
    textTailwind: "text-apple-gray600",
    label: "Poster",
    labelNy: "Poster",
  },
  flipbook: {
    icon: "BookOpen",
    hex: "#8e8e93",
    bgTailwind: "bg-apple-gray500/10",
    textTailwind: "text-apple-gray500",
    label: "Flipbook",
    labelNy: "Buku",
  },
  video: {
    icon: "Microphone",
    hex: "#aeaeb2",
    bgTailwind: "bg-apple-gray400/10",
    textTailwind: "text-apple-gray400",
    label: "Video",
    labelNy: "Video",
  },
  audio: {
    icon: "Microphone",
    hex: "#d2d2d7",
    bgTailwind: "bg-apple-gray300/20",
    textTailwind: "text-apple-gray500",
    label: "Audio",
    labelNy: "Audio",
  },
  sms: {
    icon: "DeviceMobile",
    hex: "#0066cc",
    bgTailwind: "bg-apple-blue/10",
    textTailwind: "text-apple-blue",
    label: "SMS",
    labelNy: "SMS",
  },
  community_talk: {
    icon: "Users",
    hex: "#48484a",
    bgTailwind: "bg-apple-gray700/10",
    textTailwind: "text-apple-gray700",
    label: "Community Talk",
    labelNy: "Kukambirana",
  },
};

const FALLBACK_ASSET_TYPE: AssetTypeTheme = {
  icon: "FileText",
  hex: "#8e8e93",
  bgTailwind: "bg-apple-gray500/10",
  textTailwind: "text-apple-gray500",
  label: "Other",
  labelNy: "Zina",
};

export function getAssetTypeTheme(type: string): AssetTypeTheme {
  return ASSET_TYPE_THEMES[type] ?? FALLBACK_ASSET_TYPE;
}

// ── Severity Theme (self-care guide levels) ──────────────────

export interface SeverityTheme {
  hex: string;
  bgTailwind: string;
  textTailwind: string;
  borderTailwind: string;
  label: string;
}

export const SEVERITY_THEMES: Record<string, SeverityTheme> = {
  emergency: {
    hex: "#ff3b30",
    bgTailwind: "bg-risk-critical/10",
    textTailwind: "text-risk-critical",
    borderTailwind: "border-risk-critical",
    label: "Emergency",
  },
  warning: {
    hex: "#ff9500",
    bgTailwind: "bg-risk-high/10",
    textTailwind: "text-risk-high",
    borderTailwind: "border-risk-high",
    label: "Warning",
  },
  info: {
    hex: "#0066cc",
    bgTailwind: "bg-apple-blue/10",
    textTailwind: "text-apple-blue",
    borderTailwind: "border-apple-blue",
    label: "Info",
  },
};

export function getSeverityTheme(severity: string): SeverityTheme {
  return SEVERITY_THEMES[severity] ?? SEVERITY_THEMES.info;
}

// ── Status Theme (Study/Asset pipeline) ──────────────────────

export interface StatusTheme {
  hex: string;
  bgTailwind: string;
  textTailwind: string;
  label: string;
}

export const STATUS_THEMES: Record<string, StatusTheme> = {
  discovered: {
    hex: "#8e8e93",
    bgTailwind: "bg-apple-gray500/10",
    textTailwind: "text-apple-gray500",
    label: "Discovered",
  },
  under_review: {
    hex: "#0066cc",
    bgTailwind: "bg-apple-blue/10",
    textTailwind: "text-apple-blue",
    label: "Under Review",
  },
  approved: {
    hex: "#0066cc",
    bgTailwind: "bg-apple-blue/10",
    textTailwind: "text-apple-blue",
    label: "Approved",
  },
  synthesized: {
    hex: "#48484a",
    bgTailwind: "bg-apple-gray700/10",
    textTailwind: "text-apple-gray700",
    label: "Synthesized",
  },
  deployed: {
    hex: "#34c759",
    bgTailwind: "bg-risk-low/10",
    textTailwind: "text-risk-low",
    label: "Deployed",
  },
  draft: {
    hex: "#aeaeb2",
    bgTailwind: "bg-apple-gray400/10",
    textTailwind: "text-apple-gray400",
    label: "Draft",
  },
  review: {
    hex: "#0066cc",
    bgTailwind: "bg-apple-blue/10",
    textTailwind: "text-apple-blue",
    label: "Review",
  },
};

export function getStatusTheme(status: string): StatusTheme {
  return STATUS_THEMES[status] ?? STATUS_THEMES.draft;
}
