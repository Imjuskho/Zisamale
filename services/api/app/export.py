"""CSV export utilities."""

from __future__ import annotations

import csv
import io


def alerts_to_csv(alerts: list[dict]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "alert_id",
            "disease",
            "ta_name",
            "risk_score",
            "alert_level",
            "predicted_cases",
            "ci_lower",
            "ci_upper",
            "status",
            "generated_at",
        ]
    )
    for a in alerts:
        writer.writerow(
            [
                a.get("alert_id", ""),
                a.get("disease", ""),
                a.get("ta_name", ""),
                a.get("risk_score", 0),
                a.get("alert_level", ""),
                a.get("predicted_cases", 0),
                a.get("confidence_interval_lower", 0),
                a.get("confidence_interval_upper", 0),
                a.get("status", "pending"),
                a.get("generated_at", ""),
            ]
        )
    return output.getvalue()


def surveillance_to_csv(data: list[dict]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "week",
            "confirmed_cases",
            "suspected_cases",
            "rainfall_mm",
            "temperature_c",
            "humidity_pct",
        ]
    )
    for row in data:
        writer.writerow(
            [
                row.get("week", ""),
                row.get("cases", 0),
                row.get("suspected", 0),
                row.get("rainfall", 0),
                row.get("temperature", 0),
                row.get("humidity", 0),
            ]
        )
    return output.getvalue()
