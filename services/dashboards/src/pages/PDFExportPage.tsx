import { useState, useEffect, useRef } from "react";
import { api } from "../services/api";
import type { MonthlyBrief, TalkPrintKit, GuidePosterData } from "../types";

type ExportTarget = "monthly_brief" | "talk_kit" | "guide_poster";

export function PDFExportPage() {
  const [target, setTarget] = useState<ExportTarget>("monthly_brief");
  const [talkId, setTalkId] = useState("");
  const [guideId, setGuideId] = useState("");
  const [talks, setTalks] = useState<Array<{ talk_id: string; title: string }>>([]);
  const [guides, setGuides] = useState<Array<{ guide_id: string; title: string }>>([]);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getHealthTalks()
      .then((t) => setTalks(t.map((x) => ({ talk_id: x.talk_id, title: x.title }))))
      .catch(() => {});
    api.getSelfCareGuides()
      .then((g) => setGuides(g.map((x) => ({ guide_id: x.guide_id, title: x.title }))))
      .catch(() => {});
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="print:hidden">
        <h1 className="font-display text-2xl font-bold text-apple-blue">
          Export & Print
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Generate printable materials for community health delivery
        </p>
      </div>

      <div className="print:hidden flex flex-wrap gap-3">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value as ExportTarget)}
          aria-label="Export format"
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="monthly_brief">Monthly Knowledge Brief</option>
          <option value="talk_kit">Community Health Talk Kit</option>
          <option value="guide_poster">Self-Care Guide Poster</option>
        </select>

        {target === "talk_kit" && (
          <select
            value={talkId}
            onChange={(e) => setTalkId(e.target.value)}
            aria-label="Select a health talk"
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Select a talk...</option>
            {talks.map((t) => (
              <option key={t.talk_id} value={t.talk_id}>{t.title}</option>
            ))}
          </select>
        )}

        {target === "guide_poster" && (
          <select
            value={guideId}
            onChange={(e) => setGuideId(e.target.value)}
            aria-label="Select a self-care guide"
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Select a guide...</option>
            {guides.map((g) => (
              <option key={g.guide_id} value={g.guide_id}>{g.title}</option>
            ))}
          </select>
        )}

        <button
          onClick={handlePrint}
          className="bg-apple-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-apple-blue/90"
        >
          Print / Save as PDF
        </button>
      </div>

      <div ref={printRef} className="bg-white">
        {target === "monthly_brief" && <MonthlyBriefPrint />}
        {target === "talk_kit" && talkId && <TalkKitPrint talkId={talkId} />}
        {target === "guide_poster" && guideId && <GuidePosterPrint guideId={guideId} />}
      </div>
    </div>
  );
}

function MonthlyBriefPrint() {
  const [brief, setBrief] = useState<MonthlyBrief | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMonthlyBrief().then(setBrief).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-stone-400">Loading brief...</div>;
  if (!brief) return <div className="p-8 text-stone-400">Failed to load brief</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto" style={{ fontFamily: "Georgia, serif" }}>
      <div className="text-center border-b-2 border-apple-blue pb-4 mb-6">
        <h1 className="text-2xl font-bold text-apple-blue">SAMALA-AI Monthly Knowledge Brief</h1>
        <div className="text-stone-500 mt-1">{brief.period}</div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-stone-50 rounded">
          <div className="text-2xl font-bold text-apple-blue">{brief.pipeline.studies_total}</div>
          <div className="text-xs text-stone-500">Research Studies</div>
        </div>
        <div className="text-center p-3 bg-stone-50 rounded">
          <div className="text-2xl font-bold text-apple-gray600">{brief.pipeline.assets_total}</div>
          <div className="text-xs text-stone-500">Knowledge Assets</div>
        </div>
        <div className="text-center p-3 bg-stone-50 rounded">
          <div className="text-2xl font-bold text-green-600">{brief.reach.households_reached}</div>
          <div className="text-xs text-stone-500">Households Reached</div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="font-bold text-apple-blue mb-2">Pipeline Status</h2>
        <div className="text-sm space-y-1">
          <div>Studies deployed: {brief.pipeline.studies_deployed} / {brief.pipeline.studies_total}</div>
          <div>Self-care guides available: {brief.pipeline.guides_total}</div>
          <div>Community health talks: {brief.pipeline.talks_total}</div>
          <div>Total deployments: {brief.reach.deployments}</div>
          <div>Individuals reached: {brief.reach.individuals_reached}</div>
        </div>
      </div>

      {brief.impact.assessments_count > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-apple-blue mb-2">Impact</h2>
          <div className="text-sm">
            Average knowledge change:{" "}
            <span className="font-bold text-green-600">
              {brief.impact.avg_knowledge_change > 0 ? "+" : ""}
              {brief.impact.avg_knowledge_change}
            </span>{" "}
            across {brief.impact.assessments_count} assessments
          </div>
        </div>
      )}

      {brief.top_topics.length > 0 && (
        <div className="mb-6">
          <h2 className="font-bold text-apple-blue mb-2">Topic Coverage</h2>
          <div className="flex flex-wrap gap-2">
            {brief.top_topics.map(([topic, count]) => (
              <span key={topic} className="text-xs bg-stone-100 rounded-full px-3 py-1">
                {topic.replace(/_/g, " ")}: {count} assets
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-xs text-stone-400 mt-8 border-t border-stone-200 pt-4">
        Generated by Zisamale SAMALA-AI | {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}

function TalkKitPrint({ talkId }: { talkId: string }) {
  const [kit, setKit] = useState<TalkPrintKit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getTalkPrintKit(talkId).then(setKit).finally(() => setLoading(false));
  }, [talkId]);

  if (loading) return <div className="p-8 text-stone-400">Loading talk kit...</div>;
  if (!kit) return <div className="p-8 text-stone-400">Failed to load talk kit</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto" style={{ fontFamily: "Georgia, serif" }}>
      <div className="text-center border-b-2 border-apple-gray600 pb-4 mb-6">
        <div className="text-xs text-apple-gray600 uppercase tracking-wide">Community Health Talk</div>
        <h1 className="text-2xl font-bold text-apple-blue mt-1">{kit.title}</h1>
        {kit.title_chichewa && (
          <div className="text-lg text-apple-gray600 mt-1">{kit.title_chichewa}</div>
        )}
        <div className="text-sm text-stone-500 mt-2">
          Topic: {kit.topic.replace(/_/g, " ")} | Duration: {kit.duration_minutes} minutes
        </div>
      </div>

      {kit.source_study && (
        <div className="bg-stone-50 rounded p-3 mb-6 text-sm">
          <div className="font-bold text-apple-blue">Source Research</div>
          <div>{kit.source_study.title}</div>
          {kit.source_study.authors.length > 0 && (
            <div className="text-stone-500">{kit.source_study.authors.join(", ")}</div>
          )}
        </div>
      )}

      <div className="mb-6">
        <h2 className="font-bold text-apple-blue text-lg mb-3 border-b border-stone-200 pb-1">
          Talking Points
        </h2>
        <div className="space-y-4">
          {kit.talking_points.map((point, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-apple-blue text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{point}</div>
                {kit.talking_points_chichewa[i] && (
                  <div className="text-sm text-apple-gray600 mt-1 italic">
                    {kit.talking_points_chichewa[i]}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="font-bold text-apple-blue text-lg mb-3 border-b border-stone-200 pb-1">
          Discussion Questions
        </h2>
        <div className="space-y-2">
          {kit.discussion_questions.map((q, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <span className="text-apple-gray600 font-bold">Q{i + 1}.</span>
              <span>{q}</span>
            </div>
          ))}
        </div>
      </div>

      {kit.pledge_card_text && (
        <div className="border-2 border-apple-gray600 rounded-lg p-5 bg-apple-gray600/5">
          <h2 className="font-bold text-apple-gray600 text-lg mb-2 text-center">Pledge Card</h2>
          <div className="text-sm text-center italic">{kit.pledge_card_text}</div>
          {kit.pledge_card_text_chichewa && (
            <div className="text-sm text-apple-gray600 text-center mt-2 italic">
              {kit.pledge_card_text_chichewa}
            </div>
          )}
        </div>
      )}

      <div className="text-center text-xs text-stone-400 mt-8 border-t border-stone-200 pt-4">
        Zisamale SAMALA-AI | Community Health Talk Kit | {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}

function GuidePosterPrint({ guideId }: { guideId: string }) {
  const [poster, setPoster] = useState<GuidePosterData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getGuidePosterData(guideId).then(setPoster).finally(() => setLoading(false));
  }, [guideId]);

  if (loading) return <div className="p-8 text-stone-400">Loading poster...</div>;
  if (!poster) return <div className="p-8 text-stone-400">Failed to load poster data</div>;

  const severityColor =
    poster.severity === "emergency" ? "border-red-500 bg-red-50" :
    poster.severity === "warning" ? "border-amber-500 bg-amber-50" :
    "border-blue-500 bg-blue-50";

  return (
    <div className="p-8 max-w-2xl mx-auto" style={{ fontFamily: "Georgia, serif" }}>
      <div className={`border-2 rounded-lg overflow-hidden ${severityColor}`}>
        <div className="p-6 text-center">
          <div className="text-xs uppercase tracking-wide opacity-60 mb-1">
            Self-Care Guide
          </div>
          <h1 className="text-2xl font-bold">{poster.title}</h1>
          {poster.title_chichewa && (
            <div className="text-lg mt-1 opacity-80">{poster.title_chichewa}</div>
          )}
        </div>

        <div className="px-6 pb-6 space-y-4">
          {poster.what_it_is && (
            <div>
              <div className="font-bold text-sm mb-1">What is it?</div>
              <div className="text-sm">{poster.what_it_is}</div>
              {poster.what_it_is_chichewa && (
                <div className="text-sm opacity-70 mt-1 italic">{poster.what_it_is_chichewa}</div>
              )}
            </div>
          )}

          <div>
            <div className="font-bold text-sm text-green-700 mb-1">What to do now:</div>
            <ul className="text-sm space-y-1">
              {poster.what_to_do_now.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-green-600">{"\u2713"}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {poster.what_to_do_now_chichewa.length > 0 && (
              <ul className="text-sm space-y-1 mt-2 opacity-70 italic">
                {poster.what_to_do_now_chichewa.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-green-600">{"\u2713"}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="font-bold text-sm text-red-700 mb-1">What NOT to do:</div>
            <ul className="text-sm space-y-1">
              {poster.what_not_to_do.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-red-600">{"\u2717"}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {poster.when_to_seek_help && (
            <div className="border-t border-current/20 pt-3">
              <div className="font-bold text-sm text-red-700 mb-1">
                When to seek help immediately:
              </div>
              <div className="text-sm font-medium">{poster.when_to_seek_help}</div>
              {poster.when_to_seek_help_chichewa && (
                <div className="text-sm opacity-70 mt-1 italic">
                  {poster.when_to_seek_help_chichewa}
                </div>
              )}
            </div>
          )}

          {poster.prevention.length > 0 && (
            <div className="border-t border-current/20 pt-3">
              <div className="font-bold text-sm mb-1">Prevention:</div>
              <ul className="text-sm space-y-1">
                {poster.prevention.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span>{"\u2022"}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-stone-400 mt-6">
        Zisamale SAMALA-AI Self-Care Guide | {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}
