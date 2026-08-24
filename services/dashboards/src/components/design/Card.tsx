import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  variant?: "default" | "elevated" | "critical";
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
}

const PADDING_MAP = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
} as const;

const VARIANT_MAP = {
  default: "card",
  elevated: "card-elevated",
  critical: "card-critical",
} as const;

export function Card({
  children,
  variant = "default",
  padding = "md",
  className = "",
}: CardProps) {
  return (
    <div className={`${VARIANT_MAP[variant]} ${PADDING_MAP[padding]} ${className}`}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-title font-semibold text-zisamale-dark">{title}</h3>
        {subtitle && <p className="text-caption text-neutral mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
