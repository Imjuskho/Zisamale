# Zisamale Component Usage Guide
## How to use the new design system classes in your React components

---

## 1. KPICard

```tsx
// Before (ad-hoc)
<div className="bg-white p-4 rounded-xl shadow-sm">
  <div className="text-3xl font-bold">33</div>
  <div className="text-sm text-gray-500">Districts Monitored</div>
</div>

// After (design system)
<div className="kpi-card">
  <div className="kpi-label">Districts Monitored</div>
  <div className="kpi-value">33</div>
  <div className="kpi-context">All clear this week</div>
</div>

// With trend
<div className="kpi-card">
  <div className="kpi-label">Maternal Mortality Ratio</div>
  <div className="kpi-value">412</div>
  <div className="kpi-trend kpi-trend-down">
    <TrendDownIcon className="w-4 h-4" />
    <span>↓ 6% vs Q2</span>
  </div>
</div>

// Zero (good news)
<div className="kpi-card">
  <div className="kpi-label">Active Alerts</div>
  <div className="kpi-value kpi-value-zero">0</div>
  <div className="kpi-context">All clear this week</div>
</div>

// Missing data
<div className="kpi-card">
  <div className="kpi-label">Avg Coverage</div>
  <div className="kpi-value kpi-value-missing">—</div>
  <div className="kpi-context">Awaiting data</div>
</div>
```

---

## 2. AlertCard

```tsx
// Standard alert
<article className="alert-card alert-card-critical">
  <div className="alert-header">
    <div>
      <div className="alert-title">
        <AlertTriangleIcon className="w-5 h-5 text-danger" />
        Malaria Outbreak Predicted
      </div>
      <div className="alert-meta">Nsanje District, TA Ndamera</div>
    </div>
    <span className="badge badge-danger">RED</span>
  </div>
  <div className="alert-body">
    <div className="alert-metrics">
      <div className="alert-metric">
        <span className="alert-metric-label">Predicted Cases</span>
        <span className="alert-metric-value">450</span>
      </div>
      <div className="alert-metric">
        <span className="alert-metric-label">Confidence</span>
        <span className="alert-metric-value">85%</span>
      </div>
    </div>
  </div>
  <div className="alert-actions">
    <button className="btn btn-md btn-primary">Acknowledge</button>
    <button className="btn btn-md btn-secondary">Deploy DRRT</button>
  </div>
</article>

// Hero alert (AI Recommendation)
<div className="alert-hero">
  <div className="alert-hero-title">
    <LightbulbIcon className="w-5 h-5 text-brand-secondary" />
    AI Recommendation
  </div>
  <p className="alert-hero-body">
    Reallocate emergency stock to Nsanje: ACT 20/120 carries a 72% stockout risk.
    Model the intervention before committing budget.
  </p>
  <div className="alert-hero-actions">
    <button className="btn btn-md btn-primary">Model in CHUMA</button>
    <button className="btn btn-md btn-secondary">Share with Finance</button>
  </div>
</div>
```

---

## 3. RiskBadge

```tsx
// Score circle
<span className="risk-badge risk-badge-md risk-badge-critical">9</span>
<span className="risk-badge risk-badge-md risk-badge-high">7</span>
<span className="risk-badge risk-badge-md risk-badge-medium">5</span>
<span className="risk-badge risk-badge-md risk-badge-low">2</span>

// Text label with dot
<span className="risk-label risk-label-critical">
  <span className="risk-dot bg-danger"></span>
  Critical
</span>
```

---

## 4. Sidebar

```tsx
<aside className="sidebar">
  <div className="sidebar-header">
    <ZisamaleLogo className="h-8" />
  </div>
  <nav className="sidebar-nav">
    <NavLink to="/mohp" className={({isActive}) => 
      `sidebar-nav-item ${isActive ? 'active' : ''}`
    }>
      <BarChartIcon className="w-5 h-5" />
      <span>MoHP Dashboard</span>
    </NavLink>
    <NavLink to="/dho" className={({isActive}) => 
      `sidebar-nav-item ${isActive ? 'active' : ''}`
    }>
      <MapIcon className="w-5 h-5" />
      <span>DHO Dashboard</span>
    </NavLink>
  </nav>
  <div className="sidebar-footer">
    <ThemeToggle />
    <LanguageToggle />
  </div>
</aside>
```

---

## 5. Data Table

```tsx
<div className="data-table-wrapper">
  <table className="data-table">
    <caption className="sr-only">District health scorecard</caption>
    <thead>
      <tr>
        <th scope="col">District</th>
        <th scope="col">Risk Level</th>
        <th scope="col" className="sortable">MMR</th>
        <th scope="col" className="sortable">U5MR</th>
        <th scope="col">Coverage</th>
      </tr>
    </thead>
    <tbody>
      <tr className="clickable" tabIndex={0} role="button"
          onClick={handleRowClick}
          onKeyDown={(e) => e.key === 'Enter' && handleRowClick()}>
        <td>Nsanje</td>
        <td>
          <span className="risk-label risk-label-critical">
            <span className="risk-dot bg-danger"></span>
            High
          </span>
        </td>
        <td className="numeric">445</td>
        <td className="numeric">89</td>
        <td>
          <span className="badge badge-danger">42%</span>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## 6. District Card

```tsx
<div className="district-grid">
  {districts.map(d => (
    <div key={d.id} className="district-card">
      <div className="district-card-name">{d.name}</div>
      <div className="district-card-region">{d.region}</div>
      <div className="district-card-metrics">
        <div className="district-card-metric">
          <span className="district-card-metric-label">MMR</span>
          <span className="district-card-metric-value">
            {d.mmr ?? '—'}
          </span>
        </div>
        <div className="district-card-metric">
          <span className="district-card-metric-label">U5MR</span>
          <span className="district-card-metric-value">
            {d.u5mr ?? '—'}
          </span>
        </div>
        <div className="district-card-metric">
          <span className="district-card-metric-label">Coverage</span>
          <span className="district-card-metric-value">
            {d.coverage ? `${d.coverage}%` : '—'}
          </span>
        </div>
      </div>
      <div className="district-card-footer">
        <span className="district-card-facilities">
          {d.facilities} facilities
        </span>
        <span className="badge badge-success">All clear</span>
      </div>
    </div>
  ))}
</div>
```

---

## 7. Scenario Card (CHUMA)

```tsx
<div className="scenario-card">
  <div className="scenario-card-header">Scenario A</div>

  <div className="mb-5">
    <label className="text-caption text-text-secondary block mb-1.5">District</label>
    <select className="select">
      <option>Nsanje</option>
    </select>
  </div>

  <div className="mb-5">
    <label className="text-caption text-text-secondary block mb-1.5">Commodity</label>
    <select className="select">
      <option>ACT (AL)</option>
    </select>
  </div>

  <div className="mb-5">
    <label className="text-caption text-text-secondary block mb-1.5">
      Budget: MK 120.0M
    </label>
    <input type="range" className="range-slider" min="0" max="800" step="5" />
  </div>

  <div className="scenario-metric-grid">
    <div className="scenario-metric">
      <span className="scenario-metric-label">Projected stockout reduction</span>
      <span className="scenario-metric-value-highlight">22%</span>
    </div>
    <div className="scenario-metric">
      <span className="scenario-metric-label">Lives saved (annual)</span>
      <span className="scenario-metric-value">0</span>
    </div>
    <div className="scenario-metric">
      <span className="scenario-metric-label">Cost per DALY averted</span>
      <span className="scenario-metric-value">MK 680K</span>
    </div>
    <div className="scenario-metric">
      <span className="scenario-metric-label">Coverage</span>
      <span className="scenario-metric-value">33% → 48%</span>
    </div>
  </div>
</div>
```

---

## 8. Empty State

```tsx
<div className="empty-state">
  <InboxIcon className="empty-state-icon" />
  <h3 className="empty-state-title">No active alerts</h3>
  <p className="empty-state-subtitle">Zinthu zili bwino</p>
  <p className="empty-state-message">
    All districts are reporting normal surveillance levels.
  </p>
</div>
```

---

## 9. Skeleton Loading

```tsx
<div className="space-y-4">
  <div className="skeleton-title"></div>
  <div className="grid grid-cols-4 gap-4">
    <div className="skeleton-card"></div>
    <div className="skeleton-card"></div>
    <div className="skeleton-card"></div>
    <div className="skeleton-card"></div>
  </div>
  <div className="skeleton h-64"></div>
</div>
```

---

## 10. Map Toolbar

```tsx
<div className="map-container">
  <div className="map-toolbar">
    <button className="btn btn-sm btn-ghost">
      <LayersIcon className="w-4 h-4" />
      Layers
    </button>
    <button className="btn btn-sm btn-ghost">
      <SlidersIcon className="w-4 h-4" />
      Intervention Simulator
    </button>
    <button className="btn btn-sm btn-ghost">
      <CloudIcon className="w-4 h-4" />
      Health Weather
    </button>
    <div className="flex-1"></div>
    <button className="btn btn-sm btn-ghost">
      <RefreshIcon className="w-4 h-4" />
      Refresh
    </button>
  </div>
  <div className="h-[520px]">
    <LeafletMap ... />
  </div>
</div>
```

---

## 11. Offline Banner

```tsx
{isOffline && (
  <div className="offline-banner">
    <div className="offline-banner-text">
      <WifiOffIcon className="offline-banner-icon" />
      <span>You are offline. Your data is safe and will sync when connectivity returns.</span>
    </div>
    <button className="offline-banner-action">Sync when ready</button>
  </div>
)}
```

---

## 12. Page Layout Template

```tsx
// App.tsx layout shell
<div className="app-shell">
  <Sidebar />
  <div className="main-content">
    <header className="top-header">
      <div className="flex items-center gap-4">
        <button className="btn btn-icon btn-ghost md:hidden">
          <MenuIcon className="w-5 h-5" />
        </button>
        <div className="top-header-search">
          <SearchIcon className="w-4 h-4" />
          <input type="search" placeholder="Search districts, alerts, commodities..." />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-icon btn-ghost relative">
          <BellIcon className="w-5 h-5" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger text-white
                           text-[10px] font-bold rounded-full flex items-center justify-center">
              {alertCount}
            </span>
          )}
        </button>
        <UserMenu />
      </div>
    </header>
    <main id="main" className="page-container">
      <Outlet />
    </main>
  </div>
</div>
```
