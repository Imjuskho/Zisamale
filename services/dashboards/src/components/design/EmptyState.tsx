import { Icon, type IconName } from "./Icon";

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: string;
  action?: { label: string; onClick: () => void; variant?: "primary" | "secondary" | "ghost" };
}

export function EmptyState({ title, subtitle, icon = "Info", iconColor, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div
        className="empty-state-icon size-[72px] rounded-full flex items-center justify-center mb-6"
        style={{
          backgroundColor: iconColor ? `${iconColor}14` : "var(--color-bg-muted)",
        }}
      >
        <Icon name={icon} size={36} color={iconColor ?? "var(--color-text-muted)"} />
      </div>
      <h3 className="text-title font-semibold text-apple-ink mb-2 text-balance">{title}</h3>
      {subtitle && <p className="text-body text-neutral max-w-xs text-pretty">{subtitle}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={`mt-6 ${
            action.variant === "secondary"
              ? "btn-secondary"
              : action.variant === "ghost"
                ? "btn-ghost"
                : "btn-primary"
          }`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
