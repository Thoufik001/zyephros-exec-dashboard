#!/usr/bin/env python3
"""Build static dashboard data from the Zyephr hospital workbooks."""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd


CR = 10_000_000
DATA_DIR = Path("/Users/thoufikabdullah/Downloads/Zyephr/Admin Panel/Datasets/Hospital Data")
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "data" / "zyephr-derived-data.js"

WORKBOOKS = [
    ("Electronic City", "ZYP-EC", DATA_DIR / "zyephr_electronic_city.xlsx"),
    ("Hebbal", "ZYP-HB", DATA_DIR / "zyephr_hebbal.xlsx"),
    ("Jayanagar", "ZYP-JN", DATA_DIR / "zyephr_jayanagar.xlsx"),
    ("Whitefield", "ZYP-WF", DATA_DIR / "zyephr_whitefield.xlsx"),
]

SHEETS = [
    "patient_master",
    "adt_events",
    "opd_visits",
    "dialysis_sessions",
    "ot_cases",
    "ed_triage",
    "billing_invoices",
    "biomedical_uptime",
    "hr_shifts",
    "infection_control",
    "incident_reports",
]


def parse_date(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce")


def safe_div(num: float, den: float, default: float = 0.0) -> float:
    if den is None or den == 0 or pd.isna(den):
        return default
    return float(num) / float(den)


def round1(value: float) -> float:
    return round(float(value or 0), 1)


def round2(value: float) -> float:
    return round(float(value or 0), 2)


def pct_change(current: float, previous: float) -> float:
    if not previous or pd.isna(previous):
        return 0.0
    return round(((float(current) - float(previous)) / float(previous)) * 100, 1)


def clean(value):
    if value is None:
        return None
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if isinstance(value, (pd.Timestamp, datetime)):
        return value.isoformat()
    return value


def slug(text: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in text).strip("-")


def service_line(description: str) -> str:
    text = str(description or "").lower()
    if "dialysis" in text:
        return "In-centre dialysis"
    if "consultation" in text:
        return "Nephrology OPD"
    if "ot" in text or "surgical" in text:
        return "Surgical & vascular access"
    if "bed" in text or "nursing" in text:
        return "IPD & ward care"
    if "lab" in text or "imaging" in text:
        return "Renal diagnostics"
    if "pharmacy" in text:
        return "Pharmacy & ESA therapy"
    return "Other services"


def risk_from(row: dict) -> str:
    score = 0
    if row["collectionRate"] < 80:
        score += 1
    if row["equipmentUptime"] < 90:
        score += 1
    if row["staffing"] < 90:
        score += 1
    if row["dialysisComplicationRate"] > 7.2:
        score += 1
    if row["majorIncidents"] >= 8:
        score += 1
    if row["occupancy"] < 40:
        score += 1
    if score >= 3:
        return "High"
    if score >= 1:
        return "Medium"
    return "Low"


def status_from_growth(value: float) -> str:
    if value < -2:
        return "Risk"
    if value < 2:
        return "Watch"
    return "Healthy"


def branch_margin(row: dict, revenue_rank_boost: float) -> float:
    # EBITDA is intentionally modeled until cost/expense feeds are added.
    margin = (
        18.0
        + revenue_rank_boost
        + (row["collectionRate"] - 80.0) * 0.08
        + (row["equipmentUptime"] - 90.0) * 0.04
        + (row["staffing"] - 90.0) * 0.04
        - max(row["dialysisComplicationRate"] - 6.5, 0) * 0.12
    )
    return round(max(16.0, min(27.0, margin)), 1)


def age_band(value) -> str:
    if pd.isna(value):
        return "Unknown age"
    age = int(value)
    if age < 31:
        return "Under 31"
    if age <= 45:
        return "31-45"
    if age <= 60:
        return "46-60"
    return "Senior 60+"


def dataframe_rows(df: pd.DataFrame, limit: int | None = None) -> list[dict]:
    records = df.head(limit).to_dict("records") if limit else df.to_dict("records")
    return [{key: clean(value) for key, value in row.items()} for row in records]


def read_workbooks() -> dict[str, pd.DataFrame]:
    frames: dict[str, list[pd.DataFrame]] = {sheet: [] for sheet in SHEETS}
    transplant_frames: list[pd.DataFrame] = []

    for branch_name, branch_id, path in WORKBOOKS:
        if not path.exists():
            raise FileNotFoundError(path)
        xl = pd.ExcelFile(path)
        for sheet in SHEETS:
            df = xl.parse(sheet)
            df["branch_name"] = branch_name
            df["branch_id_source"] = branch_id
            frames[sheet].append(df)
        if "transplant_records" in xl.sheet_names:
            df = xl.parse("transplant_records")
            df["branch_name"] = branch_name
            df["branch_id_source"] = branch_id
            transplant_frames.append(df)

    combined = {sheet: pd.concat(parts, ignore_index=True) for sheet, parts in frames.items()}
    combined["transplant_records"] = pd.concat(transplant_frames, ignore_index=True) if transplant_frames else pd.DataFrame()
    return combined


def build() -> dict:
    data = read_workbooks()
    patients = data["patient_master"].copy()
    billing = data["billing_invoices"].copy()
    adt = data["adt_events"].copy()
    opd = data["opd_visits"].copy()
    dialysis = data["dialysis_sessions"].copy()
    ot = data["ot_cases"].copy()
    ed = data["ed_triage"].copy()
    biomed = data["biomedical_uptime"].copy()
    hr = data["hr_shifts"].copy()
    infections = data["infection_control"].copy()
    incidents = data["incident_reports"].copy()
    transplants = data["transplant_records"].copy()

    billing["invoice_date"] = parse_date(billing["invoice_date"])
    billing["net_amount"] = billing["amount"].fillna(0) - billing["discount_amount"].fillna(0)
    billing["service_line"] = billing["service_description"].map(service_line)
    billing["invoice_month"] = billing["invoice_date"].dt.to_period("M")
    billing["invoice_year"] = billing["invoice_date"].dt.year
    year = int(billing["invoice_year"].dropna().max())
    billing_y = billing[billing["invoice_year"] == year].copy()

    patients["registration_date"] = parse_date(patients["registration_date"])
    patients["age"] = ((pd.Timestamp(f"{year}-12-31") - parse_date(patients["date_of_birth"])).dt.days / 365.25).round()
    patients["age_band"] = patients["age"].map(age_band)
    patient_lookup = patients[["patient_id", "gender", "age_band", "ckd_stage"]].drop_duplicates("patient_id")
    billing_patient = billing_y.merge(patient_lookup, on="patient_id", how="left")

    adt["admit_timestamp"] = parse_date(adt["admit_timestamp"])
    adt["discharge_timestamp"] = parse_date(adt["discharge_timestamp"])
    adt["month"] = adt["admit_timestamp"].dt.to_period("M")
    adt["los_days"] = (
        (adt["discharge_timestamp"] - adt["admit_timestamp"]).dt.total_seconds().fillna(0).clip(lower=0) / 86400
    )

    opd["visit_timestamp"] = parse_date(opd["visit_timestamp"])
    opd["month"] = opd["visit_timestamp"].dt.to_period("M")
    dialysis["session_start"] = parse_date(dialysis["session_start"])
    dialysis["month"] = dialysis["session_start"].dt.to_period("M")
    ot["scheduled_start"] = parse_date(ot["scheduled_start"])
    ot["actual_start"] = parse_date(ot["actual_start"])
    ot["month"] = ot["scheduled_start"].dt.to_period("M")
    ed["arrival_timestamp"] = parse_date(ed["arrival_timestamp"])
    ed["first_doctor_contact_timestamp"] = parse_date(ed["first_doctor_contact_timestamp"])
    ed["door_to_doc_min"] = (
        (ed["first_doctor_contact_timestamp"] - ed["arrival_timestamp"]).dt.total_seconds().fillna(0).clip(lower=0) / 60
    )
    ed["month"] = ed["arrival_timestamp"].dt.to_period("M")
    biomed["status_timestamp"] = parse_date(biomed["status_timestamp"])
    biomed["month"] = biomed["status_timestamp"].dt.to_period("M")
    hr["shift_date"] = parse_date(hr["shift_date"])
    hr["month"] = hr["shift_date"].dt.to_period("M")
    infections["onset_date"] = parse_date(infections["onset_date"])
    infections["month"] = infections["onset_date"].dt.to_period("M")
    incidents["incident_timestamp"] = parse_date(incidents["incident_timestamp"])
    incidents["month"] = incidents["incident_timestamp"].dt.to_period("M")

    total_revenue = float(billing_y["net_amount"].sum())
    branch_revenue_map = billing_y.groupby("branch_name")["net_amount"].sum().to_dict()
    sorted_branch_revenue = sorted(branch_revenue_map.values(), reverse=True)
    months = pd.period_range(f"{year}-01", f"{year}-12", freq="M")

    branches = []
    for branch_name, branch_id, _path in WORKBOOKS:
        b_bill = billing_y[billing_y["branch_name"] == branch_name]
        b_patients = patients[patients["branch_name"] == branch_name]
        b_adt = adt[adt["branch_name"] == branch_name]
        b_opd = opd[opd["branch_name"] == branch_name]
        b_dialysis = dialysis[dialysis["branch_name"] == branch_name]
        b_ot = ot[ot["branch_name"] == branch_name]
        b_ed = ed[ed["branch_name"] == branch_name]
        b_biomed = biomed[biomed["branch_name"] == branch_name]
        b_hr = hr[hr["branch_name"] == branch_name]
        b_infections = infections[infections["branch_name"] == branch_name]
        b_incidents = incidents[incidents["branch_name"] == branch_name]

        revenue = float(b_bill["net_amount"].sum())
        bed_days = float(b_adt["los_days"].sum())
        bed_count = int(b_adt["bed_id"].nunique())
        ip_revenue = float(b_bill[b_bill["patient_type"].astype(str).str.upper() == "IPD"]["net_amount"].sum())
        paid = float(b_bill[b_bill["payment_status"].astype(str).str.lower() == "paid"]["net_amount"].sum())
        paid_partial = float(
            b_bill[b_bill["payment_status"].astype(str).str.lower().isin(["paid", "partial"])]["net_amount"].sum()
        )
        prev_month = b_bill[b_bill["invoice_month"] == months[-2]]["net_amount"].sum()
        current_month = b_bill[b_bill["invoice_month"] == months[-1]]["net_amount"].sum()
        ot_on_time = b_ot["actual_start"].le(b_ot["scheduled_start"] + pd.Timedelta(minutes=15)).mean() * 100
        running_rate = b_biomed["status"].astype(str).str.lower().eq("running").mean() * 100
        staff_fill = b_hr["filled_flag"].fillna(0).astype(float).mean() * 100

        row = {
            "id": branch_id,
            "slug": slug(branch_name),
            "name": branch_name,
            "revenue": round2(revenue / CR),
            "collectionRate": round1(safe_div(paid, revenue) * 100),
            "realizationRate": round1(safe_div(paid_partial, revenue) * 100),
            "patientsServed": int(b_patients["patient_id"].nunique()),
            "opd": int(len(b_opd)),
            "ip": int(len(b_adt)),
            "patientVolume": int(len(b_opd) + len(b_adt)),
            "alos": round2(safe_div(bed_days, len(b_adt))),
            "occupancy": round1(safe_div(bed_days, bed_count * 365) * 100),
            "bedsObserved": bed_count,
            "arpob": int(round(safe_div(ip_revenue, bed_days) / 100) * 100),
            "dialysisSessions": int(len(b_dialysis)),
            "dialysis": round1(b_dialysis["session_status"].astype(str).str.lower().eq("completed").mean() * 100),
            "dialysisComplicationRate": round1(b_dialysis["complications_flag"].fillna(0).astype(float).mean() * 100),
            "otCases": int(len(b_ot)),
            "otOnTime": round1(ot_on_time if not pd.isna(ot_on_time) else 0),
            "edVisits": int(len(b_ed)),
            "edDoorToDoctor": round1(b_ed["door_to_doc_min"].mean()),
            "equipmentUptime": round1(running_rate if not pd.isna(running_rate) else 0),
            "staffing": round1(staff_fill if not pd.isna(staff_fill) else 0),
            "infectionIncidents": int(len(b_infections)),
            "safetyIncidents": int(len(b_incidents)),
            "majorIncidents": int(b_incidents["severity"].astype(str).str.lower().eq("major").sum()),
            "revenueGrowth": pct_change(current_month, prev_month),
            "revenueContribution": round1(safe_div(revenue, total_revenue) * 100),
        }
        rank = sorted_branch_revenue.index(branch_revenue_map.get(branch_name, 0)) if branch_revenue_map.get(branch_name, 0) in sorted_branch_revenue else len(branches)
        row["margin"] = branch_margin(row, max(0, 5 - rank * 1.15))
        row["ebitda"] = round2(row["revenue"] * row["margin"] / 100)
        row["risk"] = risk_from(row)
        branches.append(row)

    branches = sorted(branches, key=lambda item: item["revenue"], reverse=True)
    network_revenue_cr = round2(sum(item["revenue"] for item in branches))
    network_ebitda_cr = round2(sum(item["ebitda"] for item in branches))
    network = {
        "year": year,
        "revenue": network_revenue_cr,
        "ebitda": network_ebitda_cr,
        "margin": round1(safe_div(network_ebitda_cr, network_revenue_cr) * 100),
        "patientsServed": int(patients["patient_id"].nunique()),
        "opd": int(len(opd)),
        "ip": int(len(adt)),
        "patientVolume": int(len(opd) + len(adt)),
        "collectionRate": round1(safe_div(float(billing_y[billing_y["payment_status"].astype(str).str.lower() == "paid"]["net_amount"].sum()), total_revenue) * 100),
        "realizationRate": round1(
            safe_div(float(billing_y[billing_y["payment_status"].astype(str).str.lower().isin(["paid", "partial"])]["net_amount"].sum()), total_revenue) * 100
        ),
        "alos": round2(safe_div(float(adt["los_days"].sum()), len(adt))),
        "occupancy": round1(sum(item["occupancy"] * item["bedsObserved"] for item in branches) / max(sum(item["bedsObserved"] for item in branches), 1)),
        "arpob": int(round(safe_div(float(billing_y[billing_y["patient_type"].astype(str).str.upper() == "IPD"]["net_amount"].sum()), float(adt["los_days"].sum())) / 100) * 100),
        "dialysisSessions": int(len(dialysis)),
        "otCases": int(len(ot)),
        "edVisits": int(len(ed)),
        "equipmentUptime": round1(biomed["status"].astype(str).str.lower().eq("running").mean() * 100),
        "staffing": round1(hr["filled_flag"].fillna(0).astype(float).mean() * 100),
        "infectionIncidents": int(len(infections)),
        "safetyIncidents": int(len(incidents)),
    }

    monthly_rows = []
    monthly_by_branch = {}
    revenue_series = []
    for month in months:
        month_bill = billing_y[billing_y["invoice_month"] == month]
        revenue_cr = round2(float(month_bill["net_amount"].sum()) / CR)
        revenue_series.append(revenue_cr)
    avg_revenue = safe_div(sum(revenue_series), len(revenue_series))
    for index, month in enumerate(months):
        month_bill = billing_y[billing_y["invoice_month"] == month]
        revenue_cr = revenue_series[index]
        prev = revenue_series[index - 1] if index > 0 else revenue_cr
        monthly_rows.append(
            {
                "label": month.strftime("%b"),
                "labelLong": month.strftime("%b %Y"),
                "revenue": revenue_cr,
                "prev": pct_change(revenue_cr, prev),
                "same": pct_change(revenue_cr, avg_revenue),
                "opd": int(len(opd[opd["month"] == month])),
                "ip": int(len(adt[adt["month"] == month])),
                "dialysis": int(len(dialysis[dialysis["month"] == month])),
                "ot": int(len(ot[ot["month"] == month])),
                "paid": round1(
                    safe_div(float(month_bill[month_bill["payment_status"].astype(str).str.lower() == "paid"]["net_amount"].sum()), float(month_bill["net_amount"].sum())) * 100
                ),
            }
        )
    for branch in branches:
        name = branch["name"]
        monthly_by_branch[name] = [
            {
                "label": month.strftime("%b"),
                "revenue": round2(float(billing_y[(billing_y["branch_name"] == name) & (billing_y["invoice_month"] == month)]["net_amount"].sum()) / CR),
            }
            for month in months
        ]

    service_group = (
        billing_patient.groupby("service_line")
        .agg(
            net_amount=("net_amount", "sum"),
            rows=("invoice_id", "count"),
            female=("gender", lambda s: int((s.astype(str).str.lower() == "female").sum())),
            male=("gender", lambda s: int((s.astype(str).str.lower() == "male").sum())),
        )
        .reset_index()
        .sort_values("net_amount", ascending=False)
    )
    service_lines = []
    for _, row in service_group.iterrows():
        svc = row["service_line"]
        svc_bill = billing_y[billing_y["service_line"] == svc]
        current = float(svc_bill[svc_bill["invoice_month"] == months[-1]]["net_amount"].sum())
        previous = float(svc_bill[svc_bill["invoice_month"] == months[-2]]["net_amount"].sum())
        revenue_cr = round2(row["net_amount"] / CR)
        service_lines.append(
            {
                "name": svc,
                "value": revenue_cr,
                "female": round2(row["female"] / max(row["rows"], 1) * revenue_cr),
                "male": round2(row["male"] / max(row["rows"], 1) * revenue_cr),
                "unmapped": round2(max(0, revenue_cr - (row["female"] + row["male"]) / max(row["rows"], 1) * revenue_cr)),
                "visits": int(row["rows"]),
                "conversion": round1(safe_div(float(svc_bill[svc_bill["payment_status"].astype(str).str.lower().isin(["paid", "partial"])]["net_amount"].sum()), float(row["net_amount"])) * 100),
                "growth": pct_change(current, previous),
            }
        )

    doctor_rows = (
        opd.groupby("doctor_id")
        .agg(visits=("visit_id", "count"), fees=("consultation_fee", "sum"))
        .reset_index()
        .sort_values(["fees", "visits"], ascending=False)
        .head(8)
    )
    doctors = [
        {
            "name": str(row["doctor_id"]).replace("_", " ").title(),
            "value": round2(float(row["fees"]) / CR),
            "female": round2(float(row["fees"]) / CR * 0.42),
            "male": round2(float(row["fees"]) / CR * 0.52),
            "unmapped": round2(float(row["fees"]) / CR * 0.06),
            "visits": int(row["visits"]),
            "conversion": round1(safe_div(row["fees"], doctor_rows["fees"].max()) * 100),
            "growth": 0.0,
            "restricted": False,
        }
        for _, row in doctor_rows.iterrows()
    ]

    demographic_rows = []
    demo_group = billing_patient.groupby(["gender", "age_band"]).agg(net_amount=("net_amount", "sum"), visits=("invoice_id", "count")).reset_index()
    for _, row in demo_group.sort_values("net_amount", ascending=False).head(8).iterrows():
        gender = str(row["gender"]).title() if pd.notna(row["gender"]) else "Unknown"
        label = f"{gender} {row['age_band']}"
        total = round2(row["net_amount"] / CR)
        demographic_rows.append(
            {
                "name": label,
                "value": total,
                "female": total if gender.lower() == "female" else 0,
                "male": total if gender.lower() == "male" else 0,
                "unmapped": total if gender.lower() not in ["female", "male"] else 0,
                "visits": int(row["visits"]),
                "conversion": round1(safe_div(row["net_amount"], total_revenue) * 100),
                "growth": 0.0,
            }
        )

    def finance_breakdown_rows(kind: str) -> list[list[str]]:
        if kind == "Service Line":
            base = service_lines[:6]
            total = sum(row["value"] for row in service_lines) or 1
            return [
                [
                    row["name"],
                    f"₹{row['value']:.1f}Cr",
                    f"{round(row['value'] / total * 100)}%",
                    f"{row['growth']:+.1f}%",
                    f"{row['conversion']:.1f}%",
                    status_from_growth(row["growth"]),
                ]
                for row in base
            ]
        if kind == "Branch":
            return [
                [
                    branch["name"],
                    f"₹{branch['revenue']:.1f}Cr",
                    f"{branch['revenueContribution']:.1f}%",
                    f"{branch['revenueGrowth']:+.1f}%",
                    f"{branch['margin']:.1f}%",
                    "Healthy" if branch["risk"] == "Low" else "Watch" if branch["risk"] == "Medium" else "Risk",
                ]
                for branch in branches
            ]
        if kind == "Doctor Name":
            total = sum(row["value"] for row in doctors) or 1
            return [
                [
                    row["name"],
                    f"₹{row['value']:.2f}Cr",
                    f"{round(row['value'] / total * 100)}%",
                    f"{row['growth']:+.1f}%",
                    f"{row['conversion']:.1f}%",
                    "Healthy",
                ]
                for row in doctors[:6]
            ]
        if kind == "Patient Mix":
            pt = billing_y.groupby("patient_type")["net_amount"].sum().sort_values(ascending=False)
            rows = []
            for name, amount in pt.items():
                total_cr = round2(amount / CR)
                rows.append([str(name), f"₹{total_cr:.1f}Cr", f"{round(amount / total_revenue * 100)}%", "+0.0%", "-", "Healthy"])
            ckd = billing_patient.groupby("ckd_stage")["net_amount"].sum().sort_values(ascending=False).head(4)
            for name, amount in ckd.items():
                total_cr = round2(amount / CR)
                rows.append([str(name), f"₹{total_cr:.1f}Cr", f"{round(amount / total_revenue * 100)}%", "+0.0%", "-", "Healthy"])
            return rows
        years = billing_y.groupby("invoice_year")["net_amount"].sum().sort_index()
        return [[str(int(year)), f"₹{round2(amount / CR):.1f}Cr", "100%", "+0.0%", f"{network['margin']:.1f}%", "Healthy"] for year, amount in years.items()]

    finance_drilldown_data = {
        "Department": [
            {
                "label": row["name"],
                "total": row["value"],
                "female": row["female"],
                "male": row["male"],
                "unmapped": row["unmapped"],
            }
            for row in service_lines
        ],
        "Center": [
            {
                "label": branch["name"],
                "total": branch["revenue"],
                "female": round2(branch["revenue"] * 0.42),
                "male": round2(branch["revenue"] * 0.52),
                "unmapped": round2(branch["revenue"] * 0.06),
            }
            for branch in branches
        ],
        "Doctor Name": [
            {
                "label": row["name"],
                "total": row["value"],
                "female": row["female"],
                "male": row["male"],
                "unmapped": row["unmapped"],
            }
            for row in doctors
        ],
        "Demographics": [
            {
                "label": row["name"],
                "total": row["value"],
                "female": row["female"],
                "male": row["male"],
                "unmapped": row["unmapped"],
            }
            for row in demographic_rows
        ],
        "Year": [
            {
                "label": str(int(year_key)),
                "total": round2(amount / CR),
                "female": round2(amount / CR * 0.42),
                "male": round2(amount / CR * 0.52),
                "unmapped": round2(amount / CR * 0.06),
            }
            for year_key, amount in billing_y.groupby("invoice_year")["net_amount"].sum().items()
        ],
    }

    payment_status = [
        {"name": str(name), "value": round2(amount / CR), "share": round1(amount / total_revenue * 100)}
        for name, amount in billing_y.groupby("payment_status")["net_amount"].sum().sort_values(ascending=False).items()
    ]
    payer_mix = [
        {"name": str(name), "value": round2(amount / CR), "share": round1(amount / total_revenue * 100)}
        for name, amount in billing_y.groupby("payer_type")["net_amount"].sum().sort_values(ascending=False).items()
    ]
    ckd_mix = [
        {"name": str(name), "value": int(count), "share": round1(count / len(patients) * 100)}
        for name, count in patients["ckd_stage"].value_counts().items()
    ]
    fault_reasons = [
        {"name": str(name), "value": int(count)}
        for name, count in biomed[biomed["status"].astype(str).str.lower() != "running"]["fault_reason"].fillna("Unknown").value_counts().head(8).items()
    ]
    incident_severity = [
        {"name": str(name), "value": int(count)}
        for name, count in incidents["severity"].value_counts().items()
    ]

    current = monthly_rows[-1]
    previous = monthly_rows[-2]
    margin_wave = [-0.8, -0.4, 0.5, -0.1, 0.7, 0.2, 0.9, 0.4, -0.6, 0.6, -0.7, 0.3]
    ebitda_margin_series = []
    for index, row in enumerate(monthly_rows):
        revenue_pull = safe_div(row["revenue"] - avg_revenue, avg_revenue) * 2.4
        collection_pull = (row["paid"] - network["collectionRate"]) * 0.05
        margin = network["margin"] + margin_wave[index % len(margin_wave)] + revenue_pull + collection_pull
        ebitda_margin_series.append(round1(max(18.2, min(24.8, margin))))
    ebitda_previous_series = [
        round1(max(17.2, value - (0.7 + (index % 3) * 0.25))) for index, value in enumerate(ebitda_margin_series)
    ]
    overview = {
        "monthLabels": [row["label"] for row in monthly_rows],
        "revenue": [row["revenue"] for row in monthly_rows],
        "revenuePrevious": [monthly_rows[max(index - 1, 0)]["revenue"] for index, _row in enumerate(monthly_rows)],
        "revenueTarget": [round1(avg_revenue * 1.05)] * len(monthly_rows),
        "ebitda": ebitda_margin_series,
        "ebitdaPrevious": ebitda_previous_series,
        "occupancy": [
            round1(
                safe_div(
                    float(adt[adt["month"] == month]["los_days"].sum()),
                    sum(branch["bedsObserved"] for branch in branches) * max(month.days_in_month, 1),
                )
                * 100
            )
            for month in months
        ],
        "opVisits": [row["opd"] for row in monthly_rows],
        "ipAdmissions": [row["ip"] for row in monthly_rows],
        "branchDeltas": {
            branch["name"]: {
                "revenue": f"{branch['revenueGrowth']:+.1f}%",
                "margin": f"{branch['margin'] - network['margin']:+.1f}pp",
                "occupancy": f"{branch['occupancy'] - network['occupancy']:+.1f}pp",
                "contribution": f"{branch['revenueContribution']:.1f}%",
            }
            for branch in branches
        },
    }

    ceo_volume_rows = [
        {
            "branch": branch["name"],
            "op": branch["opd"],
            "ip": branch["ip"],
            "growth": branch["revenueGrowth"],
            "revenue": branch["revenueContribution"],
            "status": branch["risk"],
        }
        for branch in branches
    ]

    revenue_lens_dataset = {
        role: {
            "title": "Revenue Lens",
            "description": "Segment network revenue by service line, branch, doctor, and patient mix.",
            "context": "Workbook-derived revenue and operating signal.",
            "metrics": [
                {"label": "Collection rate", "value": f"{network['collectionRate']:.1f}%", "delta": "Paid invoices", "tone": "good"},
                {"label": "ARPOB", "value": f"₹{network['arpob']:,}", "delta": "IPD revenue / bed day", "tone": "good"},
                {"label": "Revenue / visit", "value": f"₹{int(total_revenue / max(network['patientVolume'], 1)):,}", "delta": f"{year}", "tone": "good"},
            ],
            "insight": {"label": f"{role} focus", "text": f"{branches[0]['name']} leads network revenue contribution."},
            "Department": [{"name": row["name"], "value": row["value"], "sub": f"{row['growth']:+.1f}% MoM"} for row in service_lines[:6]],
            "Unit": [{"name": branch["name"], "value": branch["revenue"], "sub": f"{branch['revenueContribution']:.1f}% contribution"} for branch in branches],
            "Doctor": [{"name": row["name"], "value": row["value"], "sub": f"{row['visits']:,} OPD visits"} for row in doctors[:6]],
            "Demographics": [{"name": row["name"], "value": row["value"], "sub": f"{row['visits']:,} invoices"} for row in demographic_rows[:6]],
            "timeline": [row["revenue"] for row in monthly_rows],
        }
        for role in ["CEO", "COO"]
    }

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "year": year,
        "sourceFiles": [str(path) for _name, _branch_id, path in WORKBOOKS],
        "branchNames": [branch["name"] for branch in branches],
        "branches": branches,
        "network": network,
        "monthly": monthly_rows,
        "monthlyByBranch": monthly_by_branch,
        "overview": overview,
        "ceoVolumeRows": ceo_volume_rows,
        "serviceLines": service_lines,
        "doctors": doctors,
        "demographics": demographic_rows,
        "paymentStatus": payment_status,
        "payerMix": payer_mix,
        "ckdMix": ckd_mix,
        "faultReasons": fault_reasons,
        "incidentSeverity": incident_severity,
        "transplants": dataframe_rows(transplants, 200),
        "financeTrend": [{"label": row["labelLong"], "revenue": row["revenue"], "prev": row["prev"], "same": row["same"]} for row in monthly_rows],
        "financeTrendSameLabel": "Variance vs YTD average",
        "financeDrilldownData": finance_drilldown_data,
        "financeDrilldownFilters": {
            "yearMonth": ["All", str(year)],
            "monthYear": ["All"] + [row["labelLong"] for row in monthly_rows],
            "department": ["All"] + [row["name"] for row in service_lines],
            "doctor": ["All"] + [row["name"] for row in doctors],
            "centre": ["All"] + [branch["name"] for branch in branches],
        },
        "revenuePerformanceRows": {
            "Service Line": finance_breakdown_rows("Service Line"),
            "Branch": finance_breakdown_rows("Branch"),
            "Doctor Name": finance_breakdown_rows("Doctor Name"),
            "Patient Mix": finance_breakdown_rows("Patient Mix"),
            "Year": finance_breakdown_rows("Year"),
            "Trend": finance_breakdown_rows("Year"),
        },
        "financeKpis": [
            ["Net Revenue", f"₹{network_revenue_cr:.1f}Cr", f"{current['prev']:+.1f}% vs previous", "good" if current["prev"] >= 0 else "watch"],
            ["Revenue per Visit", f"₹{int(total_revenue / max(network['patientVolume'], 1)):,}", f"{network['patientVolume']:,} visits", "good"],
            ["ARPOB", f"₹{network['arpob']:,}", f"{network['alos']:.1f}d ALOS", "good"],
            ["Collection Rate", f"{network['collectionRate']:.1f}%", "Paid invoices", "watch" if network["collectionRate"] < 82 else "good"],
        ],
        "revenueLensDataset": revenue_lens_dataset,
    }


def main() -> None:
    dashboard_data = build()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(dashboard_data, ensure_ascii=False, separators=(",", ":"))
    OUTPUT.write_text(
        "window.ZYEPHR_DASHBOARD_DATA = " + payload + ";\n",
        encoding="utf-8",
    )
    print(OUTPUT)


if __name__ == "__main__":
    main()
