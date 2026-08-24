import {
  MapPin,
  Warning,
  ChartBar,
  Package,
  Bell,
  Sun,
  Moon,
  Globe,
  SignOut,
  Hospital,
  TrendDown,
  TrendUp,
  Minus,
  Download,
  FileText,
  Calculator,
  ArrowsSplit,
  Users,
  Cloud,
  CloudCheck,
  CloudWarning,
  CheckCircle,
  XCircle,
  Info,
  House,
  Person,
  Baby,
  FirstAid,
  Microphone,
  Plus,
  ArrowRight,
  Funnel,
  Question,
  Eye,
  CloudArrowUp,
  Pencil,
  Coins,
  Megaphone,
  Drop,
  Syringe,
  ListChecks,
  ShieldCheck,
  Wallet,
  Desktop,
  Power,
  FolderOpen,
  FileCsv,
  Share,
  Trophy,
  MagnifyingGlass,
  Clock,
  CalendarBlank,
  ArrowUpRight,
  ArrowDownRight,
  Equals,
  Hash,
  Lightning,
  CellSignalFull,
  CellSignalNone,
  WifiHigh,
  WifiSlash,
  Circle,
  CheckFat,
  WarningCircle,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";

/* ──────────────────────────────────────────────────────────────────
   Icon name registry — maps string names to Phosphor components.
   Only icons actually used in the app are listed here.
   ────────────────────────────────────────────────────────────────── */

const ICON_MAP = {
  MapPin,
  Warning,
  ChartBar,
  Package,
  Bell,
  Sun,
  Moon,
  Globe,
  SignOut,
  Hospital,
  TrendDown,
  TrendUp,
  Minus,
  Download,
  FileText,
  Calculator,
  ArrowsSplit,
  Users,
  Cloud,
  CloudCheck,
  CloudWarning,
  CheckCircle,
  XCircle,
  Info,
  House,
  Person,
  Baby,
  FirstAid,
  Microphone,
  Plus,
  ArrowRight,
  Funnel,
  Question,
  Eye,
  CloudArrowUp,
  Pencil,
  Coins,
  Megaphone,
  Drop,
  Syringe,
  ListChecks,
  ShieldCheck,
  Wallet,
  Desktop,
  Power,
  FolderOpen,
  FileCsv,
  Share,
  Trophy,
  MagnifyingGlass,
  Clock,
  CalendarBlank,
  ArrowUpRight,
  ArrowDownRight,
  Equals,
  Hash,
  Lightning,
  CellSignalFull,
  CellSignalNone,
  WifiHigh,
  WifiSlash,
  Circle,
  CheckFat,
  WarningCircle,
} as const;

export type IconName = keyof typeof ICON_MAP;

interface IconProps {
  name: IconName;
  size?: number;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
  color?: string;
  className?: string;
}

export function Icon({
  name,
  size = 24,
  weight = "regular",
  color,
  className = "",
}: IconProps) {
  const Component = ICON_MAP[name];
  if (!Component) return null;
  return <Component size={size} weight={weight} color={color} className={className} />;
}

interface IconButtonProps {
  icon: IconName;
  label: string;
  onClick?: () => void;
  size?: number;
  variant?: "ghost" | "primary" | "danger";
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}

export function IconButton({
  icon,
  label,
  onClick,
  size = 24,
  variant = "ghost",
  disabled = false,
  className = "",
  children,
}: IconButtonProps) {
  const baseClass =
    variant === "primary"
      ? "btn-primary"
      : variant === "danger"
        ? "btn-danger"
        : "btn-ghost";

  return (
    <button
      type="button"
      className={`${baseClass} icon-btn ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{ minHeight: 48, minWidth: 48 }}
    >
      <Icon name={icon} size={size} />
      {children && <span>{children}</span>}
    </button>
  );
}
