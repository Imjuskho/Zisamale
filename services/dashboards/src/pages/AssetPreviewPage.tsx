import { useState, useEffect } from "react";
import { api } from "../services/api";
import { getTopicTheme, getAssetTypeTheme, getSeverityTheme, ALL_TOPIC_KEYS } from "../design/topicTheme";
import type { KnowledgeAsset, AssetType } from "../types";

const ASSET_TYPES: AssetType[] = [
  "chw_brief", "infographic", "poster", "flipbook",
  "video", "audio", "sms", "community_talk",
];

export function AssetPreviewPage() {
  const [assets, setAssets] = useState<KnowledgeAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  useEffect(() => {
    const params: { health_topic?: string; asset_type?: string } = {};
    if (topicFilter) params.health_topic = topicFilter;
    if (typeFilter) params.asset_type = typeFilter;
    setLoading(true);
    api
      .getKnowledgeAssets(Object.keys(params).length ? params : undefined)
      .then(setAssets)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [topicFilter, typeFilter]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-apple-blue">
          Knowledge Assets
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Side-by-side English and Chichewa translations
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          aria-label="Filter by health topic"
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Topics</option>
          {ALL_TOPIC_KEYS.map((t) => {
            const theme = getTopicTheme(t);
            return (
              <option key={t} value={t}>{theme.label}</option>
            );
          })}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by asset type"
          className="border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">All Types</option>
          {ASSET_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </select>
        <div className="flex items-center text-sm text-stone-500">
          {assets.length} asset{assets.length !== 1 ? "s" : ""}
        </div>
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-parchment rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error: {error}
        </div>
      )}

      {!loading && !error && assets.length === 0 && (
        <div className="text-center py-12 text-stone-400">
          No assets found matching your filters.
        </div>
      )}

      {!loading && !error && assets.map((asset) => (
        <div
          key={asset.asset_id}
          className="bg-white border border-stone-200 rounded-lg overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-stone-50 border-b border-stone-200">
            <span className={`text-xs px-2 py-0.5 rounded-full font-display ${getSeverityTheme(asset.severity).bgTailwind} ${getSeverityTheme(asset.severity).textTailwind}`}>
              {asset.severity}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-display ${getAssetTypeTheme(asset.asset_type).bgTailwind} ${getAssetTypeTheme(asset.asset_type).textTailwind}`}>
              {asset.asset_type.replace(/_/g, " ")}
            </span>
            <span className="text-xs text-stone-400 ml-auto">
              {getTopicTheme(asset.health_topic).label}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-stone-200">
            <div className="p-5">
              <div className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-2">
                English
              </div>
              <h3 className="font-display font-bold text-lg text-apple-blue mb-2">
                {asset.title}
              </h3>
              <p className="text-sm text-stone-700 mb-3">{asset.key_finding}</p>
              {asset.actionable_takeaways.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-stone-500 mb-1">Key Actions:</div>
                  <ul className="text-sm text-stone-600 space-y-1">
                    {asset.actionable_takeaways.map((t, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-green-600 mt-0.5">{"\u2713"}</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="p-5 bg-stone-50/50">
              <div className="text-xs font-bold text-apple-gray600 uppercase tracking-wide mb-2">
                Chichewa
              </div>
              <h3 className="font-display font-bold text-lg text-apple-gray600 mb-2">
                {asset.title_chichewa || "Not translated"}
              </h3>
              <p className="text-sm text-stone-600 mb-3">
                {asset.key_finding_chichewa || "Not translated"}
              </p>
              {asset.actionable_takeaways_chichewa.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-stone-500 mb-1">Zochita Zofunika:</div>
                  <ul className="text-sm text-stone-600 space-y-1">
                    {asset.actionable_takeaways_chichewa.map((t, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-apple-gray600 mt-0.5">{"\u2713"}</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
