"""Synthetic data generation for Zisamale ML pipelines."""

from __future__ import annotations

from datetime import date, timedelta

import numpy as np
import pandas as pd


def generate_mama_data(n: int = 500, seed: int = 42) -> pd.DataFrame:
    """Generate synthetic maternal health data for MAMA-AI risk scoring.

    Adds facility-level variation and seasonal birth-risk modulation.
    """
    rng = np.random.default_rng(seed)

    n_facilities = max(1, n // 50)
    facility_idx = rng.integers(0, n_facilities, size=n)
    facility_quality = rng.normal(0, 0.3, size=n_facilities)[facility_idx]

    month = rng.integers(1, 13, size=n)
    seasonal_birth_risk = 0.3 * np.sin(2 * np.pi * (month - 1) / 12)

    age = rng.integers(15, 45, size=n)
    parity = rng.integers(0, 8, size=n)
    gravida = np.maximum(parity, rng.integers(1, 10, size=n))
    prior_stillbirths = rng.choice([0, 0, 0, 0, 0, 1, 1, 2], size=n)
    prior_csections = rng.choice([0, 0, 0, 0, 1, 1, 2], size=n)
    prior_pph = rng.choice([0, 0, 0, 0, 0, 1], size=n)
    bp_systolic = rng.normal(120, 15, size=n).astype(int).clip(90, 180)
    bp_diastolic = rng.normal(80, 10, size=n).astype(int).clip(60, 120)
    hemoglobin = rng.normal(11.5, 2.0, size=n).clip(5.0, 16.0)
    food_security = rng.integers(1, 6, size=n)
    distance_km = rng.exponential(5.0, size=n).clip(0.5, 30.0)

    risk_factors = np.zeros(n)
    risk_factors += (age < 18) * 1.5
    risk_factors += (age > 35) * 1.0
    risk_factors += (parity == 0) * 1.2
    risk_factors += (prior_stillbirths > 0) * 2.0
    risk_factors += (prior_csections > 0) * 1.0
    risk_factors += (bp_systolic > 140) * 2.5
    risk_factors += (bp_diastolic > 90) * 2.0
    risk_factors += (hemoglobin < 8.0) * 2.0
    risk_factors += (food_security <= 2) * 1.0
    risk_factors += (distance_km > 10) * 1.5
    risk_factors += seasonal_birth_risk
    risk_factors += facility_quality

    risk_score = np.clip(risk_factors + rng.normal(0, 0.5, n), 0, 10)
    risk_category = pd.cut(
        risk_score,
        bins=[-0.1, 3.0, 6.0, 8.0, 10.0],
        labels=["low", "medium", "high", "critical"],
    )

    return pd.DataFrame(
        {
            "age": age,
            "parity": parity,
            "gravida": gravida,
            "prior_stillbirths": prior_stillbirths,
            "prior_csections": prior_csections,
            "prior_pph": prior_pph,
            "bp_systolic": bp_systolic,
            "bp_diastolic": bp_diastolic,
            "hemoglobin": hemoglobin,
            "food_security_score": food_security,
            "distance_to_facility_km": distance_km,
            "risk_score": risk_score,
            "risk_category": risk_category,
        }
    )


def generate_surveillance_data(
    n_weeks: int = 156, n_tas: int = 5, seed: int = 42
) -> pd.DataFrame:
    """Generate synthetic surveillance + climate data for ULALO-AI.

    Includes realistic rainy-season malaria surge (Oct-Mar), outbreak waves,
    and facility-level variation in baseline incidence.
    """
    rng = np.random.default_rng(seed)

    records = []
    base_date = date(2023, 1, 2)

    ta_base_cases = rng.integers(10, 50, size=n_tas)
    ta_susceptibility = rng.normal(1.0, 0.15, size=n_tas)

    outbreak_center_week = rng.integers(20, max(21, n_weeks - 20))
    outbreak_width = rng.integers(8, 16)

    for ta_idx in range(n_tas):
        for w in range(n_weeks):
            week_date = base_date + timedelta(weeks=w)
            year = week_date.year
            week_num = week_date.isocalendar()[1]
            month = week_date.month

            rainy = 1 if month in (10, 11, 12, 1, 2, 3) else 0
            rainy_boost = rainy * rng.uniform(5, 15)

            seasonal = 15 * np.sin(2 * np.pi * (week_num - 1) / 52) + 10
            rainfall = max(
                0,
                rng.normal(
                    20 + 30 * rainy + 15 * np.sin(2 * np.pi * week_num / 52), 10
                ),
            )
            temperature = (
                25 + 5 * np.sin(2 * np.pi * (week_num - 10) / 52) + rng.normal(0, 2)
            )
            humidity = (
                60 + 20 * np.sin(2 * np.pi * (week_num - 5) / 52) + rng.normal(0, 5)
            )

            outbreak_wave = 20 * np.exp(
                -0.5 * ((w - outbreak_center_week) / outbreak_width) ** 2
            )

            base = ta_base_cases[ta_idx] * ta_susceptibility[ta_idx]
            cases = max(
                0,
                int(
                    base
                    + seasonal
                    + rainy_boost
                    + rainfall * 0.3
                    + outbreak_wave
                    + rng.normal(0, 5)
                ),
            )

            records.append(
                {
                    "ta_idx": ta_idx,
                    "year": year,
                    "week_number": week_num,
                    "epidemiological_week": f"{year}-W{week_num:02d}",
                    "disease": "malaria",
                    "confirmed_cases": cases,
                    "suspected_cases": int(cases * rng.uniform(1.2, 2.0)),
                    "rainfall_mm": round(rainfall, 1),
                    "temperature_c": round(temperature, 1),
                    "humidity_pct": round(min(100, max(0, humidity)), 1),
                    "flood_event": bool(rng.random() < (0.06 if rainy else 0.01)),
                }
            )

    return pd.DataFrame(records)


def generate_supply_data(
    n_facilities: int = 10, n_months: int = 24, seed: int = 42
) -> pd.DataFrame:
    """Generate synthetic supply chain data for CHUMA-AI.

    Includes facility-level variation in base consumption and lead times,
    plus rainy-season demand spikes (Oct-Mar) affecting malaria commodities.
    """
    rng = np.random.default_rng(seed)

    records = []
    for fac_idx in range(n_facilities):
        base_consumption = rng.integers(50, 300)
        facility_reliability = rng.uniform(0.7, 1.0)
        stock = rng.integers(50, 200)

        for m in range(n_months):
            month = (m % 12) + 1
            rainy = 1 if month in (10, 11, 12, 1, 2, 3) else 0

            consumption = max(10, int(base_consumption + rng.normal(0, 30)))
            seasonal_demand = consumption * (
                1 + 0.3 * np.sin(2 * np.pi * m / 12) + rainy * 0.2
            )
            stock = max(0, stock - int(seasonal_demand))

            stockout_occurred = stock == 0

            if stock < consumption * 0.3:
                stock += rng.integers(consumption, consumption * 2)

            lead_time_days = max(7, int(rng.normal(21 * (2 - facility_reliability), 8)))
            months_of_supply = round(stock / max(1, seasonal_demand), 1)

            records.append(
                {
                    "facility_idx": fac_idx,
                    "month": m,
                    "stock_on_hand": stock,
                    "monthly_consumption": int(seasonal_demand),
                    "months_of_supply": months_of_supply,
                    "lead_time_days": lead_time_days,
                    "stockout_occurred": stockout_occurred,
                }
            )

    return pd.DataFrame(records)
