import { Icon, type IconName } from "./Icon";

interface SyncIndicatorProps {
  status: "synced" | "syncing" | "offline" | "error";
  count?: number;
  total?: number;
}

export function SyncIndicator({ status, count, total }: SyncIndicatorProps) {
  const config: Record<string, { icon: IconName; label: string; color: string; weight: "regular" | "fill" }> = {
    synced: { icon: "CloudCheck", label: "Synced", color: "#2d7d46", weight: "fill" },
    syncing: { icon: "Cloud", label: `${count ?? 0}/${total ?? 0}`, color: "#0f7b8a", weight: "regular" },
    offline: { icon: "Cloud", label: "Offline", color: "#999", weight: "regular" },
    error: { icon: "CloudWarning", label: "Error", color: "#c62828", weight: "fill" },
  };

  const c = config[status] ?? config.offline;

  return (
    <div className="flex items-center gap-1 text-caption font-medium" style={{ color: c.color }}>
      <Icon name={c.icon} size={16} weight={c.weight} />
      <span>{c.label}</span>
    </div>
  );
}
