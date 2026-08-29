import { useState, useEffect } from "react";
import { api } from "../services/api";
import type { TalkFlipbookData, CommunityHealthTalk } from "../types";

const PAGE_TYPE_STYLES: Record<string, { bg: string; border: string; label: string }> = {
  talking_point: { bg: "bg-white", border: "border-apple-blue", label: "Talking Point" },
  discussion_question: { bg: "bg-blue-50", border: "border-blue-300", label: "Discussion" },
  pledge_card: { bg: "bg-amber-50", border: "border-apple-gray600", label: "Pledge Card" },
};

export function FlipbookPage() {
  const [talks, setTalks] = useState<CommunityHealthTalk[]>([]);
  const [selectedTalkId, setSelectedTalkId] = useState<string>("");
  const [flipbook, setFlipbook] = useState<TalkFlipbookData | null>(null);
  const [loading, setLoading] = useState(false);
  const [talksLoading, setTalksLoading] = useState(true);

  useEffect(() => {
    api.getHealthTalks().then(setTalks).finally(() => setTalksLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedTalkId) { setFlipbook(null); return; }
    setLoading(true);
    api.getTalkFlipbookData(selectedTalkId).then(setFlipbook).finally(() => setLoading(false));
  }, [selectedTalkId]);

  const handlePrint = () => window.print();

  return (
    <div className="p-6 space-y-6">
      <div className="print:hidden">
        <h1 className="font-display text-2xl font-bold text-apple-blue">
          Community Health Talk Flipbook
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Printable flipbook for village health meetings — one page per talking point
        </p>

        <div className="flex items-center gap-3 mt-3">
          <select
            value={selectedTalkId}
            onChange={(e) => setSelectedTalkId(e.target.value)}
            aria-label="Select a health talk for flipbook"
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Select a talk...</option>
            {talks.map((t) => (
              <option key={t.talk_id} value={t.talk_id}>
                {t.title} ({t.duration_minutes} min)
              </option>
            ))}
          </select>
          {flipbook && (
            <button
              onClick={handlePrint}
              className="bg-apple-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-apple-blue/90"
            >
              Print Flipbook ({flipbook.total_pages} pages)
            </button>
          )}
        </div>
      </div>

      {talksLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-parchment rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-stone-400">Loading flipbook...</div>
      )}

      {!loading && !flipbook && selectedTalkId && (
        <div className="text-center py-12 text-stone-400">Failed to load flipbook data</div>
      )}

      {flipbook && (
        <div className="space-y-4">
          {/* Cover page */}
          <div className="bg-apple-blue text-white rounded-lg p-8 text-center print:break-after-page print:max-h-[90vh]">
            <div className="text-xs uppercase tracking-widest opacity-60 mb-2">
              Community Health Talk
            </div>
            <h2 className="font-display text-3xl font-bold mb-2">
              {flipbook.title}
            </h2>
            {flipbook.title_chichewa && (
              <div className="text-xl opacity-80 mb-4">{flipbook.title_chichewa}</div>
            )}
            <div className="text-sm opacity-60">
              Topic: {flipbook.topic.replace(/_/g, " ")} | {flipbook.total_pages} pages
            </div>
            <div className="mt-8 text-xs opacity-40">
              Zisamale SAMALA-AI | Print and bind as flipbook
            </div>
          </div>

          {/* Content pages */}
          {flipbook.pages.map((page) => {
            const style = PAGE_TYPE_STYLES[page.type] || PAGE_TYPE_STYLES.talking_point;
            return (
              <div
                key={page.page_number}
                className={`${style.bg} border-2 ${style.border} rounded-lg p-8 print:break-after-page print:max-h-[90vh] print:break-inside-avoid`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-wide">
                    {style.label}
                  </span>
                  <span className="font-display text-4xl font-bold text-stone-200">
                    {page.page_number}
                  </span>
                </div>

                {/* English */}
                <div className="mb-6">
                  <div className="text-xs font-bold text-apple-blue uppercase tracking-wide mb-2">
                    English
                  </div>
                  <div className="text-xl font-display font-semibold text-apple-blue leading-relaxed">
                    {page.content_en}
                  </div>
                </div>

                {/* Chichewa */}
                {page.content_ny && page.content_ny !== page.content_en && (
                  <div className="border-t border-stone-200 pt-4">
                    <div className="text-xs font-bold text-apple-gray600 uppercase tracking-wide mb-2">
                      Chichewa
                    </div>
                    <div className="text-lg text-apple-gray600 leading-relaxed italic">
                      {page.content_ny}
                    </div>
                  </div>
                )}

                <div className="text-[8px] text-stone-300 mt-6 text-center">
                  Zisamale SAMALA-AI Flipbook
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
