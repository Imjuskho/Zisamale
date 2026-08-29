import { useState, useEffect } from "react";
import { api } from "../services/api";
import { getSeverityTheme } from "../design/topicTheme";
import type { SelfCareGuide, CommunityHealthTalk } from "../types";

export function PocketCardPage() {
  const [guides, setGuides] = useState<SelfCareGuide[]>([]);
  const [talks, setTalks] = useState<CommunityHealthTalk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getSelfCareGuides(), api.getHealthTalks()])
      .then(([g, t]) => { setGuides(g); setTalks(t); })
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-parchment rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-parchment rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="print:hidden">
        <h1 className="font-display text-2xl font-bold text-apple-blue">
          CHW Pocket Cards
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Laminated quick-reference cards for CHWs — top danger signs and immediate actions per topic
        </p>
        <button
          onClick={handlePrint}
          className="mt-3 bg-apple-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-apple-blue/90"
        >
          Print All Cards (4 per page)
        </button>
      </div>

      {guides.length === 0 && talks.length === 0 ? (
        <div className="text-center py-12 text-stone-500">
          <p className="font-medium">No pocket cards available yet</p>
          <p className="text-sm mt-1">Deploy self-care guides and health talks to generate pocket cards.</p>
        </div>
      ) : (<>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
        {guides.map((guide) => {
          const sev = getSeverityTheme(guide.severity);
          return (
            <div
              key={guide.guide_id}
              className={`print:break-inside-avoid border-2 ${sev.borderTailwind} ${sev.bgTailwind} rounded-lg p-4 print:p-3 print:max-h-[45vh]`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className={`font-display font-bold text-sm ${sev.textTailwind}`}>
                  {guide.title}
                </h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${sev.textTailwind} bg-white/60`}>
                  {guide.severity.toUpperCase()}
                </span>
              </div>

              {guide.title_chichewa && (
                <div className="text-xs text-stone-500 mb-2 italic">{guide.title_chichewa}</div>
              )}

              <div className="mb-2">
                <div className="text-[10px] font-bold text-green-700 uppercase tracking-wide">
                  Do Now / Zochita
                </div>
                <ul className="text-xs space-y-0.5 mt-0.5">
                  {(guide.what_to_do_now || []).slice(0, 3).map((item, i) => (
                    <li key={i} className="flex gap-1">
                      <span className="text-green-600 font-bold">{"\u2713"}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-2">
                <div className="text-[10px] font-bold text-red-700 uppercase tracking-wide">
                  Do NOT / Osachita
                </div>
                <ul className="text-xs space-y-0.5 mt-0.5">
                  {(guide.what_not_to_do || []).slice(0, 2).map((item, i) => (
                    <li key={i} className="flex gap-1">
                      <span className="text-red-600 font-bold">{"\u2717"}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {guide.when_to_seek_help && (
                <div className="bg-white/60 rounded px-2 py-1 mt-1">
                  <div className="text-[10px] font-bold text-red-600">
                    {"\u26A0"} SEEK HELP / FUNSANI THANDIZO
                  </div>
                  <div className="text-[10px] text-red-700">{guide.when_to_seek_help}</div>
                </div>
              )}

              <div className="text-[8px] text-stone-400 mt-2 text-center">
                Zisamale SAMALA-AI
              </div>
            </div>
          );
        })}
      </div>

      {talks.length > 0 && (
        <>
          <div className="print:hidden">
            <h2 className="font-display text-lg font-bold text-apple-blue mt-6">
              Community Health Talk Quick Cards
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
            {talks.map((talk) => (
              <div
                key={talk.talk_id}
                className="border-2 border-apple-gray600 bg-apple-gray600/5 rounded-lg p-4 print:p-3 print:max-h-[45vh] print:break-inside-avoid"
              >
                <h3 className="font-display font-bold text-sm text-apple-gray600 mb-1">
                  {talk.title}
                </h3>
                {talk.title_chichewa && (
                  <div className="text-xs text-stone-500 mb-2 italic">{talk.title_chichewa}</div>
                )}
                <div className="text-[10px] text-stone-500 mb-2">
                  {talk.duration_minutes} min | {talk.talking_points.length} points | {talk.discussion_questions.length} questions
                </div>
                <div className="space-y-1">
                  {talk.talking_points.slice(0, 4).map((point, i) => (
                    <div key={i} className="text-xs flex gap-1">
                      <span className="text-apple-gray600 font-bold">{i + 1}.</span>
                      <span className="line-clamp-1">{point}</span>
                    </div>
                  ))}
                </div>
                {talk.pledge_card_text && (
                  <div className="mt-2 bg-white/60 rounded px-2 py-1 text-[10px] italic text-apple-gray600 line-clamp-2">
                    {talk.pledge_card_text}
                  </div>
                )}
                <div className="text-[8px] text-stone-400 mt-2 text-center">Zisamale SAMALA-AI</div>
              </div>
            ))}
          </div>
        </>
      )}
      </>
      )}
    </div>
  );
}
