"""Data quality gates for Malawi health data."""

from __future__ import annotations

from datetime import UTC, datetime

import numpy as np
import pandas as pd


def check_completeness(
    df: pd.DataFrame,
    expected_weeks: int = 52,
    facility_col: str = "facility_id",
    week_col: str = "epi_week",
) -> dict:
    results = {}
    if facility_col not in df.columns or week_col not in df.columns:
        return {
            "error": f"Missing columns: {facility_col} or {week_col}",
            "overall_pass": False,
        }

    for facility in df[facility_col].unique():
        facility_data = df[df[facility_col] == facility]
        actual_weeks = facility_data[week_col].nunique()
        completeness = actual_weeks / expected_weeks
        results[facility] = {
            "actual_weeks": actual_weeks,
            "expected_weeks": expected_weeks,
            "completeness": round(completeness, 4),
            "passed": completeness >= 0.95,
        }

    overall_pass = all(r["passed"] for r in results.values())
    avg_completeness = np.mean([r["completeness"] for r in results.values()])
    return {
        "per_facility": results,
        "overall_completeness": round(float(avg_completeness), 4),
        "overall_pass": overall_pass,
    }


def check_consistency(
    df: pd.DataFrame,
    facility_col: str = "facility_id",
    year_col: str = "year",
    value_col: str = "cases",
    tolerance: float = 0.20,
) -> dict:
    results = {}
    if year_col not in df.columns or value_col not in df.columns:
        return {
            "error": f"Missing columns: {year_col} or {value_col}",
            "overall_pass": False,
        }

    for facility in (
        df[facility_col].unique() if facility_col in df.columns else ["all"]
    ):
        fdf = df if facility_col not in df.columns else df[df[facility_col] == facility]
        yearly = fdf.groupby(year_col)[value_col].sum()
        if len(yearly) < 2:
            results[facility] = {"passed": True, "reason": "insufficient_years"}
            continue

        years = sorted(yearly.index)
        yoy_changes = []
        for i in range(1, len(years)):
            prev = yearly.iloc[i - 1]
            curr = yearly.iloc[i]
            if prev > 0:
                pct_change = abs(curr - prev) / prev
                yoy_changes.append(pct_change)

        max_change = max(yoy_changes) if yoy_changes else 0
        results[facility] = {
            "yearly_totals": {str(k): int(v) for k, v in yearly.items()},
            "max_yoy_change": round(float(max_change), 4),
            "tolerance": tolerance,
            "passed": max_change <= tolerance,
        }

    overall_pass = all(r["passed"] for r in results.values())
    return {"per_facility": results, "overall_pass": overall_pass}


def check_timeliness(
    df: pd.DataFrame,
    reference_date_col: str = "last_updated",
    max_lag_days: int = 14,
) -> dict:
    if reference_date_col not in df.columns:
        return {"error": f"Missing column: {reference_date_col}", "overall_pass": False}

    now = datetime.now(UTC)
    dates = pd.to_datetime(df[reference_date_col], errors="coerce")
    max_date = dates.max()
    lag_days = (now - max_date).days if pd.notna(max_date) else float("inf")

    return {
        "latest_data_date": str(max_date) if pd.notna(max_date) else None,
        "lag_days": int(lag_days),
        "max_allowed_lag_days": max_lag_days,
        "passed": lag_days <= max_lag_days,
    }


def quality_gate_check(
    completeness: dict,
    consistency: dict,
    timeliness: dict,
) -> bool:
    return (
        completeness.get("overall_pass", False)
        and consistency.get("overall_pass", False)
        and timeliness.get("passed", False)
    )


def generate_quality_report(results: dict[str, dict]) -> str:
    lines = ["=== Zisamale Data Quality Report ===\n"]

    if "completeness" in results:
        c = results["completeness"]
        lines.append(f"Completeness: {c.get('overall_completeness', 0):.1%} overall")
        lines.append(f"  Gate: {'PASS' if c.get('overall_pass') else 'FAIL'}")

    if "consistency" in results:
        con = results["consistency"]
        lines.append(
            f"Consistency: Gate {'PASS' if con.get('overall_pass') else 'FAIL'}"
        )

    if "timeliness" in results:
        t = results["timeliness"]
        lines.append(
            f"Timeliness: {t.get('lag_days', '?')} days lag (max: {t.get('max_allowed_lag_days', 14)})"
        )
        lines.append(f"  Gate: {'PASS' if t.get('passed') else 'FAIL'}")

    overall = quality_gate_check(
        results.get("completeness", {}),
        results.get("consistency", {}),
        results.get("timeliness", {}),
    )
    lines.append(f"\nOverall: {'PASS' if overall else 'FAIL'}")
    return "\n".join(lines)
