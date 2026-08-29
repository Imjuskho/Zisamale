from __future__ import annotations

import asyncio
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from email.message import EmailMessage
import smtplib

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.deps import require_role
from app.models.household import Household
from app.models.knowledge import (
    CommunityHealthTalk,
    KnowledgeAsset,
    KnowledgeDeployment,
    MentalHealthReferral,
    ResearchStudy,
    SelfCareGuide,
)
from app.schemas.knowledge import (
    ConsentUpdate,
    DeploymentCreate,
    DeploymentResponse,
    HealthTalkCreate,
    HealthTalkResponse,
    ImpactReport,
    KnowledgeAssetCreate,
    KnowledgeAssetResponse,
    MentalHealthReferralCreate,
    MentalHealthReferralResponse,
    ResearchStudyCreate,
    ResearchStudyResponse,
    SAMALASummary,
    SelfCareGuideCreate,
    SelfCareGuideResponse,
)

router = APIRouter(prefix="/api/v1/samala", tags=["samala"])


# ── Research Studies ──────────────────────────────────────────


@router.get("/studies")
async def list_studies(
    health_topic: str | None = None,
    district: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor")),
):
    query = select(ResearchStudy)
    if health_topic:
        query = query.where(ResearchStudy.health_topic == health_topic)
    if district:
        query = query.where(ResearchStudy.study_district == district)
    if status:
        query = query.where(ResearchStudy.status == status)
    query = query.order_by(ResearchStudy.created_at.desc())

    result = await db.execute(query)
    studies = result.scalars().all()

    return {
        "studies": [
            ResearchStudyResponse(
                study_id=s.study_id,
                title=s.title,
                authors=s.authors or [],
                journal=s.journal,
                doi=s.doi,
                publication_year=s.publication_year,
                study_design=s.study_design,
                sample_size=s.sample_size,
                study_period_start=s.study_period_start,
                study_period_end=s.study_period_end,
                patient_demographics=s.patient_demographics,
                key_statistical_findings=s.key_statistical_findings,
                limitations=s.limitations,
                references_cited=s.references_cited,
                study_district=s.study_district,
                study_ta=s.study_ta,
                health_topic=s.health_topic,
                audience=s.audience,
                consent_status=s.consent_status,
                status=s.status,
                discovered_at=str(s.discovered_at) if s.discovered_at else None,
            ).model_dump()
            for s in studies
        ]
    }


@router.post("/studies")
async def create_study(
    body: ResearchStudyCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    study = ResearchStudy(
        study_id=str(uuid.uuid4()),
        title=body.title,
        authors=body.authors,
        journal=body.journal,
        doi=body.doi,
        publication_year=body.publication_year,
        abstract=body.abstract,
        source_url=body.source_url,
        source_repository=body.source_repository,
        study_design=body.study_design,
        sample_size=body.sample_size,
        study_period_start=body.study_period_start,
        study_period_end=body.study_period_end,
        patient_demographics=body.patient_demographics,
        key_statistical_findings=body.key_statistical_findings,
        limitations=body.limitations,
        references_cited=body.references_cited,
        study_district=body.study_district,
        study_ta=body.study_ta,
        study_facility=body.study_facility,
        researcher_contact=body.researcher_contact,
        health_topic=body.health_topic,
        audience=body.audience,
        discovered_at=datetime.now(timezone.utc),
        ingested_by="manual",
        status="discovered",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(study)
    await db.flush()
    return {"study_id": study.study_id, "status": "created"}


@router.get("/studies/{study_id}")
async def get_study(
    study_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor", "chw")),
):
    result = await db.execute(select(ResearchStudy).where(ResearchStudy.study_id == study_id))
    study = result.scalar_one_or_none()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    return ResearchStudyResponse(
        study_id=study.study_id,
        title=study.title,
        authors=study.authors or [],
        journal=study.journal,
        doi=study.doi,
        publication_year=study.publication_year,
        study_design=study.study_design,
        sample_size=study.sample_size,
        study_period_start=study.study_period_start,
        study_period_end=study.study_period_end,
        patient_demographics=study.patient_demographics,
        key_statistical_findings=study.key_statistical_findings,
        limitations=study.limitations,
        references_cited=study.references_cited,
        study_district=study.study_district,
        study_ta=study.study_ta,
        health_topic=study.health_topic,
        audience=study.audience,
        consent_status=study.consent_status,
        status=study.status,
        discovered_at=str(study.discovered_at) if study.discovered_at else None,
    ).model_dump()


@router.patch("/studies/{study_id}/consent")
async def update_consent(
    study_id: str,
    body: ConsentUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    result = await db.execute(select(ResearchStudy).where(ResearchStudy.study_id == study_id))
    study = result.scalar_one_or_none()
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    study.consent_status = body.consent_status
    study.researcher_notes = body.researcher_notes
    study.updated_at = datetime.now(timezone.utc)
    if body.consent_status == "granted":
        study.consent_date = datetime.now(timezone.utc)
        study.status = "approved"

    return {"status": "updated", "study_id": study_id, "consent_status": body.consent_status}


# ── Knowledge Assets ──────────────────────────────────────────


@router.get("/assets")
async def list_assets(
    health_topic: str | None = None,
    asset_type: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor", "chw")),
):
    query = select(KnowledgeAsset)
    if health_topic:
        query = query.where(KnowledgeAsset.health_topic == health_topic)
    if asset_type:
        query = query.where(KnowledgeAsset.asset_type == asset_type)
    if status:
        query = query.where(KnowledgeAsset.status == status)
    query = query.order_by(KnowledgeAsset.created_at.desc())

    result = await db.execute(query)
    assets = result.scalars().all()

    return {
        "assets": [
            KnowledgeAssetResponse(
                asset_id=a.asset_id,
                study_id=a.study_id,
                title=a.title,
                title_chichewa=a.title_chichewa,
                key_finding=a.key_finding,
                key_finding_chichewa=a.key_finding_chichewa,
                actionable_takeaways=a.actionable_takeaways or [],
                actionable_takeaways_chichewa=a.actionable_takeaways_chichewa or [],
                evidence_refs=a.evidence_refs or [],
                asset_type=a.asset_type,
                health_topic=a.health_topic,
                audience=a.audience,
                severity=a.severity,
                media_url=a.media_url,
                audio_url=a.audio_url,
                poster_url=a.poster_url,
                confidence_level=a.confidence_level,
                status=a.status,
                synthesized_at=str(a.synthesized_at) if a.synthesized_at else None,
            ).model_dump()
            for a in assets
        ]
    }


@router.post("/assets")
async def create_asset(
    body: KnowledgeAssetCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    asset = KnowledgeAsset(
        asset_id=str(uuid.uuid4()),
        study_id=body.study_id,
        title=body.title,
        title_chichewa=body.title_chichewa,
        key_finding=body.key_finding,
        key_finding_chichewa=body.key_finding_chichewa,
        actionable_takeaways=body.actionable_takeaways,
        actionable_takeaways_chichewa=body.actionable_takeaways_chichewa,
        evidence_refs=body.evidence_refs,
        asset_type=body.asset_type,
        health_topic=body.health_topic,
        audience=body.audience,
        severity=body.severity,
        media_url=body.media_url,
        audio_url=body.audio_url,
        poster_url=body.poster_url,
        synthesized_at=datetime.now(timezone.utc),
        synthesized_by="admin",
        status="draft",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(asset)
    await db.flush()
    return {"asset_id": asset.asset_id, "status": "created"}


@router.get("/assets/{asset_id}")
async def get_asset(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor", "chw")),
):
    result = await db.execute(select(KnowledgeAsset).where(KnowledgeAsset.asset_id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    return KnowledgeAssetResponse(
        asset_id=asset.asset_id,
        study_id=asset.study_id,
        title=asset.title,
        title_chichewa=asset.title_chichewa,
        key_finding=asset.key_finding,
        key_finding_chichewa=asset.key_finding_chichewa,
        actionable_takeaways=asset.actionable_takeaways or [],
        actionable_takeaways_chichewa=asset.actionable_takeaways_chichewa or [],
        evidence_refs=asset.evidence_refs or [],
        asset_type=asset.asset_type,
        health_topic=asset.health_topic,
        audience=asset.audience,
        severity=asset.severity,
        media_url=asset.media_url,
        audio_url=asset.audio_url,
        poster_url=asset.poster_url,
        confidence_level=asset.confidence_level,
        status=asset.status,
        synthesized_at=str(asset.synthesized_at) if asset.synthesized_at else None,
    ).model_dump()


@router.patch("/assets/{asset_id}/approve")
async def approve_asset(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    result = await db.execute(select(KnowledgeAsset).where(KnowledgeAsset.asset_id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset.status = "approved"
    asset.reviewed_by = user.get("sub")
    asset.updated_at = datetime.now(timezone.utc)
    return {"status": "approved", "asset_id": asset_id}


# ── Deployments ───────────────────────────────────────────────


@router.get("/deployments")
async def list_deployments(
    asset_id: str | None = None,
    chw_id: str | None = None,
    district_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor")),
):
    query = select(KnowledgeDeployment)
    if asset_id:
        query = query.where(KnowledgeDeployment.asset_id == asset_id)
    if chw_id:
        query = query.where(KnowledgeDeployment.chw_id == chw_id)
    if district_id:
        query = query.where(KnowledgeDeployment.district_id == district_id)
    query = query.order_by(KnowledgeDeployment.deployed_at.desc())

    result = await db.execute(query)
    deployments = result.scalars().all()

    return {
        "deployments": [
            DeploymentResponse(
                deployment_id=d.deployment_id,
                asset_id=d.asset_id,
                talk_id=d.talk_id,
                guide_id=d.guide_id,
                chw_id=d.chw_id,
                delivery_method=d.delivery_method,
                households_reached=d.households_reached or 0,
                individuals_reached=d.individuals_reached or 0,
                deployed_at=str(d.deployed_at) if d.deployed_at else None,
                knowledge_pre_score=d.knowledge_pre_score,
                knowledge_post_score=d.knowledge_post_score,
                behavior_change_score=d.behavior_change_score,
                cases_identified=d.cases_identified or 0,
                referrals_made=d.referrals_made or 0,
                outcomes_tracked=d.outcomes_tracked or {},
            ).model_dump()
            for d in deployments
        ]
    }


@router.post("/deployments")
async def create_deployment(
    body: DeploymentCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("chw", "supervisor", "dho")),
):
    if not body.asset_id and not body.talk_id and not body.guide_id:
        raise HTTPException(status_code=400, detail="One of asset_id, talk_id, or guide_id is required")

    delivery_method = body.delivery_method
    if body.talk_id and delivery_method == "home_visit":
        delivery_method = "community_meeting"
    if body.guide_id and delivery_method not in ("home_visit", "clinic"):
        delivery_method = "home_visit"

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    deployment = KnowledgeDeployment(
        deployment_id=str(uuid.uuid4()),
        asset_id=body.asset_id,
        talk_id=body.talk_id,
        guide_id=body.guide_id,
        chw_id=body.chw_id,
        district_id=body.district_id,
        ta_name=body.ta_name,
        village_name=body.village_name,
        delivery_method=delivery_method,
        households_reached=body.households_reached,
        individuals_reached=body.individuals_reached,
        cases_identified=body.cases_identified,
        referrals_made=body.referrals_made,
        deployed_at=now,
        deployed_by=user.get("sub"),
        created_at=now,
    )
    db.add(deployment)
    await db.flush()
    return {"deployment_id": deployment.deployment_id, "status": "created"}


@router.patch("/deployments/{deployment_id}/impact")
async def report_impact(
    deployment_id: str,
    body: ImpactReport,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("chw", "supervisor", "dho")),
):
    result = await db.execute(
        select(KnowledgeDeployment).where(KnowledgeDeployment.deployment_id == deployment_id)
    )
    deployment = result.scalar_one_or_none()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")

    deployment.knowledge_pre_score = body.knowledge_pre_score
    deployment.knowledge_post_score = body.knowledge_post_score
    deployment.behavior_change_score = body.behavior_change_score
    deployment.health_outcome_delta = body.health_outcome_delta
    deployment.cases_identified = body.cases_identified
    deployment.referrals_made = body.referrals_made
    deployment.outcomes_tracked = body.outcomes_tracked
    deployment.follow_up_notes = body.follow_up_notes
    deployment.follow_up_completed = True

    return {"status": "updated", "deployment_id": deployment_id}


# ── Self-Care Guides ─────────────────────────────────────────


@router.get("/guides")
async def list_guides(
    category: str | None = None,
    severity: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor", "chw")),
):
    query = select(SelfCareGuide).where(SelfCareGuide.is_active == True)  # noqa: E712
    if category:
        query = query.where(SelfCareGuide.category == category)
    if severity:
        query = query.where(SelfCareGuide.severity == severity)
    query = query.order_by(SelfCareGuide.title)

    result = await db.execute(query)
    guides = result.scalars().all()

    return {
        "guides": [
            SelfCareGuideResponse(
                guide_id=g.guide_id,
                title=g.title,
                title_chichewa=g.title_chichewa,
                category=g.category,
                audience=g.audience,
                severity=g.severity,
                what_it_is=g.what_it_is,
                what_it_is_chichewa=g.what_it_is_chichewa,
                what_to_do_now=g.what_to_do_now or [],
                what_to_do_now_chichewa=g.what_to_do_now_chichewa or [],
                what_not_to_do=g.what_not_to_do or [],
                what_not_to_do_chichewa=g.what_not_to_do_chichewa or [],
                when_to_seek_help=g.when_to_seek_help,
                when_to_seek_help_chichewa=g.when_to_seek_help_chichewa,
                prevention=g.prevention or [],
                prevention_chichewa=g.prevention_chichewa or [],
                treatment_limitations=g.treatment_limitations or [],
                treatment_limitations_chichewa=g.treatment_limitations_chichewa or [],
                clinical_decision_points=g.clinical_decision_points or [],
                clinical_decision_points_chichewa=g.clinical_decision_points_chichewa or [],
                illustration_url=g.illustration_url,
                audio_url=g.audio_url,
                video_url=g.video_url,
                source=g.source,
                last_reviewed=str(g.last_reviewed) if g.last_reviewed else None,
            ).model_dump()
            for g in guides
        ]
    }


@router.post("/guides")
async def create_guide(
    body: SelfCareGuideCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    guide = SelfCareGuide(
        guide_id=str(uuid.uuid4()),
        title=body.title,
        title_chichewa=body.title_chichewa,
        category=body.category,
        audience=body.audience,
        severity=body.severity,
        what_it_is=body.what_it_is,
        what_it_is_chichewa=body.what_it_is_chichewa,
        what_to_do_now=body.what_to_do_now,
        what_to_do_now_chichewa=body.what_to_do_now_chichewa,
        what_not_to_do=body.what_not_to_do,
        what_not_to_do_chichewa=body.what_not_to_do_chichewa,
        when_to_seek_help=body.when_to_seek_help,
        when_to_seek_help_chichewa=body.when_to_seek_help_chichewa,
        prevention=body.prevention,
        prevention_chichewa=body.prevention_chichewa,
        treatment_limitations=body.treatment_limitations,
        treatment_limitations_chichewa=body.treatment_limitations_chichewa,
        clinical_decision_points=body.clinical_decision_points,
        clinical_decision_points_chichewa=body.clinical_decision_points_chichewa,
        source=body.source,
        last_reviewed=datetime.now(timezone.utc),
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(guide)
    await db.flush()
    return {"guide_id": guide.guide_id, "status": "created"}


@router.get("/guides/{guide_id}")
async def get_guide(
    guide_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor", "chw")),
):
    result = await db.execute(select(SelfCareGuide).where(SelfCareGuide.guide_id == guide_id))
    guide = result.scalar_one_or_none()
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")

    return SelfCareGuideResponse(
        guide_id=guide.guide_id,
        title=guide.title,
        title_chichewa=guide.title_chichewa,
        category=guide.category,
        audience=guide.audience,
        severity=guide.severity,
        what_it_is=guide.what_it_is,
        what_it_is_chichewa=guide.what_it_is_chichewa,
        what_to_do_now=guide.what_to_do_now or [],
        what_to_do_now_chichewa=guide.what_to_do_now_chichewa or [],
        what_not_to_do=guide.what_not_to_do or [],
        what_not_to_do_chichewa=guide.what_not_to_do_chichewa or [],
        when_to_seek_help=guide.when_to_seek_help,
        when_to_seek_help_chichewa=guide.when_to_seek_help_chichewa,
        prevention=guide.prevention or [],
        prevention_chichewa=guide.prevention_chichewa or [],
        treatment_limitations=guide.treatment_limitations or [],
        treatment_limitations_chichewa=guide.treatment_limitations_chichewa or [],
        clinical_decision_points=guide.clinical_decision_points or [],
        clinical_decision_points_chichewa=guide.clinical_decision_points_chichewa or [],
        illustration_url=guide.illustration_url,
        audio_url=guide.audio_url,
        video_url=guide.video_url,
        source=guide.source,
        last_reviewed=str(guide.last_reviewed) if guide.last_reviewed else None,
    ).model_dump()


# ── Community Health Talks ────────────────────────────────────


@router.get("/talks")
async def list_talks(
    health_topic: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor", "chw")),
):
    query = select(CommunityHealthTalk)
    if health_topic:
        query = query.where(CommunityHealthTalk.health_topic == health_topic)
    query = query.order_by(CommunityHealthTalk.created_at.desc())

    result = await db.execute(query)
    talks = result.scalars().all()

    return {
        "talks": [
            HealthTalkResponse(
                talk_id=t.talk_id,
                title=t.title,
                title_chichewa=t.title_chichewa,
                study_id=t.study_id,
                duration_minutes=t.duration_minutes or 15,
                talking_points=t.talking_points or [],
                talking_points_chichewa=t.talking_points_chichewa or [],
                discussion_questions=t.discussion_questions or [],
                pledge_card_text=t.pledge_card_text,
                pledge_card_text_chichewa=t.pledge_card_text_chichewa,
                health_topic=t.health_topic,
                status=t.status,
            ).model_dump()
            for t in talks
        ]
    }


@router.post("/talks")
async def create_talk(
    body: HealthTalkCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    talk = CommunityHealthTalk(
        talk_id=str(uuid.uuid4()),
        title=body.title,
        title_chichewa=body.title_chichewa,
        study_id=body.study_id,
        duration_minutes=body.duration_minutes,
        talking_points=body.talking_points,
        talking_points_chichewa=body.talking_points_chichewa,
        discussion_questions=body.discussion_questions,
        pledge_card_text=body.pledge_card_text,
        pledge_card_text_chichewa=body.pledge_card_text_chichewa,
        health_topic=body.health_topic,
        audience=body.audience,
        status="draft",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(talk)
    await db.flush()
    return {"talk_id": talk.talk_id, "status": "created"}


# ── Dashboard Summary ─────────────────────────────────────────


@router.get("/summary")
async def get_samala_summary(
    district_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    studies_result = await db.execute(select(ResearchStudy))
    studies = studies_result.scalars().all()
    studies_by_status: dict[str, int] = {}
    for s in studies:
        studies_by_status[s.status] = studies_by_status.get(s.status, 0) + 1

    assets_result = await db.execute(select(KnowledgeAsset))
    assets = assets_result.scalars().all()
    assets_by_type: dict[str, int] = {}
    topic_coverage: dict[str, int] = {}
    for a in assets:
        assets_by_type[a.asset_type] = assets_by_type.get(a.asset_type, 0) + 1
        topic_coverage[a.health_topic] = topic_coverage.get(a.health_topic, 0) + 1

    dep_query = select(KnowledgeDeployment)
    if district_id:
        dep_query = dep_query.where(KnowledgeDeployment.district_id == district_id)
    deps_result = await db.execute(dep_query)
    deployments = deps_result.scalars().all()

    total_households = sum(d.households_reached or 0 for d in deployments)
    knowledge_scores = [
        (d.knowledge_post_score - d.knowledge_pre_score)
        for d in deployments
        if d.knowledge_post_score is not None and d.knowledge_pre_score is not None
    ]
    avg_change = sum(knowledge_scores) / len(knowledge_scores) if knowledge_scores else None

    return SAMALASummary(
        total_studies=len(studies),
        studies_by_status=studies_by_status,
        total_assets=len(assets),
        assets_by_type=assets_by_type,
        total_deployments=len(deployments),
        households_reached=total_households,
        avg_knowledge_change=avg_change,
        topic_coverage=topic_coverage,
        total_referrals=sum(d.referrals_made or 0 for d in deployments),
    ).model_dump()


# ── Mental Health Referrals ────────────────────────────────────


@router.get("/referrals")
async def list_referrals(
    status: str | None = None,
    district: str | None = None,
    chw_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor", "chw")),
):
    query = select(MentalHealthReferral)
    if status:
        query = query.where(MentalHealthReferral.status == status)
    if district:
        query = query.where(MentalHealthReferral.district == district)
    if chw_id:
        query = query.where(MentalHealthReferral.chw_id == chw_id)
    query = query.order_by(MentalHealthReferral.created_at.desc())

    result = await db.execute(query)
    referrals = result.scalars().all()

    return {
        "referrals": [
            MentalHealthReferralResponse(
                referral_id=r.referral_id,
                study_id=r.study_id,
                asset_id=r.asset_id,
                deployment_id=r.deployment_id,
                individual_name=r.individual_name,
                age=r.age,
                sex=r.sex,
                village_name=r.village_name,
                ta_name=r.ta_name,
                district=r.district,
                risk_factors=r.risk_factors or [],
                trigger_event=r.trigger_event,
                presenting_concern=r.presenting_concern,
                referred_to=r.referred_to,
                referral_date=str(r.referral_date) if r.referral_date else None,
                follow_up_date=str(r.follow_up_date) if r.follow_up_date else None,
                outcome=r.outcome,
                status=r.status,
                chw_id=r.chw_id,
                created_at=str(r.created_at) if r.created_at else None,
            ).model_dump()
            for r in referrals
        ]
    }


@router.post("/referrals")
async def create_referral(
    body: MentalHealthReferralCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("chw", "supervisor", "dho")),
):
    referral = MentalHealthReferral(
        referral_id=str(uuid.uuid4()),
        study_id=body.study_id,
        asset_id=body.asset_id,
        deployment_id=body.deployment_id,
        individual_name=body.individual_name,
        age=body.age,
        sex=body.sex,
        village_name=body.village_name,
        ta_name=body.ta_name,
        district=body.district,
        risk_factors=body.risk_factors,
        trigger_event=body.trigger_event,
        presenting_concern=body.presenting_concern,
        referred_to=body.referred_to,
        referral_date=datetime.now(timezone.utc),
        chw_id=body.chw_id,
        notes=body.notes,
        status="identified",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(referral)
    await db.flush()
    return {"referral_id": referral.referral_id, "status": "created"}


@router.patch("/referrals/{referral_id}")
async def update_referral(
    referral_id: str,
    status: str | None = None,
    outcome: str | None = None,
    follow_up_date: str | None = None,
    notes: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("chw", "supervisor", "dho")),
):
    result = await db.execute(
        select(MentalHealthReferral).where(MentalHealthReferral.referral_id == referral_id)
    )
    referral = result.scalar_one_or_none()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")

    if status:
        referral.status = status
    if outcome:
        referral.outcome = outcome
    if follow_up_date:
        referral.follow_up_date = datetime.fromisoformat(follow_up_date)
    if notes:
        referral.notes = notes
    referral.updated_at = datetime.now(timezone.utc)

    return {"status": "updated", "referral_id": referral_id}


# ── Knowledge Topics (Aggregated) ────────────────────────────


@router.get("/topics")
async def list_topics(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor", "chw")),
):
    studies_result = await db.execute(select(ResearchStudy))
    assets_result = await db.execute(select(KnowledgeAsset))
    guides_result = await db.execute(select(SelfCareGuide).where(SelfCareGuide.is_active == True))  # noqa: E712
    talks_result = await db.execute(select(CommunityHealthTalk))
    deps_result = await db.execute(select(KnowledgeDeployment))

    studies = studies_result.scalars().all()
    assets = assets_result.scalars().all()
    guides = guides_result.scalars().all()
    talks = talks_result.scalars().all()
    deployments = deps_result.scalars().all()

    dep_by_asset: dict[str, int] = defaultdict(int)
    dep_by_topic: dict[str, int] = defaultdict(int)
    households_by_topic: dict[str, int] = defaultdict(int)
    for d in deployments:
        dep_by_asset[d.asset_id] += 1
        dep_by_topic[d.delivery_method] += 1
        households_by_topic[d.delivery_method] += d.households_reached or 0

    asset_by_topic: dict[str, list] = defaultdict(list)
    for a in assets:
        asset_by_topic[a.health_topic].append(a)

    topics = {}
    all_topics = {s.health_topic for s in studies} | {a.health_topic for a in assets}
    for topic in sorted(all_topics):
        topic_studies = [s for s in studies if s.health_topic == topic]
        topic_assets = asset_by_topic.get(topic, [])
        topic_guides = [g for g in guides if g.category == topic]
        topic_talks = [t for t in talks if t.health_topic == topic]
        topic_deps = [d for d in deployments if any(a.health_topic == topic for a in topic_assets if a.asset_id == d.asset_id)]

        topics[topic] = {
            "health_topic": topic,
            "study_count": len(topic_studies),
            "asset_count": len(topic_assets),
            "asset_types": {},
            "guide_count": len(topic_guides),
            "talk_count": len(topic_talks),
            "deployment_count": len(topic_deps),
            "households_reached": sum(d.households_reached or 0 for d in topic_deps),
        }
        for a in topic_assets:
            topics[topic]["asset_types"][a.asset_type] = topics[topic]["asset_types"].get(a.asset_type, 0) + 1

    return {"topics": list(topics.values())}


# ── Contextual Assets for Household ──────────────────────────


@router.get("/for-household/{household_id}")
async def assets_for_household(
    household_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("chw", "supervisor", "dho")),
):
    result = await db.execute(select(Household).where(Household.household_id == household_id))
    household = result.scalar_one_or_none()
    if not household:
        raise HTTPException(status_code=404, detail="Household not found")

    assets_result = await db.execute(
        select(KnowledgeAsset).where(KnowledgeAsset.status.in_(["approved", "deployed"]))
    )
    all_assets = assets_result.scalars().all()

    guides_result = await db.execute(
        select(SelfCareGuide).where(SelfCareGuide.is_active == True)  # noqa: E712
    )
    all_guides = guides_result.scalars().all()

    topic_hints = set()
    topic_hints.add("malaria")
    if (household.household_size or 0) > 4:
        topic_hints.add("nutrition")
    if (household.food_security_score or 5) <= 2:
        topic_hints.add("nutrition")

    matched_assets = []
    for asset in all_assets:
        score = 0
        if asset.health_topic in topic_hints:
            score += 2
        if asset.health_topic == "malaria":
            score += 1
        if asset.health_topic == "nutrition":
            score += 1
        if asset.severity == "emergency":
            score += 1
        if score > 0:
            matched_assets.append({
                "asset": KnowledgeAssetResponse(
                    asset_id=asset.asset_id,
                    study_id=asset.study_id,
                    title=asset.title,
                    title_chichewa=asset.title_chichewa,
                    key_finding=asset.key_finding,
                    key_finding_chichewa=asset.key_finding_chichewa,
                    actionable_takeaways=asset.actionable_takeaways or [],
                    actionable_takeaways_chichewa=asset.actionable_takeaways_chichewa or [],
                    evidence_refs=asset.evidence_refs or [],
                    asset_type=asset.asset_type,
                    health_topic=asset.health_topic,
                    audience=asset.audience,
                    severity=asset.severity,
                    media_url=asset.media_url,
                    audio_url=asset.audio_url,
                    poster_url=asset.poster_url,
                    confidence_level=asset.confidence_level,
                    status=asset.status,
                    synthesized_at=str(asset.synthesized_at) if asset.synthesized_at else None,
                ).model_dump(),
                "relevance_score": score,
            })

    matched_assets.sort(key=lambda x: x["relevance_score"], reverse=True)

    matched_guides = []
    for guide in all_guides:
        if guide.category in topic_hints:
            matched_guides.append(SelfCareGuideResponse(
                guide_id=guide.guide_id,
                title=guide.title,
                title_chichewa=guide.title_chichewa,
                category=guide.category,
                audience=guide.audience,
                severity=guide.severity,
                what_it_is=guide.what_it_is,
                what_it_is_chichewa=guide.what_it_is_chichewa,
                what_to_do_now=guide.what_to_do_now or [],
                what_to_do_now_chichewa=guide.what_to_do_now_chichewa or [],
                what_not_to_do=guide.what_not_to_do or [],
                what_not_to_do_chichewa=guide.what_not_to_do_chichewa or [],
                when_to_seek_help=guide.when_to_seek_help,
                when_to_seek_help_chichewa=guide.when_to_seek_help_chichewa,
                prevention=guide.prevention or [],
                prevention_chichewa=guide.prevention_chichewa or [],
                treatment_limitations=guide.treatment_limitations or [],
                treatment_limitations_chichewa=guide.treatment_limitations_chichewa or [],
                clinical_decision_points=guide.clinical_decision_points or [],
                clinical_decision_points_chichewa=guide.clinical_decision_points_chichewa or [],
                illustration_url=guide.illustration_url,
                audio_url=guide.audio_url,
                video_url=guide.video_url,
                source=guide.source,
                last_reviewed=str(guide.last_reviewed) if guide.last_reviewed else None,
            ).model_dump())

    return {
        "household_id": household_id,
        "matched_assets": [m["asset"] for m in matched_assets[:10]],
        "matched_guides": matched_guides,
        "topic_hints": sorted(topic_hints),
    }


# ── Deployment Heatmap ───────────────────────────────────────


@router.get("/deployments/heatmap")
async def deployment_heatmap(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor")),
):
    result = await db.execute(select(KnowledgeDeployment))
    deployments = result.scalars().all()

    by_district: dict[str, dict] = defaultdict(lambda: {
        "district_id": "",
        "district_name": "",
        "deployment_count": 0,
        "households_reached": 0,
        "individuals_reached": 0,
        "delivery_methods": defaultdict(int),
    })

    for d in deployments:
        key = d.district_id or "unknown"
        cell = by_district[key]
        cell["district_id"] = key
        cell["deployment_count"] += 1
        cell["households_reached"] += d.households_reached or 0
        cell["individuals_reached"] += d.individuals_reached or 0
        cell["delivery_methods"][d.delivery_method] += 1

    cells = []
    for cell in by_district.values():
        cell["delivery_methods"] = dict(cell["delivery_methods"])
        cells.append(cell)

    return {
        "cells": cells,
        "total_deployments": len(deployments),
        "total_households_reached": sum(d.households_reached or 0 for d in deployments),
    }


# ── Impact Trajectory ────────────────────────────────────────


@router.get("/impact/trajectory")
async def impact_trajectory(
    district_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor")),
):
    query = select(KnowledgeDeployment).where(
        KnowledgeDeployment.knowledge_pre_score.isnot(None),
        KnowledgeDeployment.knowledge_post_score.isnot(None),
    )
    if district_id:
        query = query.where(KnowledgeDeployment.district_id == district_id)
    query = query.order_by(KnowledgeDeployment.deployed_at)

    result = await db.execute(query)
    deployments = result.scalars().all()

    trajectory = []
    for d in deployments:
        trajectory.append({
            "deployment_id": d.deployment_id,
            "asset_id": d.asset_id,
            "deployed_at": str(d.deployed_at) if d.deployed_at else None,
            "pre_score": d.knowledge_pre_score,
            "post_score": d.knowledge_post_score,
            "delta": round((d.knowledge_post_score or 0) - (d.knowledge_pre_score or 0), 2),
            "behavior_change_score": d.behavior_change_score,
            "district_id": d.district_id,
            "delivery_method": d.delivery_method,
        })

    scores = [t["delta"] for t in trajectory]
    avg_delta = sum(scores) / len(scores) if scores else 0

    return {
        "trajectory": trajectory,
        "avg_knowledge_change": round(avg_delta, 2),
        "total_assessments": len(trajectory),
    }


# ── Pipeline (Study → Asset → Deployment) ────────────────────


@router.get("/pipeline")
async def pipeline_view(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor")),
):
    studies_result = await db.execute(select(ResearchStudy))
    assets_result = await db.execute(select(KnowledgeAsset))
    deps_result = await db.execute(select(KnowledgeDeployment))

    studies = studies_result.scalars().all()
    assets = assets_result.scalars().all()
    deployments = deps_result.scalars().all()

    study_by_id = {s.study_id: s for s in studies}
    assets_by_study: dict[str, list] = defaultdict(list)
    for a in assets:
        if a.study_id:
            assets_by_study[a.study_id].append(a)

    deps_by_asset: dict[str, list] = defaultdict(list)
    for d in deployments:
        deps_by_asset[d.asset_id].append(d)

    nodes = []
    links = []

    for s in studies:
        nodes.append({
            "id": s.study_id,
            "label": s.title[:60],
            "type": "study",
            "status": s.status,
            "topic": s.health_topic,
        })
        for a in assets_by_study.get(s.study_id, []):
            links.append({"source": s.study_id, "target": a.asset_id, "value": 1})

    for a in assets:
        nodes.append({
            "id": a.asset_id,
            "label": a.title[:60],
            "type": "asset",
            "asset_type": a.asset_type,
            "topic": a.health_topic,
            "status": a.status,
        })
        deps = deps_by_asset.get(a.asset_id, [])
        if deps:
            total_households = sum(d.households_reached or 0 for d in deps)
            links.append({
                "source": a.asset_id,
                "target": f"deployed-{a.asset_id}",
                "value": len(deps),
            })
            nodes.append({
                "id": f"deployed-{a.asset_id}",
                "label": f"{len(deps)} deployments ({total_households} HH)",
                "type": "deployment",
                "topic": a.health_topic,
            })

    return {
        "nodes": nodes,
        "links": links,
        "summary": {
            "total_studies": len(studies),
            "total_assets": len(assets),
            "total_deployments": len(deployments),
        },
    }


# ── Talk Print Kit (JSON for client PDF) ─────────────────────


@router.get("/talks/{talk_id}/print-kit")
async def talk_print_kit(
    talk_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor", "chw")),
):
    result = await db.execute(select(CommunityHealthTalk).where(CommunityHealthTalk.talk_id == talk_id))
    talk = result.scalar_one_or_none()
    if not talk:
        raise HTTPException(status_code=404, detail="Talk not found")

    study = None
    if talk.study_id:
        s = await db.execute(select(ResearchStudy).where(ResearchStudy.study_id == talk.study_id))
        study = s.scalar_one_or_none()

    return {
        "title": talk.title,
        "title_chichewa": talk.title_chichewa,
        "topic": talk.health_topic,
        "duration_minutes": talk.duration_minutes,
        "source_study": {
            "title": study.title if study else None,
            "authors": study.authors if study else [],
            "journal": study.journal if study else None,
        } if study else None,
        "talking_points": talk.talking_points or [],
        "talking_points_chichewa": talk.talking_points_chichewa or [],
        "discussion_questions": talk.discussion_questions or [],
        "pledge_card_text": talk.pledge_card_text,
        "pledge_card_text_chichewa": talk.pledge_card_text_chichewa,
    }


# ── Guide Poster Data (JSON for client PDF) ──────────────────


@router.get("/guides/{guide_id}/poster-data")
async def guide_poster_data(
    guide_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor", "chw")),
):
    result = await db.execute(select(SelfCareGuide).where(SelfCareGuide.guide_id == guide_id))
    guide = result.scalar_one_or_none()
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")

    return {
        "title": guide.title,
        "title_chichewa": guide.title_chichewa,
        "category": guide.category,
        "severity": guide.severity,
        "what_it_is": guide.what_it_is,
        "what_it_is_chichewa": guide.what_it_is_chichewa,
        "what_to_do_now": guide.what_to_do_now or [],
        "what_to_do_now_chichewa": guide.what_to_do_now_chichewa or [],
        "what_not_to_do": guide.what_not_to_do or [],
        "what_not_to_do_chichewa": guide.what_not_to_do_chichewa or [],
        "when_to_seek_help": guide.when_to_seek_help,
        "when_to_seek_help_chichewa": guide.when_to_seek_help_chichewa,
        "prevention": guide.prevention or [],
        "prevention_chichewa": guide.prevention_chichewa or [],
    }


# ── Talk Flipbook Data (JSON for client PDF) ─────────────────


@router.get("/talks/{talk_id}/flipbook-data")
async def talk_flipbook_data(
    talk_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp", "supervisor", "chw")),
):
    result = await db.execute(select(CommunityHealthTalk).where(CommunityHealthTalk.talk_id == talk_id))
    talk = result.scalar_one_or_none()
    if not talk:
        raise HTTPException(status_code=404, detail="Talk not found")

    pages = []
    talking_points = talk.talking_points or []
    talking_points_chichewa = talk.talking_points_chichewa or []
    for i, tp in enumerate(talking_points):
        pages.append({
            "page_number": i + 1,
            "type": "talking_point",
            "content_en": tp,
            "content_ny": talking_points_chichewa[i] if i < len(talking_points_chichewa) else "",
        })

    questions = talk.discussion_questions or []
    for i, q in enumerate(questions):
        pages.append({
            "page_number": len(talking_points) + i + 1,
            "type": "discussion_question",
            "content_en": q,
            "content_ny": q,
        })

    if talk.pledge_card_text:
        pages.append({
            "page_number": len(pages) + 1,
            "type": "pledge_card",
            "content_en": talk.pledge_card_text,
            "content_ny": talk.pledge_card_text_chichewa or "",
        })

    return {
        "title": talk.title,
        "title_chichewa": talk.title_chichewa,
        "topic": talk.health_topic,
        "total_pages": len(pages),
        "pages": pages,
    }


# ── SMS Health Tips Schedule ─────────────────────────────────


@router.post("/sms/schedule")
async def schedule_sms_tips(
    health_topic: str | None = None,
    district_id: str | None = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    query = select(KnowledgeAsset).where(
        KnowledgeAsset.status.in_(["approved", "deployed"]),
    )
    if health_topic:
        query = query.where(KnowledgeAsset.health_topic == health_topic)

    result = await db.execute(query)
    assets = result.scalars().all()

    sms_assets = []
    for asset in assets:
        takeaways = asset.actionable_takeaways or []
        if takeaways:
            sms_assets.append({
                "asset_id": asset.asset_id,
                "topic": asset.health_topic,
                "message_en": f"ZISAMALE {asset.health_topic.upper()}: {takeaways[0]}",
                "message_ny": f"ZISAMALE {asset.health_topic.upper()}: {(asset.actionable_takeaways_chichewa or takeaways)[0]}",
            })

    return {
        "scheduled": len(sms_assets),
        "tips": sms_assets[:30],
        "note": "SMS tips ready for Africa's Talking batch send",
    }


# ── Monthly Knowledge Brief ──────────────────────────────────


@router.get("/monthly-brief")
async def monthly_brief(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):
    studies_result = await db.execute(select(ResearchStudy))
    assets_result = await db.execute(select(KnowledgeAsset))
    guides_result = await db.execute(select(SelfCareGuide).where(SelfCareGuide.is_active == True))  # noqa: E712
    talks_result = await db.execute(select(CommunityHealthTalk))
    deps_result = await db.execute(select(KnowledgeDeployment))

    studies = studies_result.scalars().all()
    assets = assets_result.scalars().all()
    guides = guides_result.scalars().all()
    talks = talks_result.scalars().all()
    deployments = deps_result.scalars().all()

    topic_counts: dict[str, int] = defaultdict(int)
    for a in assets:
        topic_counts[a.health_topic] += 1

    total_hh = sum(d.households_reached or 0 for d in deployments)
    total_ind = sum(d.individuals_reached or 0 for d in deployments)
    scores = [
        (d.knowledge_post_score or 0) - (d.knowledge_pre_score or 0)
        for d in deployments
        if d.knowledge_post_score is not None and d.knowledge_pre_score is not None
    ]
    avg_change = sum(scores) / len(scores) if scores else 0

    return {
        "period": datetime.now(timezone.utc).strftime("%B %Y"),
        "pipeline": {
            "studies_total": len(studies),
            "studies_deployed": sum(1 for s in studies if s.status == "deployed"),
            "assets_total": len(assets),
            "guides_total": len(guides),
            "talks_total": len(talks),
        },
        "reach": {
            "deployments": len(deployments),
            "households_reached": total_hh,
            "individuals_reached": total_ind,
        },
        "impact": {
            "avg_knowledge_change": round(avg_change, 2),
            "assessments_count": len(scores),
        },
        "topic_coverage": dict(topic_counts),
        "top_topics": sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)[:5],
    }


# ── Monthly Brief Email Delivery ─────────────────────────────


class BriefEmailRequest(BaseModel):
    recipients: list[str]


@router.post("/monthly-brief/email")
async def email_monthly_brief(
    body: BriefEmailRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("dho", "phim", "mohp")),
):

    studies_result = await db.execute(select(ResearchStudy))
    assets_result = await db.execute(select(KnowledgeAsset))
    guides_result = await db.execute(select(SelfCareGuide).where(SelfCareGuide.is_active == True))  # noqa: E712
    talks_result = await db.execute(select(CommunityHealthTalk))
    deps_result = await db.execute(select(KnowledgeDeployment))

    studies = studies_result.scalars().all()
    assets = assets_result.scalars().all()
    guides = guides_result.scalars().all()
    talks = talks_result.scalars().all()
    deployments = deps_result.scalars().all()

    topic_counts: dict[str, int] = defaultdict(int)
    for a in assets:
        topic_counts[a.health_topic] += 1

    total_hh = sum(d.households_reached or 0 for d in deployments)
    total_ind = sum(d.individuals_reached or 0 for d in deployments)
    scores = [
        (d.knowledge_post_score or 0) - (d.knowledge_pre_score or 0)
        for d in deployments
        if d.knowledge_post_score is not None and d.knowledge_pre_score is not None
    ]
    avg_change = sum(scores) / len(scores) if scores else 0

    period = datetime.now(timezone.utc).strftime("%B %Y")

    topic_lines = "\n".join(
        f"  - {t}: {c} assets" for t, c in sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    )

    html_body = f"""
    <html><body style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; border-bottom: 2px solid #1B4332; padding-bottom: 16px; margin-bottom: 20px;">
        <h1 style="color: #1B4332; margin: 0;">SAMALA-AI Monthly Knowledge Brief</h1>
        <p style="color: #78716C; margin: 4px 0 0;">{period}</p>
    </div>

    <div style="display: flex; gap: 16px; margin-bottom: 20px;">
        <div style="flex: 1; text-align: center; background: #F5F2EB; padding: 12px; border-radius: 4px;">
            <div style="font-size: 24px; font-weight: bold; color: #1B4332;">{len(studies)}</div>
            <div style="font-size: 12px; color: #78716C;">Research Studies</div>
        </div>
        <div style="flex: 1; text-align: center; background: #F5F2EB; padding: 12px; border-radius: 4px;">
            <div style="font-size: 24px; font-weight: bold; color: #B45309;">{len(assets)}</div>
            <div style="font-size: 12px; color: #78716C;">Knowledge Assets</div>
        </div>
        <div style="flex: 1; text-align: center; background: #F5F2EB; padding: 12px; border-radius: 4px;">
            <div style="font-size: 24px; font-weight: bold; color: #16A34A;">{total_hh}</div>
            <div style="font-size: 12px; color: #78716C;">Households Reached</div>
        </div>
    </div>

    <h2 style="color: #1B4332; font-size: 16px;">Pipeline Status</h2>
    <ul style="color: #57534E; font-size: 14px; line-height: 1.8;">
        <li>Studies deployed: <strong>{sum(1 for s in studies if s.status == "deployed")}</strong> / {len(studies)}</li>
        <li>Self-care guides: <strong>{len(guides)}</strong></li>
        <li>Community health talks: <strong>{len(talks)}</strong></li>
        <li>Total deployments: <strong>{len(deployments)}</strong></li>
        <li>Individuals reached: <strong>{total_ind}</strong></li>
    </ul>

    <h2 style="color: #1B4332; font-size: 16px;">Impact</h2>
    <p style="color: #57534E; font-size: 14px;">
        Average knowledge change: <strong style="color: #16A34A;">{avg_change:+.2f}</strong>
        across {len(scores)} assessments
    </p>

    <h2 style="color: #1B4332; font-size: 16px;">Topic Coverage</h2>
    <pre style="color: #57534E; font-size: 13px; background: #F5F2EB; padding: 12px; border-radius: 4px;">{topic_lines}</pre>

    <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #D6D3CD; color: #A8A29E; font-size: 11px;">
        Generated by Zisamale SAMALA-AI | {datetime.now(timezone.utc).strftime("%Y-%m-%d")}
    </div>
    </body></html>
    """

    text_body = f"""
SAMALA-AI Monthly Knowledge Brief — {period}

Pipeline:
  Studies: {len(studies)} ({sum(1 for s in studies if s.status == "deployed")} deployed)
  Assets: {len(assets)}
  Guides: {len(guides)}
  Talks: {len(talks)}
  Deployments: {len(deployments)}
  Households reached: {total_hh}
  Individuals reached: {total_ind}

Impact:
  Avg knowledge change: {avg_change:+.2f} ({len(scores)} assessments)

Topic Coverage:
{topic_lines}

— Zisamale SAMALA-AI
"""

    sent = 0
    failed = 0

    if settings.smtp_host:
        def _send_email(msg: EmailMessage) -> None:
            if settings.smtp_use_tls:
                with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
                    server.starttls()
                    if settings.smtp_username:
                        server.login(settings.smtp_username, settings.smtp_password)
                    server.send_message(msg)
            else:
                with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
                    if settings.smtp_username:
                        server.login(settings.smtp_username, settings.smtp_password)
                    server.send_message(msg)

        for recipient in body.recipients:
            try:
                msg = EmailMessage()
                msg["Subject"] = f"SAMALA-AI Monthly Knowledge Brief — {period}"
                msg["From"] = settings.smtp_from_addr
                msg["To"] = recipient
                msg.set_content(text_body)
                msg.add_alternative(html_body, subtype="html")

                await asyncio.to_thread(_send_email, msg)
                sent += 1
            except Exception as e:
                import logging
                logging.warning("brief.email_failed", extra={"recipient": recipient, "error": str(e)})
                failed += 1
    else:
        failed = len(body.recipients)

    return {
        "period": period,
        "recipients": len(body.recipients),
        "sent": sent,
        "failed": failed,
        "note": "Configure SMTP_HOST in environment to enable email delivery" if failed else "Emails sent",
    }


# ── Monthly Brief Cron Dispatch ──────────────────────────────


@router.post("/monthly-brief/cron-dispatch")
async def cron_dispatch_monthly_brief(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("mohp")),
):
    settings_object = settings
    from app.models.user import User

    users_result = await db.execute(
        select(User).where(User.role.in_(["dho", "phim", "mohp"]))
    )
    recipients = [u.username for u in users_result.scalars().all() if u.username]

    if not recipients:
        return {"period": datetime.now(timezone.utc).strftime("%B %Y"), "sent": 0, "note": "No DHO/PHIM/MoHP users found"}

    studies_result = await db.execute(select(ResearchStudy))
    assets_result = await db.execute(select(KnowledgeAsset))
    guides_result = await db.execute(select(SelfCareGuide).where(SelfCareGuide.is_active == True))  # noqa: E712
    talks_result = await db.execute(select(CommunityHealthTalk))
    deps_result = await db.execute(select(KnowledgeDeployment))

    studies = studies_result.scalars().all()
    assets = assets_result.scalars().all()
    guides = guides_result.scalars().all()
    talks = talks_result.scalars().all()
    deployments = deps_result.scalars().all()

    topic_counts: dict[str, int] = defaultdict(int)
    for a in assets:
        topic_counts[a.health_topic] += 1

    total_hh = sum(d.households_reached or 0 for d in deployments)
    total_ind = sum(d.individuals_reached or 0 for d in deployments)
    scores = [
        (d.knowledge_post_score or 0) - (d.knowledge_pre_score or 0)
        for d in deployments
        if d.knowledge_post_score is not None and d.knowledge_pre_score is not None
    ]
    avg_change = sum(scores) / len(scores) if scores else 0

    period = datetime.now(timezone.utc).strftime("%B %Y")
    topic_lines = "\n".join(
        f"  - {t}: {c} assets" for t, c in sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    )

    html_body = f"""
    <html><body style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; border-bottom: 2px solid #1B4332; padding-bottom: 16px; margin-bottom: 20px;">
        <h1 style="color: #1B4332; margin: 0;">SAMALA-AI Monthly Knowledge Brief</h1>
        <p style="color: #78716C; margin: 4px 0 0;">{period}</p>
    </div>
    <div style="display: flex; gap: 16px; margin-bottom: 20px;">
        <div style="flex: 1; text-align: center; background: #F5F2EB; padding: 12px; border-radius: 4px;">
            <div style="font-size: 24px; font-weight: bold; color: #1B4332;">{len(studies)}</div>
            <div style="font-size: 12px; color: #78716C;">Research Studies</div>
        </div>
        <div style="flex: 1; text-align: center; background: #F5F2EB; padding: 12px; border-radius: 4px;">
            <div style="font-size: 24px; font-weight: bold; color: #B45309;">{len(assets)}</div>
            <div style="font-size: 12px; color: #78716C;">Knowledge Assets</div>
        </div>
        <div style="flex: 1; text-align: center; background: #F5F2EB; padding: 12px; border-radius: 4px;">
            <div style="font-size: 24px; font-weight: bold; color: #16A34A;">{total_hh}</div>
            <div style="font-size: 12px; color: #78716C;">Households Reached</div>
        </div>
    </div>
    <h2 style="color: #1B4332; font-size: 16px;">Pipeline Status</h2>
    <ul style="color: #57534E; font-size: 14px; line-height: 1.8;">
        <li>Studies deployed: <strong>{sum(1 for s in studies if s.status == "deployed")}</strong> / {len(studies)}</li>
        <li>Self-care guides: <strong>{len(guides)}</strong></li>
        <li>Community health talks: <strong>{len(talks)}</strong></li>
        <li>Total deployments: <strong>{len(deployments)}</strong></li>
        <li>Individuals reached: <strong>{total_ind}</strong></li>
    </ul>
    <h2 style="color: #1B4332; font-size: 16px;">Impact</h2>
    <p style="color: #57534E; font-size: 14px;">
        Average knowledge change: <strong style="color: #16A34A;">{avg_change:+.2f}</strong>
        across {len(scores)} assessments
    </p>
    <h2 style="color: #1B4332; font-size: 16px;">Topic Coverage</h2>
    <pre style="color: #57534E; font-size: 13px; background: #F5F2EB; padding: 12px; border-radius: 4px;">{topic_lines}</pre>
    <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #D6D3CD; color: #A8A29E; font-size: 11px;">
        Generated by Zisamale SAMALA-AI | {datetime.now(timezone.utc).strftime("%Y-%m-%d")}
    </div>
    </body></html>
    """

    sent = 0
    failed = 0

    if settings_object.smtp_host:
        for recipient in recipients:
            try:
                msg = EmailMessage()
                msg["Subject"] = f"SAMALA-AI Monthly Knowledge Brief — {period}"
                msg["From"] = settings_object.smtp_from_addr
                msg["To"] = recipient
                msg.set_content(f"SAMALA-AI Monthly Knowledge Brief — {period}\n\nStudies: {len(studies)} | Assets: {len(assets)} | Deployments: {len(deployments)}\nHouseholds reached: {total_hh} | Individuals reached: {total_ind}\nAvg knowledge change: {avg_change:+.2f}\n\n— Zisamale SAMALA-AI")
                msg.add_alternative(html_body, subtype="html")

                if settings_object.smtp_use_tls:
                    with smtplib.SMTP(settings_object.smtp_host, settings_object.smtp_port, timeout=20) as server:
                        server.starttls()
                        if settings_object.smtp_username:
                            server.login(settings_object.smtp_username, settings_object.smtp_password)
                        server.send_message(msg)
                else:
                    with smtplib.SMTP(settings_object.smtp_host, settings_object.smtp_port, timeout=20) as server:
                        if settings_object.smtp_username:
                            server.login(settings_object.smtp_username, settings_object.smtp_password)
                        server.send_message(msg)
                sent += 1
            except Exception:
                failed += 1
    else:
        failed = len(recipients)

    return {
        "period": period,
        "recipients": len(recipients),
        "sent": sent,
        "failed": failed,
        "note": "Configure SMTP_HOST in environment to enable email delivery" if failed else "Monthly brief emailed to all DHO/PHIM/MoHP users",
    }
