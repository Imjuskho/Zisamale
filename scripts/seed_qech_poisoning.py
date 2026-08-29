#!/usr/bin/env python3
"""
SEED SAMALA-AI DATA: QECH Acute Poisoning Study
Demonstrates the full knowledge translation pipeline:
  Research Study → Knowledge Assets → Self-Care Guide → Community Health Talk

Source: "Audit of Acute Poisoning at QECH" by Rachel Chamanga (2026)
"""

import uuid
from datetime import datetime, timezone

OUTPUT_SQL = "scripts/seed_qech_poisoning.sql"


def uid():
    return str(uuid.uuid4())


def now():
    return datetime.now(timezone.utc).isoformat()


def main():
    study_id = uid()
    asset1_id = uid()  # CHW Brief
    asset2_id = uid()  # Infographic
    asset3_id = uid()  # Poster
    guide_id = uid()
    talk_id = uid()

    ts = now()

    lines = []
    lines.append("-- ============================================================")
    lines.append("-- SAMALA-AI SEED: QECH Acute Poisoning Study")
    lines.append("-- Full pipeline: Study → Assets → Guide → Health Talk")
    lines.append("-- Source: Chamanga R. 'Audit of Acute Poisoning at QECH' 2026")
    lines.append("-- ============================================================")
    lines.append("")

    # ── 1. RESEARCH STUDY ──────────────────────────────────────────
    lines.append("-- ── 1. RESEARCH STUDY ──────────────────────────────────────────")
    lines.append(f"""
INSERT INTO research_studies (
    study_id, title, authors, journal, publication_year,
    abstract, source_url, source_repository,
    study_design, sample_size, study_period_start, study_period_end,
    patient_demographics, key_statistical_findings, limitations, references_cited,
    study_district, study_facility,
    consent_status, health_topic, audience,
    discovered_at, ingested_by, status,
    created_at, updated_at
) VALUES (
    '{study_id}',
    'Audit of Acute Poisoning at Queen Elizabeth Central Hospital',
    '["Rachel Chamanga"]'::jsonb,
    'QECH Emergency Medicine',
    2026,
    'Retrospective audit of acute poisoning cases (n=125) at QECH, Lilongwe, Malawi (May 2025–Mar 2026). '
    'Key findings: 62% male, median age 25. Chimbulu (aluminium phosphide) caused 50% mortality. '
    'Hypotension, low GCS, and vomiting were significant predictors of mortality. '
    'Intentional poisoning was 70% of cases, predominantly young males aged 20–30 from romantic/family disputes.',
    NULL,
    'local_audit',
    'retrospective_audit',
    125,
    '2025-05',
    '2026-03',
    '{{"total_cases": 125, "confirmed_poisoning": 125, "male_pct": 62, "female_pct": 38, "median_age": 25, "age_iqr": "20.8–33.7", "urban_pct": 64.8, "rural_pct": 35.2}}'::jsonb,
    '[{{"finding": "Chimbulu mortality rate", "value": "50%", "ci": null, "p_value": null, "context": "28 chimbulu cases, 14 deaths"}}, {{"finding": "Intentional poisoning rate", "value": "70%", "ci": null, "p_value": null, "context": "88 of 125 cases"}}, {{"finding": "Hypotension predictor of mortality", "value": "OR not significant", "ci": "0.48–6.65", "p_value": "0.381", "context": "Univariate: 34.6% vs 8.9%, p=0.003"}}, {{"finding": "Low GCS predictor of mortality", "value": "OR 4.49", "ci": "1.55–13.03", "p_value": "0.006", "context": "58.0% vs 15.9%, multivariable adjusted"}}, {{"finding": "Vomiting predictor of mortality", "value": "OR 2.42", "ci": "0.12–0.54", "p_value": "0.061", "context": "87.5% vs 59.4%, p=0.022 univariate"}}]'::jsonb,
    '["No standard data collection form — data extracted from clinical notes which were variable", "Misclassification possible between rat tablet and chimbulu", "Time to presentation and dose amount not consistently recorded", "Lab results and investigations data was variable", "Outcomes may not have been updated for all patients"]'::jsonb,
    '["WHO 2021 Global Estimates on Poisoning", "WHO 2021 Global Estimate on suicide", "Muula A. Suicide in Malawi another case of dispensability", "Brinshal P. Survival in a case of aluminum phosphide poisoning", "Gettie et al. Retrospective Study of Acute Poisoning at Dessie Referral Hospital", "Tefera et al. Prevalence, Predictors and Treatment Outcome of Acute Poisoning in Western Ethiopia", "Risiere et al. Clinical and Epidemiological Characteristics of Severe Acute Adult Poisoning in Martinique", "Kirimani et al. Antidotes for aluminum phosphide poisoning — An update"]'::jsonb,
    'Lilongwe',
    'Queen Elizabeth Central Hospital',
    'granted',
    'acute_poisoning',
    'chw,mohp,dho',
    '{ts}',
    'samala_pipeline',
    'deployed',
    '{ts}',
    '{ts}'
) ON CONFLICT DO NOTHING;
""")

    # ── 2. KNOWLEDGE ASSETS ────────────────────────────────────────
    lines.append("-- ── 2. KNOWLEDGE ASSETS ────────────────────────────────────────")

    # Asset 1: CHW Brief
    lines.append(f"""
INSERT INTO knowledge_assets (
    asset_id, study_id, title, title_chichewa,
    key_finding, key_finding_chichewa,
    actionable_takeaways, actionable_takeaways_chichewa,
    evidence_refs,
    asset_type, health_topic, audience, severity,
    synthesized_at, synthesized_by, confidence_level,
    status, created_at, updated_at
) VALUES (
    '{asset1_id}',
    '{study_id}',
    'Recognising Acute Poisoning: A CHW Field Guide',
    'Kuzindula Unsonkho Wanthawi Yochepa: Thandizo la kwa Makhwao',
    'Chimbulu (aluminium phosphide rat poison) has a 50% mortality rate at QECH. '
    'Young males aged 20-30 are highest risk. Key danger signs: low consciousness, '
    'low blood pressure, vomiting. Time to hospital is critical — no specific antidote exists.',
    'Chimbulu (faini ya fumbi ya chemichala) imakhudza anthu ambiri motero. '
    'Athanzi a mitundu ya 20-30 ndi omwe ali pangozi kwambiri. '
    'Zizindikiro zoopsya: kuchepa kwa chidziwitso, kupanikizika kwa magazi, kunyansa. '
    'Nthawi yofika ku chipatala ndi yofunika kwambiri — mulibe mankhwala osokoneza ndi chikwi.',
    '["If a patient has vomiting + low consciousness + low BP after swallowing anything suspicious, assume poison and rush to nearest hospital", '
    '"Ask specifically about Chimbulu/rat poison ingestion — patients may not volunteer this information", '
    '"Note the time of ingestion — this affects prognosis and treatment decisions", '
    '"Do NOT induce vomiting if the patient is already unconscious — aspiration risk is high", '
    '"Keep the patient lying on their side (recovery position) to protect airway"]'::jsonb,
    '["Ngati wodwala ali ndi kunyansa + chidziwitso chochepa + magazi ochepa atadya/chumwa chilichonse, ganizirani kuti ndi cholemera mwadzidzidzi", '
    '"Funseni molimbikira za Chimbulu/faini ya fumbi — odwala sangakubweretse mbiriyi", '
    '"Lembani nthawi yamene adamwa — itha kusintha chithandizo", '
    '"Musapange kuti avomitire ngati ali kale osadziwa — pangozi yosakanikira kutsekula mmphepo", '
    '"Ikani wodwala ku mbewa yake (malowedwe obwezeretsa) kuti mupewe kutsekula mmphepo"]'::jsonb,
    '[{{"takeaway_index": 0, "stat_ref": "Low GCS predictor of mortality", "evidence_strength": "strong", "p_value": "0.006"}}, {{"takeaway_index": 1, "stat_ref": "Chimbulu mortality rate", "evidence_strength": "strong", "note": "50% mortality, no antidote"}}]'::jsonb,
    'chw_brief',
    'acute_poisoning',
    'chw',
    'emergency',
    '{ts}',
    'samala_pipeline',
    'high',
    'approved',
    '{ts}',
    '{ts}'
) ON CONFLICT DO NOTHING;
""")

    # Asset 2: Infographic
    lines.append(f"""
INSERT INTO knowledge_assets (
    asset_id, study_id, title, title_chichewa,
    key_finding, key_finding_chichewa,
    actionable_takeaways, actionable_takeaways_chichewa,
    evidence_refs,
    asset_type, health_topic, audience, severity,
    synthesized_at, synthesized_by, confidence_level,
    status, created_at, updated_at
) VALUES (
    '{asset2_id}',
    '{study_id}',
    'Chimbulu is Deadly: Know the Facts',
    'Chimbulu Ndi Woopsya: Dziwani Zowona',
    'At QECH, 50% of patients who ingested Chimbulu died. '
    'It is not the same as other pesticides — it causes circulatory collapse, not cholinergic symptoms. '
    'Most victims are young men aged 20-30, often following relationship or family disputes.',
    'Ku QECH, 50% ya odwala omwe adamwa Chimbulu anamwalira. '
    'Sizofanana ndi zolemera zina — imayambitsa kutayika kwa magazi, osati zizindikiro za cholinergic. '
    'Odwala ambiri ndi athanzi a 20-30, kawirikawiri chifukwa cha mavuto a banja kapena ubale.',
    '["50% of Chimbulu cases at QECH result in death — there is NO specific antidote", '
    '"Young men (20-30) are the highest risk group — relationship and family disputes are common triggers", '
    '"Chimbulu causes different symptoms from other pesticides: low BP, low consciousness, vomiting", '
    '"If someone swallows rat poison, get them to hospital IMMEDIATELY — every minute counts", '
    '"Store pesticides safely away from food and out of children''s reach"]'::jsonb,
    '["50% ya Chimbulu ku QECH imamalizira akufa — mulibe mankhwala osokoneza", '
    '"Athanzi a 20-30 ndi omwe ali pangozi kwambiri — mavuto a ubale ndi omwe amayambitsa", '
    '"Chimbulu imayambitsa zizindikiro zosiyana ndi zolemera zina: magazi ochepa, chidziwitso chochepa, kunyansa", '
    '"Ngati munthu atamwa faini ya fumbi, mwamsuzani ku chipatala MWADZIDZIDZI — nthawi ndi yofunika", '
    '"Sungani zolemera kumbali kuti zisalowe mafuta kapena kufika kwa ana"]'::jsonb,
    '[{{"takeaway_index": 0, "stat_ref": "Chimbulu mortality rate", "evidence_strength": "strong", "note": "50% mortality at QECH, n=28"}}, {{"takeaway_index": 3, "stat_ref": "Chimbulu mortality rate", "evidence_strength": "strong", "note": "No specific antidote, supportive care only"}}]'::jsonb,
    'infographic',
    'acute_poisoning',
    'community',
    'warning',
    '{ts}',
    'samala_pipeline',
    'high',
    'approved',
    '{ts}',
    '{ts}'
) ON CONFLICT DO NOTHING;
""")

    # Asset 3: Poster
    lines.append(f"""
INSERT INTO knowledge_assets (
    asset_id, study_id, title, title_chichewa,
    key_finding, key_finding_chichewa,
    actionable_takeaways, actionable_takeaways_chichewa,
    evidence_refs,
    asset_type, health_topic, audience, severity,
    synthesized_at, synthesized_by, confidence_level,
    status, created_at, updated_at
) VALUES (
    '{asset3_id}',
    '{study_id}',
    'Protect Your Family: Prevent Poisoning',
    'Tetezani Banja Lanu: Tsekulani Unsonkho',
    '70% of poisoning cases at QECH are intentional. '
    'Romantic disputes (13 cases), family disputes (7), and personal problems (5) are the main triggers. '
    'Mental health support and conflict resolution can prevent these deaths.',
    '70% ya odwala otsekula ku QECH ndi a kufuna. '
    'Mavuto a ubale (13), mavuto a banja (7), ndi mavuto a wokha (5) ndi omwe amayambitsa. '
    'Thandizo la moya ndi kuthetsa mikangano kungathandize kupewa imfaizi.',
    '["70% of poisoning cases are intentional — most are cries for help, not accidents", '
    '"If someone talks about taking poison, take it seriously and get them help immediately", '
    '"Community health workers can provide confidential support for mental health and family disputes", '
    '"Teach children about the dangers of rat poison and pesticides", '
    '"Keep all chemicals locked away from reach of children and vulnerable adults"]'::jsonb,
    '["70% ya otsekula ndi a kufuna — ambiri ndi otere othira thandizo, osati achisawawa", '
    '"Ngati munthu akukamba za kumwa cholemera, mutheke ndi kuthandiza mwadzidzidzi", '
    '"Makhwao athandiza mafumu a moya ndi kuthetsa mikangano m''banja", '
    '"Phunzitsani ana za ngozi ya faini ya fumbi ndi zolemera", '
    '"Sungani zolemera zonse kumbali kuti zisaloke kwa anthu odzichepetsa ndi ana"]'::jsonb,
    '[{{"takeaway_index": 0, "stat_ref": "Intentional poisoning rate", "evidence_strength": "strong", "note": "70% intentional, n=88"}}, {{"takeaway_index": 2, "stat_ref": "Intentional poisoning rate", "evidence_strength": "moderate", "note": "Triggers: romantic 13, family 7, personal 5, financial 1"}}]'::jsonb,
    'poster',
    'acute_poisoning',
    'community',
    'warning',
    '{ts}',
    'samala_pipeline',
    'high',
    'approved',
    '{ts}',
    '{ts}'
) ON CONFLICT DO NOTHING;
""")

    # ── 3. SELF-CARE GUIDE ─────────────────────────────────────────
    lines.append("-- ── 3. SELF-CARE GUIDE ─────────────────────────────────────────")
    lines.append(f"""
INSERT INTO self_care_guides (
    guide_id, title, title_chichewa, category, audience, severity,
    what_it_is, what_it_is_chichewa,
    what_to_do_now, what_to_do_now_chichewa,
    what_not_to_do, what_not_to_do_chichewa,
    when_to_seek_help, when_to_seek_help_chichewa,
    prevention, prevention_chichewa,
    treatment_limitations, treatment_limitations_chichewa,
    clinical_decision_points, clinical_decision_points_chichewa,
    source, last_reviewed, is_active,
    created_at, updated_at
) VALUES (
    '{guide_id}',
    'What to Do If Someone Has Been Poisoned',
    'Zimene Muyenera Kuchira Ngati Munthu Wachitidwa Unsonkho',
    'acute_poisoning',
    'chw,community',
    'emergency',
    'Acute poisoning is when someone swallows, breathes in, or touches a harmful substance '
    'within 24 hours. At QECH in Malawi, 125 cases were treated in one year. '
    'Chimbulu (rat poison) kills 50% of people who ingest it. '
    'Young men aged 20-30 are most at risk, often after personal or family disputes.',
    'Unsonkho wanthawi yochepa ndi mtundu umene munthu amatengera zachiasunguzire kapena kuti zimene '
    'zimayambitsa matenda mkathawi ya maora 24. Ku QECH ku Malawi, odwala 125 adalandira chithandizo m''zaka imodzi. '
    'Chimbulu (faini ya fumbi) imamalitsa anthu 50% omwe amamwa. '
    'Athanzi a 20-30 ndi omwe ali pangozi kwambiri, kawirikawiri atatha mavuto a banja kapena ubale.',
    '["Call emergency services or go to the nearest hospital IMMEDIATELY", '
    '"Try to find out what substance was taken and how much", '
    '"Keep the person lying on their side in the recovery position", '
    '"If they are conscious and not vomiting, give small sips of clean water", '
    '"Stay with the person and monitor their breathing and consciousness", '
    '"Bring the container or substance to the hospital so doctors know what they are treating"]'::jsonb,
    '["Fonizani thandizo la pachuma kapena kupita ku chipatala pafupifupi MWADZIDZIDZI", '
    '"Yesusani kudziwa chomwe adamwa ndi kuchuluka kwaicho", '
    '"Ikani munthu ku mbewa yake (malowedwe obwezeretsa)", '
    '"Ngati ali ndi chidziwitso ndi kupuma bwino, mugawani madzi oyeretsedwa pang''ono pang''ono", '
    '"Mugone ndi munthu munu ndikuyang''anira kupuma kwake ndi chidziwitso chake", '
    '"Bweretsani kapu kapena zinthu zomwe zidamwazo ku chipatala ndi akatswiri adziwire chithandizo"]'::jsonb,
    '["Do NOT induce vomiting — this can cause choking if the person is losing consciousness", '
    '"Do NOT give milk or oil — these do not neutralize most poisons", '
    '"Do NOT try to make the person walk if they are dizzy or confused", '
    '"Do NOT leave the person alone — they may lose consciousness suddenly", '
    '"Do NOT wait to see if symptoms improve — Chimbulu can kill within hours"]'::jsonb,
    '["Musapange kuti avomitire — ndiyeo angatsekule ngati akutayika chidziwitso", '
    '"Musapatsa mafuta kapena mafuta — sizikuthira poizoni", '
    '"Musapange kuti anthu aziyenda ngati ali ndi kudzizungulira kapena kukhutira", '
    '"Musasiye munthu yekha — angatayike chidziwitso mwadzidzidzi", '
    '"Musayembekezere kuona ngati zizindikiro zakhuta — Chimbulu imatha kupha mkathawi vosayera"]'::jsonb,
    'Seek emergency medical help immediately if: the person has lost consciousness or is very drowsy; '
    'they are vomiting blood or have severe vomiting; their breathing is slow or irregular; '
    'they have seizures; their skin is cold and clammy; or you suspect Chimbulu (rat poison) ingestion.',
    'Fonizani thandizo la pachuma makamaka ngati: munthu atatayika chidziwitso kapena ali wochepa mtima; '
    'akuvomitira magazi kapena ali ndi kunyansa kwambiri; kupuma kwake ndi pang''ono kapena osagwirizana; '
    'ali ndi convulsions; khungu lake ndi ozizira ndi youma; kapena muganiza kuti adamwa Chimbulu (faini ya fumbi).',
    '["Store all pesticides and chemicals in locked containers away from food", '
    '"Keep rat poison and pesticides out of reach of children and vulnerable adults", '
    '"Talk to family members about dangers — many poisoning cases follow arguments", '
    '"Learn the signs of depression and suicidal thoughts in your community", '
    '"Know the location of your nearest hospital and emergency number"]'::jsonb,
    '["Sungani zolemera zonse m''zigawo zotsekera kumbali ya chakudya", '
    '"Ikani faini ya fumbi ndi zolemera kumbali kuti zisaloke kwa ana ndi anthu odzichepetsa", '
    '"Kambiranani ndi banja lanu za zoopsya — odwala ambiri amamwa atatha kufikirana", '
    '"Phunzirani zizindikiro za kukhutira mtima ndi maganizo oipa m''mudzi mwathu", '
    '"Dziwani kwathu chipatala chanu pafupi ndi nambara ya pachuma"]'::jsonb,
    '["No specific antidote exists for Chimbulu (aluminium phosphide) — treatment is supportive only", '
    '"Magnesium sulphate has been suggested but evidence is inconclusive", '
    '"Mortality is dose-dependent and time-dependent — delayed presentation worsens prognosis", '
    '"Chimbulu causes circulatory collapse (not cholinergic symptoms) — standard organophosphate protocols do not apply", '
    '"Most treatment is IV fluids, monitoring, and managing complications"]'::jsonb,
    '["Palibe mankhwala osokoneza a Chimbulu (aluminium phosphide) — chithandizo ndi chongogwira ntchito", '
    '"Magnesium sulphate yawonetsedwa koma umboni suli wokhazikika", '
    '"Imfa ndi ya cholerengedwe cha mankhwala ndi nthawi — kuchedwa kufika ku chipatala kumapweteketsa", '
    '"Chimbulu imayambitsa kutayika kwa magazi (osati zizindikiro za cholinergic) — machiritso a organophosate sangagwire ntchito", '
    '"Chithandizo chambiri ndi madzi a mu mawondo, kuwunika, ndi kuthetsa mavuto"]'::jsonb,
    '[{{"trigger": "BP < 100 mmHg systolic", "action": "Initiate IV fluid resuscitation, prepare for possible cardiac monitoring", "evidence": "Hypotension 67.9% in chimbulu cases, p=0.003"}}, {{"trigger": "GCS < 15 or loss of consciousness", "action": "Protect airway (recovery position), prepare for possible intubation at facility", "evidence": "Low GCS OR 4.49 for mortality, p=0.006"}}, {{"trigger": "Vomiting after ingestion", "action": "Do NOT induce further vomiting, position on side, monitor for aspiration", "evidence": "Vomiting 87.5% in mortality group, OR 2.42, p=0.061"}}, {{"trigger": "Hypoglycemia (glucose < 3.0 mmol)", "action": "Administer glucose if available, urgent hospital transfer", "evidence": "Hypoglycemia 42.9% in chimbulu cases vs 0% in other poisoning"}}]'::jsonb,
    '[{{"trigger": "BP < 100 mmHg sistoliki", "action": "Yambitsani madzi a mu mawondo, konzekereni kuwunika kwa mtima", "evidence": "Kupanikizika kwa magazi 67.9% mu Chimbulu, p=0.003"}}, {{"trigger": "GCS < 15 kapena kutayika chidziwitso", "action": "Tetezani kutsekula mmphepo (malowedwe), konzekereni intubation ku chipatala", "evidence": "Low GCS OR 4.49 ya imfa, p=0.006"}}, {{"trigger": "Kunyansa atamwa cholemera", "action": "Musapange kunyansanso, ikani ku mbewa, yang''anirani kutsekula", "evidence": "Kunyansa 87.5% mu omwe anamwalira, OR 2.42, p=0.061"}}, {{"trigger": "Kuchepa shuga (glucose < 3.0 mmol)", "action": "Patsani shuga ngati muli nacho, pitirizani ku chipatala mwadzidzidzi", "evidence": "Hypoglycemia 42.9% mu Chimbulu vs 0% mu zolemera zina"}}]'::jsonb,
    'QECH Acute Poisoning Audit (Chamanga 2026); WHO Global Estimates on Poisoning (2021)',
    '{ts}',
    TRUE,
    '{ts}',
    '{ts}'
) ON CONFLICT DO NOTHING;
""")

    # ── 4. COMMUNITY HEALTH TALK ───────────────────────────────────
    lines.append("-- ── 4. COMMUNITY HEALTH TALK ───────────────────────────────────")
    lines.append(f"""
INSERT INTO community_health_talks (
    talk_id, title, title_chichewa, study_id,
    duration_minutes, talking_points, talking_points_chichewa,
    discussion_questions,
    pledge_card_text, pledge_card_text_chichewa,
    health_topic, audience, status,
    created_at, updated_at
) VALUES (
    '{talk_id}',
    'Poison Prevention in Our Community',
    'Kupewa Unsonkho M''Mudzi Mwathu',
    '{study_id}',
    15,
    '["Open: Ask the group — has anyone here heard of someone taking poison? (normalise the conversation)", '
    '"Fact 1: At Queen Elizabeth Central Hospital, 125 people were treated for poisoning in one year — mostly young men aged 20-30", '
    '"Fact 2: Chimbulu (rat poison) kills 50% of people who take it — there is no specific antidote", '
    '"Fact 3: 70% of poisoning cases are intentional — often after arguments, heartbreak, or family problems", '
    '"Danger signs to watch for: vomiting, confusion, very low energy, collapse", '
    '"What to do: Rush to hospital IMMEDIATELY — every minute counts. Do NOT wait to see if they get better", '
    '"Prevention: Lock away pesticides. Talk to young men about seeking help when distressed. '
    'If someone talks about poison, take it seriously", '
    '"Close: Repeat the key message — Chimbulu kills, but we can prevent it together"]'::jsonb,
    '["Tiyambire — kodi munalibe wina amene wamva za munthu wamwa cholemera? (tichotsenepo manyazi)", '
    '"Chilichonse 1: Ku Chipatala cha QECH, anthu 125 adalandira chithandizo cholemera m''zaka imodzi — ambiri ndi athanzi a 20-30", '
    '"Chilichonse 2: Chimbulu (faini ya fumbi) imamalitsa anthu 50% omwe amamwa — mulibe mankhwala osokoneza", '
    '"Chilichonse 3: 70% ya odwala ndi omwe amafuna — kawirikawiri atatha kufikirana, kupsinjika mtima, kapena mavuto a banja", '
    '"Zizindikiro zoopsya: kunyansa, kukhutira mtima, kuchepa mphamvu, kugwa", '
    '"Chithandizo: Pita ku chipatala MWADZIDZIDZI — nthawi ndi yofunika kwambiri. Usayembekezere kuona ngati akutsika", '
    '"Kupewa: Sungani zolemera kumbali. Kambiranani ndi athanzi a 20-30 za kufunira thandizo akadzakhutira mtima. '
    'Ngati munthu akukamba za cholemera, muzisamala nazo", '
    '"Makalata: Bweretsani mawu ofunika — Chimbulu imamalitsa, koma titha kupewa limodzi"]'::jsonb,
    '["Have you or someone you know been affected by poisoning? What happened?", '
    '"Why do you think young men are the ones most likely to take poison?", '
    '"What can our community do to help people who are struggling with family or relationship problems?", '
    '"How can we make sure pesticides are stored safely in our village?"]'::jsonb,
    'I pledge to keep my family safe from poison by: '
    '(1) Storing all pesticides in a locked place away from food and children; '
    '(2) Talking to young people about seeking help when they feel hopeless; '
    '(3) If someone talks about taking poison, I will take it seriously and get help; '
    '(4) Knowing where the nearest hospital is and the emergency number; '
    '(5) Sharing what I learned today with my neighbours.',
    'Ndimalira ndi kuthira kuti ndichitse banja langa kuti liri bwino ndi kulemekezedwa ndi kulemekezedwa ndi anthu: '
    '(1) Sungani zolemera zonse m''chipinda chotsekera kumbali ya chakudya ndi ana; '
    '(2) Kambiranani ndi athanzi za kufunira thandizo akadzakhutira mtima; '
    '(3) Ngati munthu akukamba za kumwa cholemera, ndidzazisamala nazo ndipo ndifuna thandizo; '
    '(4) Dziwani kwathu chipatala chathu pafupi ndi nambara ya pachuma; '
    '(5) Gawilani zomwe ndaphunzira lero ndi anzathu ozungulira.',
    'acute_poisoning',
    'community',
    'approved',
    '{ts}',
    '{ts}'
) ON CONFLICT DO NOTHING;
""")

    # ── VERIFICATION ──────────────────────────────────────────────
    lines.append("-- ── VERIFICATION QUERIES ────────────────────────────────────────")
    lines.append("-- Run these to confirm the seed data loaded correctly:")
    lines.append("")
    lines.append("-- Study with methodology + statistics")
    lines.append("SELECT study_id, title, study_design, sample_size, study_period_start, study_period_end,")
    lines.append("       jsonb_array_length(key_statistical_findings) AS findings_count,")
    lines.append("       jsonb_array_length(limitations) AS limitations_count,")
    lines.append("       jsonb_array_length(references_cited) AS references_count")
    lines.append("FROM research_studies;")
    lines.append("")
    lines.append("-- Assets with evidence refs")
    lines.append("SELECT asset_id, title, asset_type, jsonb_array_length(evidence_refs) AS evidence_count")
    lines.append("FROM knowledge_assets;")
    lines.append("")
    lines.append("-- Guide with clinical decision points")
    lines.append("SELECT guide_id, title, severity,")
    lines.append("       jsonb_array_length(treatment_limitations) AS limitations_count,")
    lines.append("       jsonb_array_length(clinical_decision_points) AS decision_points_count")
    lines.append("FROM self_care_guides;")
    lines.append("")
    lines.append("-- Health talks")
    lines.append("SELECT talk_id, title, duration_minutes FROM community_health_talks;")
    lines.append("")
    lines.append(f"-- IDs for API testing:")
    lines.append(f"-- study_id:      {study_id}")
    lines.append(f"-- asset1_id:     {asset1_id}  (CHW Brief)")
    lines.append(f"-- asset2_id:     {asset2_id}  (Infographic)")
    lines.append(f"-- asset3_id:     {asset3_id}  (Poster)")
    lines.append(f"-- guide_id:      {guide_id}")
    lines.append(f"-- talk_id:       {talk_id}")
    lines.append("")

    with open(OUTPUT_SQL, "w") as f:
        f.write("\n".join(lines))

    print(f"Generated SAMALA-AI seed SQL: {OUTPUT_SQL}")
    print(f"  Study:     {study_id}")
    print(f"  Assets:    {asset1_id} (brief), {asset2_id} (infographic), {asset3_id} (poster)")
    print(f"  Guide:     {guide_id}")
    print(f"  Talk:      {talk_id}")
    print(f"\nTo load: psql -d zisamale -f {OUTPUT_SQL}")


if __name__ == "__main__":
    main()
