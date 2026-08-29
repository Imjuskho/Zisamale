-- Zisamale Core Schema
-- All tables use UUID primary keys and soft deletes

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE alert_level AS ENUM ('green', 'yellow', 'red');
CREATE TYPE referral_status AS ENUM ('pending', 'in_transit', 'completed', 'lost_to_followup');
CREATE TYPE referral_urgency AS ENUM ('routine', 'urgent', 'emergency');
CREATE TYPE sync_status AS ENUM ('pending', 'synced', 'conflict', 'failed');
CREATE TYPE response_status AS ENUM ('pending', 'acknowledged', 'in_progress', 'resolved');
CREATE TYPE user_role AS ENUM ('chw', 'supervisor', 'dho', 'phim', 'mohp');
CREATE TYPE sex AS ENUM ('male', 'female', 'other');
CREATE TYPE iccm_category AS ENUM ('uncomplicated', 'severe', 'referral');

-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    district_id UUID,
    facility_id UUID,
    chw_id VARCHAR(50),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_district ON users(district_id);

-- ============================================================
-- GEOGRAPHIC HIERARCHY
-- ============================================================

CREATE TABLE districts (
    district_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    population INTEGER,
    geom GEOMETRY(MultiPolygon, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_districts_geom ON districts USING GIST(geom);

CREATE TABLE traditional_authorities (
    ta_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_id UUID REFERENCES districts(district_id),
    name VARCHAR(100) NOT NULL,
    population INTEGER,
    geom GEOMETRY(MultiPolygon, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ta_geom ON traditional_authorities USING GIST(geom);
CREATE INDEX idx_ta_district ON traditional_authorities(district_id);

CREATE TABLE villages (
    village_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ta_id UUID REFERENCES traditional_authorities(ta_id),
    name VARCHAR(100) NOT NULL,
    population INTEGER,
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_villages_ta ON villages(ta_id);
CREATE INDEX idx_villages_geom ON villages USING GIST(geom);

-- ============================================================
-- HEALTH FACILITIES
-- ============================================================

CREATE TABLE facilities (
    facility_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    facility_type VARCHAR(50) NOT NULL,
    district_id UUID REFERENCES districts(district_id),
    ta_id UUID REFERENCES traditional_authorities(ta_id),
    latitude REAL,
    longitude REAL,
    geom GEOMETRY(Point, 4326),
    catchment_population INTEGER,
    staffing_level INTEGER,
    bed_count INTEGER,
    has_maternity BOOLEAN DEFAULT FALSE,
    has_lab BOOLEAN DEFAULT FALSE,
    has_pharmacy BOOLEAN DEFAULT TRUE,
    quality_score REAL DEFAULT 0.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_facilities_district ON facilities(district_id);
CREATE INDEX idx_facilities_geom ON facilities USING GIST(geom);

-- ============================================================
-- HOUSEHOLDS (CHW App Local DB synced to cloud)
-- ============================================================

CREATE TABLE households (
    household_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chw_id VARCHAR(255),
    village_id UUID REFERENCES villages(village_id),
    gps_lat REAL,
    gps_lon REAL,
    geom GEOMETRY(Point, 4326),
    ta_name VARCHAR(100),
    village_name VARCHAR(100),
    water_source VARCHAR(50),
    sanitation_type VARCHAR(50),
    food_security_score INTEGER CHECK (food_security_score BETWEEN 1 AND 5),
    distance_to_facility_km REAL,
    transport_cost_mwk REAL,
    household_size INTEGER,
    sync_status sync_status DEFAULT 'pending',
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_households_chw ON households(chw_id);
CREATE INDEX idx_households_village ON households(village_id);
CREATE INDEX idx_households_geom ON households USING GIST(geom);
CREATE INDEX idx_households_sync ON households(sync_status);

-- ============================================================
-- MAMA-AI: PREGNANCY TRACKING
-- ============================================================

CREATE TABLE pregnancies (
    pregnancy_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(household_id),
    woman_name VARCHAR(255),
    age INTEGER CHECK (age > 0 AND age < 60),
    parity INTEGER DEFAULT 0,
    gravida INTEGER DEFAULT 1,
    lmp_date DATE,
    edd_date DATE,
    prior_stillbirths INTEGER DEFAULT 0,
    prior_csections INTEGER DEFAULT 0,
    prior_pph INTEGER DEFAULT 0,
    hiv_status VARCHAR(20),
    bp_systolic INTEGER,
    bp_diastolic INTEGER,
    hemoglobin REAL,
    danger_signs JSONB DEFAULT '[]'::jsonb,
    risk_score REAL CHECK (risk_score >= 0 AND risk_score <= 10),
    risk_category risk_level DEFAULT 'low',
    top_risk_factors JSONB DEFAULT '[]'::jsonb,
    next_visit_date DATE,
    referral_needed BOOLEAN DEFAULT FALSE,
    referral_facility_id UUID REFERENCES facilities(facility_id),
    referral_status referral_status,
    is_active BOOLEAN DEFAULT TRUE,
    chw_id UUID REFERENCES users(user_id),
    sync_status sync_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pregnancies_household ON pregnancies(household_id);
CREATE INDEX idx_pregnancies_chw ON pregnancies(chw_id);
CREATE INDEX idx_pregnancies_risk ON pregnancies(risk_category);
CREATE INDEX idx_pregnancies_next_visit ON pregnancies(next_visit_date) WHERE is_active = TRUE;
CREATE INDEX idx_pregnancies_sync ON pregnancies(sync_status);

-- ============================================================
-- MAMA-AI: CHILD HEALTH TRACKING
-- ============================================================

CREATE TABLE children (
    child_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(household_id),
    child_name VARCHAR(255),
    dob DATE,
    sex sex,
    birth_weight_kg REAL,
    vaccination_status JSONB DEFAULT '{}'::jsonb,
    muac REAL,
    weight_kg REAL,
    height_cm REAL,
    danger_signs JSONB DEFAULT '[]'::jsonb,
    symptoms JSONB DEFAULT '[]'::jsonb,
    risk_score REAL CHECK (risk_score >= 0 AND risk_score <= 10),
    risk_category risk_level DEFAULT 'low',
    top_risk_factors JSONB DEFAULT '[]'::jsonb,
    iccm_category iccm_category DEFAULT 'uncomplicated',
    treatment_given TEXT,
    referral_needed BOOLEAN DEFAULT FALSE,
    referral_facility_id UUID REFERENCES facilities(facility_id),
    referral_status referral_status,
    chw_id UUID REFERENCES users(user_id),
    sync_status sync_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_children_household ON children(household_id);
CREATE INDEX idx_children_chw ON children(chw_id);
CREATE INDEX idx_children_risk ON children(risk_category);
CREATE INDEX idx_children_dob ON children(dob);
CREATE INDEX idx_children_sync ON children(sync_status);

-- ============================================================
-- CHW VISITS
-- ============================================================

CREATE TABLE visits (
    visit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES households(household_id),
    chw_id UUID REFERENCES users(user_id),
    visit_date TIMESTAMPTZ NOT NULL,
    pregnancy_id UUID REFERENCES pregnancies(pregnancy_id),
    child_id UUID REFERENCES children(child_id),
    visit_type VARCHAR(20) NOT NULL CHECK (visit_type IN ('pregnancy', 'child', 'routine', 'followup')),
    symptoms JSONB DEFAULT '[]'::jsonb,
    danger_signs JSONB DEFAULT '[]'::jsonb,
    measurements JSONB DEFAULT '{}'::jsonb,
    ai_recommendation JSONB,
    ai_risk_score REAL,
    chw_override BOOLEAN DEFAULT FALSE,
    chw_override_reason TEXT,
    chw_notes TEXT,
    gps_lat REAL,
    gps_lon REAL,
    photos_queued INTEGER DEFAULT 0,
    sync_status sync_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visits_chw ON visits(chw_id);
CREATE INDEX idx_visits_household ON visits(household_id);
CREATE INDEX idx_visits_date ON visits(visit_date);
CREATE INDEX idx_visits_sync ON visits(sync_status);

-- ============================================================
-- CHUMA-AI: REFERRALS
-- ============================================================

CREATE TABLE referrals (
    referral_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id UUID REFERENCES visits(visit_id),
    patient_id UUID NOT NULL,
    patient_type VARCHAR(20) NOT NULL CHECK (patient_type IN ('pregnancy', 'child')),
    referral_reason TEXT NOT NULL,
    urgency referral_urgency DEFAULT 'routine',
    recommended_facilities JSONB DEFAULT '[]'::jsonb,
    selected_facility_id UUID REFERENCES facilities(facility_id),
    chw_id UUID REFERENCES users(user_id),
    referral_code VARCHAR(10) UNIQUE NOT NULL,
    facility_notified BOOLEAN DEFAULT FALSE,
    facility_notified_at TIMESTAMPTZ,
    patient_arrived BOOLEAN DEFAULT FALSE,
    patient_arrived_at TIMESTAMPTZ,
    outcome TEXT,
    status referral_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referrals_facility ON referrals(selected_facility_id);
CREATE INDEX idx_referrals_chw ON referrals(chw_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_referrals_code ON referrals(referral_code);

-- ============================================================
-- ULALO-AI: OUTBREAK ALERTS
-- ============================================================

CREATE TABLE alerts (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disease VARCHAR(50) NOT NULL,
    district_id UUID REFERENCES districts(district_id),
    ta_id UUID REFERENCES traditional_authorities(ta_id),
    ta_name VARCHAR(100),
    risk_score REAL CHECK (risk_score >= 0 AND risk_score <= 10),
    alert_level alert_level NOT NULL,
    predicted_cases INTEGER,
    confidence_interval_lower INTEGER,
    confidence_interval_upper INTEGER,
    recommended_actions JSONB DEFAULT '[]'::jsonb,
    model_version VARCHAR(50),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    status response_status DEFAULT 'pending',
    responded_by UUID REFERENCES users(user_id),
    response_notes TEXT,
    actions_taken JSONB DEFAULT '[]'::jsonb,
    resources_deployed JSONB,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_district ON alerts(district_id);
CREATE INDEX idx_alerts_level ON alerts(alert_level);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_generated ON alerts(generated_at);

-- ============================================================
-- ULALO-AI: SURVEILLANCE DATA (Time-Series)
-- ============================================================

CREATE TABLE surveillance_weekly (
    id UUID DEFAULT uuid_generate_v4(),
    district_id UUID REFERENCES districts(district_id),
    ta_id UUID REFERENCES traditional_authorities(ta_id),
    epidemiological_week VARCHAR(10) NOT NULL,
    year INTEGER NOT NULL,
    week_number INTEGER NOT NULL,
    disease VARCHAR(50) NOT NULL,
    confirmed_cases INTEGER DEFAULT 0,
    suspected_cases INTEGER DEFAULT 0,
    admissions INTEGER DEFAULT 0,
    deaths INTEGER DEFAULT 0,
    rainfall_mm REAL,
    temperature_c REAL,
    humidity_pct REAL,
    flood_event BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, epidemiological_week)
);

-- NOTE: TimescaleDB hypertable can be enabled when the extension is installed:
-- SELECT create_hypertable('surveillance_weekly', 'created_at');

CREATE INDEX idx_surveillance_weekly_district ON surveillance_weekly(district_id);
CREATE INDEX idx_surveillance_weekly_disease ON surveillance_weekly(disease);
CREATE INDEX idx_surveillance_weekly_week ON surveillance_weekly(epidemiological_week);

-- ============================================================
-- CHUMA-AI: SUPPLY CHAIN / LMIS
-- ============================================================

CREATE TABLE commodities (
    commodity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    is_essential BOOLEAN DEFAULT TRUE,
    min_stock_months REAL DEFAULT 2.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE facility_stock (
    id UUID DEFAULT uuid_generate_v4(),
    facility_id UUID REFERENCES facilities(facility_id),
    commodity_id UUID REFERENCES commodities(commodity_id),
    stock_on_hand INTEGER DEFAULT 0,
    monthly_consumption REAL DEFAULT 0,
    months_of_supply REAL GENERATED ALWAYS AS (
        CASE WHEN monthly_consumption > 0
             THEN stock_on_hand / monthly_consumption
             ELSE NULL
        END
    ) STORED,
    last_restocked_date DATE,
    stockout_risk_score REAL,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, recorded_at)
);

-- NOTE: TimescaleDB hypertable can be enabled when the extension is installed:
-- SELECT create_hypertable('facility_stock', 'recorded_at');

CREATE INDEX idx_stock_facility ON facility_stock(facility_id);
CREATE INDEX idx_stock_commodity ON facility_stock(commodity_id);

CREATE TABLE stockout_history (
    stockout_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    facility_id UUID REFERENCES facilities(facility_id),
    commodity_id UUID REFERENCES commodities(commodity_id),
    stockout_date DATE NOT NULL,
    restocked_date DATE,
    duration_days INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stockout_facility ON stockout_history(facility_id);
CREATE INDEX idx_stockout_commodity ON stockout_history(commodity_id);

-- ============================================================
-- CLIMATE DATA (Time-Series)
-- ============================================================

CREATE TABLE climate_daily (
    id UUID DEFAULT uuid_generate_v4(),
    district_id UUID REFERENCES districts(district_id),
    ta_id UUID REFERENCES traditional_authorities(ta_id),
    observation_date DATE NOT NULL,
    source VARCHAR(20) NOT NULL,
    rainfall_mm REAL,
    temperature_max_c REAL,
    temperature_min_c REAL,
    temperature_mean_c REAL,
    humidity_pct REAL,
    soil_moisture REAL,
    ndvi REAL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, observation_date)
);

-- NOTE: TimescaleDB hypertable can be enabled when the extension is installed:
-- SELECT create_hypertable('climate_daily', 'observation_date');

CREATE INDEX idx_climate_district ON climate_daily(district_id);
CREATE INDEX idx_climate_date ON climate_daily(observation_date);

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE audit_log (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- ============================================================
-- ML MODEL TRACKING
-- ============================================================

CREATE TABLE ml_models (
    model_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engine VARCHAR(20) NOT NULL CHECK (engine IN ('mama', 'ulalo', 'chuma')),
    model_name VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    training_data_range VARCHAR(100),
    metrics JSONB DEFAULT '{}'::jsonb,
    artifact_path TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    deployed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(engine, model_name, version)
);

-- ============================================================
-- SEED DATA: Commodities
-- ============================================================

INSERT INTO commodities (name, category, unit, is_essential) VALUES
    ('Artemether-Lumefantrine (ACT) 20/120', 'Antimalarial', 'courses', TRUE),
    ('Rapid Diagnostic Test (RDT) - Malaria', 'Diagnostic', 'tests', TRUE),
    ('Amoxicillin 250mg', 'Antibiotic', 'tablets', TRUE),
    ('ORS Sachets', 'Oral Rehydration', 'sachets', TRUE),
    ('Zinc 20mg dispersible tablets', 'Micronutrient', 'tablets', TRUE),
    ('Ferrous Sulfate + Folic Acid', 'Antianaemia', 'tablets', TRUE),
    ('Sulfadoxine-Pyrimethamine (SP)', 'Antimalarial', 'tablets', TRUE),
    ('Oxytocin 10 IU/ml', 'Maternal Health', 'ampoules', TRUE),
    ('Magnesium Sulfate 50%', 'Maternal Health', 'ampoules', TRUE),
    ('Chlorhexidine 7.1% Solution', 'Maternal Health', 'bottles', TRUE),
    ('Vitamin A 100,000 IU', 'Micronutrient', 'capsules', TRUE),
    ('Measles-Rubella Vaccine', 'Vaccine', 'doses', TRUE),
    ('Pentavalent Vaccine', 'Vaccine', 'doses', TRUE),
    ('Oral Polio Vaccine', 'Vaccine', 'doses', TRUE),
    ('BCG Vaccine', 'Vaccine', 'doses', TRUE);

-- ============================================================
-- SAMALA-AI: KNOWLEDGE TRANSLATION & SELF-CARE
-- ============================================================

CREATE TYPE consent_status AS ENUM ('pending', 'granted', 'denied', 'withdrawn');
CREATE TYPE study_status AS ENUM ('discovered', 'under_review', 'approved', 'synthesized', 'deployed');
CREATE TYPE asset_type AS ENUM ('chw_brief', 'video', 'audio', 'poster', 'flipbook', 'sms', 'infographic', 'community_talk');
CREATE TYPE asset_status AS ENUM ('draft', 'review', 'approved', 'deployed');
CREATE TYPE content_severity AS ENUM ('info', 'warning', 'emergency');
CREATE TYPE delivery_method AS ENUM ('home_visit', 'community_meeting', 'clinic', 'school', 'radio', 'sms', 'poster');
CREATE TYPE guide_severity AS ENUM ('info', 'warning', 'emergency');
CREATE TYPE talk_status AS ENUM ('draft', 'review', 'approved');

CREATE TABLE research_studies (
    study_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    authors JSONB DEFAULT '[]'::jsonb,
    journal VARCHAR(255),
    doi VARCHAR(255),
    publication_year INTEGER,
    abstract TEXT,
    source_url VARCHAR(500),
    source_repository VARCHAR(50),
    study_design VARCHAR(50),
    sample_size INTEGER,
    study_period_start VARCHAR(20),
    study_period_end VARCHAR(20),
    patient_demographics JSONB DEFAULT '{}'::jsonb,
    key_statistical_findings JSONB DEFAULT '[]'::jsonb,
    limitations JSONB DEFAULT '[]'::jsonb,
    references_cited JSONB DEFAULT '[]'::jsonb,
    study_district VARCHAR(100),
    study_ta VARCHAR(100),
    study_facility VARCHAR(255),
    researcher_contact VARCHAR(255),
    consent_status consent_status DEFAULT 'pending',
    consent_date TIMESTAMPTZ,
    researcher_notes TEXT,
    health_topic VARCHAR(100) NOT NULL,
    audience VARCHAR(100),
    discovered_at TIMESTAMPTZ,
    ingested_by VARCHAR(100),
    status study_status DEFAULT 'discovered',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_research_studies_topic ON research_studies(health_topic);
CREATE INDEX idx_research_studies_district ON research_studies(study_district);
CREATE INDEX idx_research_studies_status ON research_studies(status);

CREATE TABLE knowledge_assets (
    asset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    study_id UUID REFERENCES research_studies(study_id),
    title VARCHAR(255) NOT NULL,
    title_chichewa VARCHAR(255),
    key_finding TEXT NOT NULL,
    key_finding_chichewa TEXT,
    actionable_takeaways JSONB DEFAULT '[]'::jsonb,
    actionable_takeaways_chichewa JSONB DEFAULT '[]'::jsonb,
    evidence_refs JSONB DEFAULT '[]'::jsonb,
    asset_type asset_type NOT NULL,
    health_topic VARCHAR(100) NOT NULL,
    audience VARCHAR(100),
    severity content_severity DEFAULT 'info',
    media_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    audio_url VARCHAR(500),
    poster_url VARCHAR(500),
    flipbook_urls JSONB DEFAULT '[]'::jsonb,
    synthesized_at TIMESTAMPTZ,
    synthesized_by VARCHAR(100),
    confidence_level VARCHAR(20),
    reviewed_by VARCHAR(255),
    review_notes TEXT,
    status asset_status DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_assets_topic ON knowledge_assets(health_topic);
CREATE INDEX idx_knowledge_assets_type ON knowledge_assets(asset_type);
CREATE INDEX idx_knowledge_assets_status ON knowledge_assets(status);
CREATE INDEX idx_knowledge_assets_study ON knowledge_assets(study_id);

CREATE TABLE knowledge_deployments (
    deployment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES knowledge_assets(asset_id),
    talk_id UUID REFERENCES community_health_talks(talk_id),
    guide_id UUID REFERENCES self_care_guides(guide_id),
    chw_id UUID REFERENCES users(user_id),
    district_id UUID REFERENCES districts(district_id),
    ta_name VARCHAR(100),
    village_name VARCHAR(100),
    delivery_method delivery_method NOT NULL,
    households_reached INTEGER DEFAULT 0,
    individuals_reached INTEGER DEFAULT 0,
    deployed_at TIMESTAMPTZ,
    deployed_by VARCHAR(255),
    knowledge_pre_score REAL CHECK (knowledge_pre_score >= 0 AND knowledge_pre_score <= 1),
    knowledge_post_score REAL CHECK (knowledge_post_score >= 0 AND knowledge_post_score <= 1),
    behavior_change_score REAL CHECK (behavior_change_score >= 0 AND behavior_change_score <= 1),
    health_outcome_delta REAL,
    cases_identified INTEGER DEFAULT 0,
    referrals_made INTEGER DEFAULT 0,
    outcomes_tracked JSONB DEFAULT '{}'::jsonb,
    follow_up_date TIMESTAMPTZ,
    follow_up_completed BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_deployments_asset ON knowledge_deployments(asset_id);
CREATE INDEX idx_knowledge_deployments_talk ON knowledge_deployments(talk_id);
CREATE INDEX idx_knowledge_deployments_guide ON knowledge_deployments(guide_id);
CREATE INDEX idx_knowledge_deployments_chw ON knowledge_deployments(chw_id);
CREATE INDEX idx_knowledge_deployments_district ON knowledge_deployments(district_id);

CREATE TABLE self_care_guides (
    guide_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    title_chichewa VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    audience VARCHAR(100),
    severity guide_severity DEFAULT 'info',
    what_it_is TEXT,
    what_it_is_chichewa TEXT,
    what_to_do_now JSONB DEFAULT '[]'::jsonb,
    what_to_do_now_chichewa JSONB DEFAULT '[]'::jsonb,
    what_not_to_do JSONB DEFAULT '[]'::jsonb,
    what_not_to_do_chichewa JSONB DEFAULT '[]'::jsonb,
    when_to_seek_help TEXT,
    when_to_seek_help_chichewa TEXT,
    prevention JSONB DEFAULT '[]'::jsonb,
    prevention_chichewa JSONB DEFAULT '[]'::jsonb,
    treatment_limitations JSONB DEFAULT '[]'::jsonb,
    treatment_limitations_chichewa JSONB DEFAULT '[]'::jsonb,
    clinical_decision_points JSONB DEFAULT '[]'::jsonb,
    clinical_decision_points_chichewa JSONB DEFAULT '[]'::jsonb,
    illustration_url VARCHAR(500),
    audio_url VARCHAR(500),
    video_url VARCHAR(500),
    source VARCHAR(500),
    last_reviewed TIMESTAMPTZ,
    reviewed_by VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_self_care_guides_category ON self_care_guides(category);
CREATE INDEX idx_self_care_guides_severity ON self_care_guides(severity);
CREATE INDEX idx_self_care_guides_active ON self_care_guides(is_active);

CREATE TABLE community_health_talks (
    talk_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    title_chichewa VARCHAR(255),
    study_id UUID REFERENCES research_studies(study_id),
    duration_minutes INTEGER DEFAULT 15,
    talking_points JSONB DEFAULT '[]'::jsonb,
    talking_points_chichewa JSONB DEFAULT '[]'::jsonb,
    discussion_questions JSONB DEFAULT '[]'::jsonb,
    pledge_card_text TEXT,
    pledge_card_text_chichewa TEXT,
    picture_card_urls JSONB DEFAULT '[]'::jsonb,
    song_url VARCHAR(500),
    diagram_urls JSONB DEFAULT '[]'::jsonb,
    health_topic VARCHAR(100) NOT NULL,
    audience VARCHAR(100),
    status talk_status DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_community_health_talks_topic ON community_health_talks(health_topic);
CREATE INDEX idx_community_health_talks_status ON community_health_talks(status);

-- ============================================================
-- SAMALA-AI: MENTAL HEALTH REFERRALS
-- ============================================================

CREATE TYPE mh_referral_status AS ENUM ('identified', 'referred', 'in_care', 'followed_up', 'resolved', 'lost_to_followup');

CREATE TABLE mental_health_referrals (
    referral_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    study_id UUID REFERENCES research_studies(study_id),
    asset_id UUID REFERENCES knowledge_assets(asset_id),
    deployment_id UUID REFERENCES knowledge_deployments(deployment_id),
    individual_name VARCHAR(255),
    age INTEGER,
    sex VARCHAR(10),
    village_name VARCHAR(100),
    ta_name VARCHAR(100),
    district VARCHAR(100),
    risk_factors JSONB DEFAULT '[]'::jsonb,
    trigger_event VARCHAR(255),
    presenting_concern TEXT,
    referred_to VARCHAR(255),
    referral_date TIMESTAMPTZ,
    follow_up_date TIMESTAMPTZ,
    outcome TEXT,
    status mh_referral_status DEFAULT 'identified',
    chw_id UUID REFERENCES users(user_id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mh_referrals_status ON mental_health_referrals(status);
CREATE INDEX idx_mh_referrals_district ON mental_health_referrals(district);
CREATE INDEX idx_mh_referrals_chw ON mental_health_referrals(chw_id);
CREATE INDEX idx_mh_referrals_study ON mental_health_referrals(study_id);
