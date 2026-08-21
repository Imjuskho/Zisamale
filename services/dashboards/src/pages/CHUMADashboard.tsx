import { KPICard } from "../components/design/KPICard";
import { SyncIndicator } from "../components/design/SyncIndicator";

export function CHUMADashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline font-bold text-zisamale-dark">CHUMA Dashboard</h1>
          <p className="text-body text-neutral mt-1">
            Community Health Unit Management & Analytics
          </p>
        </div>
        <SyncIndicator status="synced" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="ACTIVE CHWS" value="450" icon="👥" />
        <KPICard label="VISITS THIS WEEK" value="1,847" icon="📋" trend={{ direction: "up", value: "12%", isPositive: true }} />
        <KPICard label="HIGH RISK CASES" value="23" icon="🔴" />
        <KPICard label="REFERRALS OPEN" value="8" icon="🏥" />
      </div>

      <div className="card-elevated rounded-xl p-6">
        <h2 className="text-title font-semibold text-zisamale-dark mb-4">
          System Health
        </h2>
        <div className="space-y-3">
          {["AI Risk Scoring", "Surveillance Pipeline", "Alert Delivery", "Data Sync"].map((s) => (
            <div key={s} className="flex items-center justify-between py-2 border-b border-surface-divider last:border-0">
              <span className="text-body">{s}</span>
              <span className="text-caption font-medium text-risk-low">Operational</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
