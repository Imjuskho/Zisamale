from __future__ import annotations

from pydantic import BaseModel, model_validator


def _coerce_list_str(v: object) -> list[str]:
    """Ensure value is a list of strings. Coerces dicts by extracting 'finding' or 'action'."""
    if isinstance(v, list):
        return [
            item.get("finding", item.get("action", str(item)))
            if isinstance(item, dict)
            else str(item)
            for item in v
        ]
    if isinstance(v, dict):
        return [v.get("finding", v.get("action", str(v)))]
    return []


def _coerce_list_dict(v: object) -> list[dict]:
    """Ensure value is a list of dicts. Wraps bare dicts/strings."""
    if isinstance(v, list):
        return [item if isinstance(item, dict) else {"value": item} for item in v]
    if isinstance(v, dict):
        return [v]
    return []


class ResearchStudyCreate(BaseModel):
    title: str
    authors: list[str] = []
    journal: str | None = None
    doi: str | None = None
    publication_year: int | None = None
    abstract: str | None = None
    source_url: str | None = None
    source_repository: str | None = None
    study_design: str | None = None
    sample_size: int | None = None
    study_period_start: str | None = None
    study_period_end: str | None = None
    patient_demographics: dict | None = None
    key_statistical_findings: dict | list[dict] | None = None
    limitations: list[str] | None = None
    references_cited: list[str] | None = None
    study_district: str | None = None
    study_ta: str | None = None
    study_facility: str | None = None
    researcher_contact: str | None = None
    health_topic: str
    audience: str | None = None


class ResearchStudyResponse(BaseModel):
    study_id: str
    title: str
    authors: list[str]
    journal: str | None = None
    doi: str | None = None
    publication_year: int | None = None
    study_design: str | None = None
    sample_size: int | None = None
    study_period_start: str | None = None
    study_period_end: str | None = None
    patient_demographics: dict | None = None
    key_statistical_findings: dict | list[dict] | None = None
    limitations: list[str]
    references_cited: list[str]
    study_district: str | None = None
    study_ta: str | None = None
    health_topic: str
    audience: str | None = None
    consent_status: str
    status: str
    discovered_at: str | None = None

    @model_validator(mode="before")
    @classmethod
    def coerce_jsonb(cls, data: dict) -> dict:
        if isinstance(data, dict):
            data["authors"] = _coerce_list_str(data.get("authors", []))
            data["limitations"] = _coerce_list_str(data.get("limitations", []))
            data["references_cited"] = _coerce_list_str(data.get("references_cited", []))
        return data


class ConsentUpdate(BaseModel):
    consent_status: str
    researcher_notes: str | None = None


class KnowledgeAssetCreate(BaseModel):
    study_id: str | None = None
    title: str
    title_chichewa: str | None = None
    key_finding: str
    key_finding_chichewa: str | None = None
    actionable_takeaways: list[str] = []
    actionable_takeaways_chichewa: list[str] = []
    evidence_refs: list[dict] | None = None
    asset_type: str
    health_topic: str
    audience: str | None = None
    severity: str = "info"
    media_url: str | None = None
    audio_url: str | None = None
    poster_url: str | None = None


class KnowledgeAssetResponse(BaseModel):
    asset_id: str
    study_id: str | None = None
    title: str
    title_chichewa: str | None = None
    key_finding: str
    key_finding_chichewa: str | None = None
    actionable_takeaways: list[str]
    actionable_takeaways_chichewa: list[str]
    evidence_refs: list[dict]
    asset_type: str
    health_topic: str
    audience: str | None = None
    severity: str
    media_url: str | None = None
    audio_url: str | None = None
    poster_url: str | None = None
    confidence_level: str | None = None
    status: str
    synthesized_at: str | None = None

    @model_validator(mode="before")
    @classmethod
    def coerce_jsonb(cls, data: dict) -> dict:
        if isinstance(data, dict):
            data["actionable_takeaways"] = _coerce_list_str(data.get("actionable_takeaways", []))
            data["actionable_takeaways_chichewa"] = _coerce_list_str(
                data.get("actionable_takeaways_chichewa", [])
            )
            data["evidence_refs"] = _coerce_list_dict(data.get("evidence_refs", []))
        return data


class DeploymentCreate(BaseModel):
    asset_id: str | None = None
    talk_id: str | None = None
    guide_id: str | None = None
    chw_id: str | None = None
    district_id: str | None = None
    ta_name: str | None = None
    village_name: str | None = None
    delivery_method: str
    households_reached: int = 0
    individuals_reached: int = 0
    cases_identified: int = 0
    referrals_made: int = 0


class DeploymentResponse(BaseModel):
    deployment_id: str
    asset_id: str | None = None
    talk_id: str | None = None
    guide_id: str | None = None
    chw_id: str | None = None
    delivery_method: str
    households_reached: int
    individuals_reached: int
    deployed_at: str | None = None
    knowledge_pre_score: float | None = None
    knowledge_post_score: float | None = None
    behavior_change_score: float | None = None
    cases_identified: int
    referrals_made: int
    outcomes_tracked: dict

    @model_validator(mode="before")
    @classmethod
    def coerce_jsonb(cls, data: dict) -> dict:
        if isinstance(data, dict):
            v = data.get("outcomes_tracked")
            if not isinstance(v, dict):
                data["outcomes_tracked"] = {}
            if data.get("cases_identified") is None:
                data["cases_identified"] = 0
            if data.get("referrals_made") is None:
                data["referrals_made"] = 0
        return data


class ImpactReport(BaseModel):
    deployment_id: str
    knowledge_pre_score: float | None = None
    knowledge_post_score: float | None = None
    behavior_change_score: float | None = None
    health_outcome_delta: float | None = None
    cases_identified: int | None = None
    referrals_made: int | None = None
    outcomes_tracked: dict | None = None
    follow_up_notes: str | None = None


class SelfCareGuideCreate(BaseModel):
    title: str
    title_chichewa: str | None = None
    category: str
    audience: str | None = None
    severity: str = "info"
    what_it_is: str | None = None
    what_it_is_chichewa: str | None = None
    what_to_do_now: list[str] = []
    what_to_do_now_chichewa: list[str] = []
    what_not_to_do: list[str] = []
    what_not_to_do_chichewa: list[str] = []
    when_to_seek_help: str | None = None
    when_to_seek_help_chichewa: str | None = None
    prevention: list[str] = []
    prevention_chichewa: list[str] = []
    treatment_limitations: list[str] | None = None
    treatment_limitations_chichewa: list[str] | None = None
    clinical_decision_points: list[dict] | None = None
    clinical_decision_points_chichewa: list[dict] | None = None
    source: str | None = None


class SelfCareGuideResponse(BaseModel):
    guide_id: str
    title: str
    title_chichewa: str | None = None
    category: str
    audience: str | None = None
    severity: str
    what_it_is: str | None = None
    what_it_is_chichewa: str | None = None
    what_to_do_now: list[str]
    what_to_do_now_chichewa: list[str]
    what_not_to_do: list[str]
    what_not_to_do_chichewa: list[str]
    when_to_seek_help: str | None = None
    when_to_seek_help_chichewa: str | None = None
    prevention: list[str]
    prevention_chichewa: list[str]
    treatment_limitations: list[str]
    treatment_limitations_chichewa: list[str]
    clinical_decision_points: list[dict]
    clinical_decision_points_chichewa: list[dict]
    illustration_url: str | None = None
    audio_url: str | None = None
    video_url: str | None = None
    source: str | None = None
    last_reviewed: str | None = None

    @model_validator(mode="before")
    @classmethod
    def coerce_jsonb(cls, data: dict) -> dict:
        if isinstance(data, dict):
            for field in (
                "what_to_do_now",
                "what_to_do_now_chichewa",
                "what_not_to_do",
                "what_not_to_do_chichewa",
                "prevention",
                "prevention_chichewa",
                "treatment_limitations",
                "treatment_limitations_chichewa",
            ):
                data[field] = _coerce_list_str(data.get(field, []))
            for field in ("clinical_decision_points", "clinical_decision_points_chichewa"):
                data[field] = _coerce_list_dict(data.get(field, []))
        return data


class HealthTalkCreate(BaseModel):
    title: str
    title_chichewa: str | None = None
    study_id: str | None = None
    duration_minutes: int = 15
    talking_points: list[str] = []
    talking_points_chichewa: list[str] = []
    discussion_questions: list[str] = []
    pledge_card_text: str | None = None
    pledge_card_text_chichewa: str | None = None
    health_topic: str
    audience: str | None = None


class HealthTalkResponse(BaseModel):
    talk_id: str
    title: str
    title_chichewa: str | None = None
    study_id: str | None = None
    duration_minutes: int
    talking_points: list[str]
    talking_points_chichewa: list[str]
    discussion_questions: list[str]
    pledge_card_text: str | None = None
    pledge_card_text_chichewa: str | None = None
    health_topic: str
    status: str

    @model_validator(mode="before")
    @classmethod
    def coerce_jsonb(cls, data: dict) -> dict:
        if isinstance(data, dict):
            for field in ("talking_points", "talking_points_chichewa", "discussion_questions"):
                data[field] = _coerce_list_str(data.get(field, []))
        return data


class SAMALASummary(BaseModel):
    total_studies: int
    studies_by_status: dict[str, int]
    total_assets: int
    assets_by_type: dict[str, int]
    total_deployments: int
    households_reached: int
    avg_knowledge_change: float | None = None
    topic_coverage: dict[str, int]
    total_referrals: int = 0


class MentalHealthReferralCreate(BaseModel):
    study_id: str | None = None
    asset_id: str | None = None
    deployment_id: str | None = None
    individual_name: str | None = None
    age: int | None = None
    sex: str | None = None
    village_name: str | None = None
    ta_name: str | None = None
    district: str | None = None
    risk_factors: list[str] | None = None
    trigger_event: str | None = None
    presenting_concern: str | None = None
    referred_to: str | None = None
    chw_id: str | None = None
    notes: str | None = None


class MentalHealthReferralResponse(BaseModel):
    referral_id: str
    study_id: str | None = None
    asset_id: str | None = None
    deployment_id: str | None = None
    individual_name: str | None = None
    age: int | None = None
    sex: str | None = None
    village_name: str | None = None
    ta_name: str | None = None
    district: str | None = None
    risk_factors: list[str]
    trigger_event: str | None = None
    presenting_concern: str | None = None
    referred_to: str | None = None
    referral_date: str | None = None
    follow_up_date: str | None = None
    outcome: str | None = None
    status: str
    chw_id: str | None = None
    created_at: str | None = None

    @model_validator(mode="before")
    @classmethod
    def coerce_jsonb(cls, data: dict) -> dict:
        if isinstance(data, dict):
            data["risk_factors"] = _coerce_list_str(data.get("risk_factors", []))
        return data
