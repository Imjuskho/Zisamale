interface EmptyStateProps {
  title: string;
  subtitle?: string;
  icon?: string;
  action?: { label: string; onClick: () => void; variant?: "primary" | "secondary" | "ghost" };
}

export function EmptyState({ title, subtitle, icon = "📋", action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="text-6xl mb-6">{icon}</div>
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
