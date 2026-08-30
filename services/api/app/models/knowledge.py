from __future__ import annotations

from sqlalchemy import DateTime, Enum, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ResearchStudy(Base):
    __tablename__ = "research_studies"

    study_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    authors: Mapped[list | None] = mapped_column(JSONB, default=list)
    journal: Mapped[str | None] = mapped_column(String(255))
    doi: Mapped[str | None] = mapped_column(String(255))
    publication_year: Mapped[int | None] = mapped_column(Integer)
    abstract: Mapped[str | None] = mapped_column(Text)
    source_url: Mapped[str | None] = mapped_column(String(500))
    source_repository: Mapped[str | None] = mapped_column(String(50))

    study_design: Mapped[str | None] = mapped_column(String(50))
    sample_size: Mapped[int | None] = mapped_column(Integer)
    study_period_start: Mapped[str | None] = mapped_column(String(20))
    study_period_end: Mapped[str | None] = mapped_column(String(20))
    patient_demographics: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    key_statistical_findings: Mapped[list | dict | None] = mapped_column(JSONB, default=list)
    limitations: Mapped[list | None] = mapped_column(JSONB, default=list)
    references_cited: Mapped[list | None] = mapped_column(JSONB, default=list)

    study_district: Mapped[str | None] = mapped_column(String(100))
    study_ta: Mapped[str | None] = mapped_column(String(100))
    study_facility: Mapped[str | None] = mapped_column(String(255))

    researcher_contact: Mapped[str | None] = mapped_column(String(255))
    consent_status: Mapped[str] = mapped_column(
        Enum("pending", "granted", "denied", "withdrawn", name="consent_status"),
        default="pending",
    )
    consent_date: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    researcher_notes: Mapped[str | None] = mapped_column(Text)

    health_topic: Mapped[str] = mapped_column(String(100), nullable=False)
    audience: Mapped[str | None] = mapped_column(String(100))

    discovered_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    ingested_by: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(
        Enum("discovered", "under_review", "approved", "synthesized", "deployed", name="study_status"),
        default="discovered",
    )
    created_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))


class KnowledgeAsset(Base):
    __tablename__ = "knowledge_assets"

    asset_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    study_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    title_chichewa: Mapped[str | None] = mapped_column(String(255))

    key_finding: Mapped[str] = mapped_column(Text, nullable=False)
    key_finding_chichewa: Mapped[str | None] = mapped_column(Text)
    actionable_takeaways: Mapped[list | None] = mapped_column(JSONB, default=list)
    actionable_takeaways_chichewa: Mapped[list | None] = mapped_column(JSONB, default=list)
    evidence_refs: Mapped[list | None] = mapped_column(JSONB, default=list)

    asset_type: Mapped[str] = mapped_column(
        Enum(
            "chw_brief", "video", "audio", "poster", "flipbook",
            "sms", "infographic", "community_talk",
            name="asset_type",
        ),
        nullable=False,
    )
    health_topic: Mapped[str] = mapped_column(String(100), nullable=False)
    audience: Mapped[str | None] = mapped_column(String(100))
    severity: Mapped[str] = mapped_column(
        Enum("info", "warning", "emergency", name="content_severity"),
        default="info",
    )

    media_url: Mapped[str | None] = mapped_column(String(500))
    thumbnail_url: Mapped[str | None] = mapped_column(String(500))
    audio_url: Mapped[str | None] = mapped_column(String(500))
    poster_url: Mapped[str | None] = mapped_column(String(500))
    flipbook_urls: Mapped[list | None] = mapped_column(JSONB, default=list)

    synthesized_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    synthesized_by: Mapped[str | None] = mapped_column(String(100))
    confidence_level: Mapped[str | None] = mapped_column(String(20))
    reviewed_by: Mapped[str | None] = mapped_column(String(255))
    review_notes: Mapped[str | None] = mapped_column(Text)

    status: Mapped[str] = mapped_column(
        Enum("draft", "review", "approved", "deployed", name="asset_status"),
        default="draft",
    )
    created_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))


class KnowledgeDeployment(Base):
    __tablename__ = "knowledge_deployments"

    deployment_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    asset_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    talk_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    guide_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    chw_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    district_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    ta_name: Mapped[str | None] = mapped_column(String(100))
    village_name: Mapped[str | None] = mapped_column(String(100))

    delivery_method: Mapped[str] = mapped_column(
        Enum(
            "home_visit", "community_meeting", "clinic", "school",
            "radio", "sms", "poster",
            name="delivery_method",
        ),
        nullable=False,
    )
    households_reached: Mapped[int | None] = mapped_column(Integer, default=0)
    individuals_reached: Mapped[int | None] = mapped_column(Integer, default=0)
    deployed_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    deployed_by: Mapped[str | None] = mapped_column(String(255))

    knowledge_pre_score: Mapped[float | None] = mapped_column(Float)
    knowledge_post_score: Mapped[float | None] = mapped_column(Float)
    behavior_change_score: Mapped[float | None] = mapped_column(Float)
    health_outcome_delta: Mapped[float | None] = mapped_column(Float)
    cases_identified: Mapped[int | None] = mapped_column(Integer, default=0)
    referrals_made: Mapped[int | None] = mapped_column(Integer, default=0)
    outcomes_tracked: Mapped[dict | None] = mapped_column(JSONB, default=dict)
    follow_up_date: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    follow_up_completed: Mapped[bool | None] = mapped_column(default=False)
    follow_up_notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))


class SelfCareGuide(Base):
    __tablename__ = "self_care_guides"

    guide_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    title_chichewa: Mapped[str | None] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    audience: Mapped[str | None] = mapped_column(String(100))
    severity: Mapped[str] = mapped_column(
        Enum("info", "warning", "emergency", name="guide_severity"),
        default="info",
    )

    what_it_is: Mapped[str | None] = mapped_column(Text)
    what_it_is_chichewa: Mapped[str | None] = mapped_column(Text)
    what_to_do_now: Mapped[list | None] = mapped_column(JSONB, default=list)
    what_to_do_now_chichewa: Mapped[list | None] = mapped_column(JSONB, default=list)
    what_not_to_do: Mapped[list | None] = mapped_column(JSONB, default=list)
    what_not_to_do_chichewa: Mapped[list | None] = mapped_column(JSONB, default=list)
    when_to_seek_help: Mapped[str | None] = mapped_column(Text)
    when_to_seek_help_chichewa: Mapped[str | None] = mapped_column(Text)
    prevention: Mapped[list | None] = mapped_column(JSONB, default=list)
    prevention_chichewa: Mapped[list | None] = mapped_column(JSONB, default=list)
    treatment_limitations: Mapped[list | None] = mapped_column(JSONB, default=list)
    treatment_limitations_chichewa: Mapped[list | None] = mapped_column(JSONB, default=list)
    clinical_decision_points: Mapped[list | None] = mapped_column(JSONB, default=list)
    clinical_decision_points_chichewa: Mapped[list | None] = mapped_column(JSONB, default=list)

    illustration_url: Mapped[str | None] = mapped_column(String(500))
    audio_url: Mapped[str | None] = mapped_column(String(500))
    video_url: Mapped[str | None] = mapped_column(String(500))

    source: Mapped[str | None] = mapped_column(String(500))
    last_reviewed: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    reviewed_by: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool | None] = mapped_column(default=True)
    created_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))


class CommunityHealthTalk(Base):
    __tablename__ = "community_health_talks"

    talk_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    title_chichewa: Mapped[str | None] = mapped_column(String(255))
    study_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))

    duration_minutes: Mapped[int | None] = mapped_column(Integer, default=15)
    talking_points: Mapped[list | None] = mapped_column(JSONB, default=list)
    talking_points_chichewa: Mapped[list | None] = mapped_column(JSONB, default=list)
    discussion_questions: Mapped[list | None] = mapped_column(JSONB, default=list)
    pledge_card_text: Mapped[str | None] = mapped_column(Text)
    pledge_card_text_chichewa: Mapped[str | None] = mapped_column(Text)

    picture_card_urls: Mapped[list | None] = mapped_column(JSONB, default=list)
    song_url: Mapped[str | None] = mapped_column(String(500))
    diagram_urls: Mapped[list | None] = mapped_column(JSONB, default=list)

    health_topic: Mapped[str] = mapped_column(String(100), nullable=False)
    audience: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(
        Enum("draft", "review", "approved", name="talk_status"),
        default="draft",
    )
    created_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))


class MentalHealthReferral(Base):
    __tablename__ = "mental_health_referrals"

    referral_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    study_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    asset_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    deployment_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))

    individual_name: Mapped[str | None] = mapped_column(String(255))
    age: Mapped[int | None] = mapped_column(Integer)
    sex: Mapped[str | None] = mapped_column(String(10))
    village_name: Mapped[str | None] = mapped_column(String(100))
    ta_name: Mapped[str | None] = mapped_column(String(100))
    district: Mapped[str | None] = mapped_column(String(100))

    risk_factors: Mapped[list | None] = mapped_column(JSONB, default=list)
    trigger_event: Mapped[str | None] = mapped_column(String(255))
    presenting_concern: Mapped[str | None] = mapped_column(Text)

    referred_to: Mapped[str | None] = mapped_column(String(255))
    referral_date: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    follow_up_date: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    outcome: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        Enum("identified", "referred", "in_care", "followed_up", "resolved", "lost_to_followup", name="mh_referral_status"),
        default="identified",
    )
    chw_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[str | None] = mapped_column(DateTime(timezone=True))
