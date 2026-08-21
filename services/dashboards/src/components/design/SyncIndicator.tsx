

interface SyncIndicatorProps {
  status: "synced" | "syncing" | "offline" | "error";
  count?: number;
  total?: number;
}

export function SyncIndicator({ status, count, total }: SyncIndicatorProps) {
  const config: Record<string, { icon: string; label: string; color: string }> = {
    synced: { icon: "☁️✓", label: "Synced", color: "text-risk-low" },
    syncing: { icon: "☁️⏳", label: `${count ?? 0}/${total ?? 0}`, color: "text-zisamale-teal" },
    offline: { icon: "☁️—", label: "Offline", color: "text-neutral" },
    error: { icon: "☁️✗", label: "Error", color: "text-risk-critical" },
  };

  const c = config[status] ?? config.offline;

  return (
    <div className={`flex items-center gap-1 text-caption font-medium ${c.color}`}>
      <span>{c.icon}</span>
      <span>{c.label}</span>
    </div>
  );
}
