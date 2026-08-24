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
        className="empty-state-icon"
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: iconColor ? `${iconColor}14` : "#f0f0f0",
          marginBottom: 24,
        }}
      >
        <Icon name={icon} size={36} color={iconColor ?? "#999"} />
      </div>
      <h3 className="text-title font-semibold text-zisamale-dark mb-2">{title}</h3>
      {subtitle && <p className="text-body text-neutral max-w-xs">{subtitle}</p>}
      {action && (
        <button
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
