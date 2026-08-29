import { useState, useEffect } from "react";
import { api } from "../services/api";
import { getTopicTheme, getAssetTypeTheme, type TopicTheme } from "../design/topicTheme";
import { Icon, type IconName } from "../components/design/Icon";
import type { TopicSummary } from "../types";

function TopicIcon({ theme, size = 28 }: { theme: TopicTheme; size?: number }) {
  return (
    <div
      className="rounded-lg flex items-center justify-center"
      style={{ backgroundColor: theme.hex + "18", width: size + 12, height: size + 12 }}
    >
      <Icon name={theme.icon as IconName} size={size} color={theme.hex} weight="fill" />
    </div>
  );
}

export function KnowledgeTopicBrowser() {
  const [topics, setTopics] = useState<TopicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getKnowledgeTopics()
      .then(setTopics)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const totalStudies = topics.reduce((s, t) => s + t.study_count, 0);
  const totalAssets = topics.reduce((s, t) => s + t.asset_count, 0);
  const totalDeployments = topics.reduce((s, t) => s + t.deployment_count, 0);
  const totalHH = topics.reduce((s, t) => s + t.households_reached, 0);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 bg-parchment rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-parchment rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error loading topics: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-apple-blue">
          Knowledge Topics
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Browse research topics, assets, guides, and community health talks
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Topics", value: topics.length, color: "text-apple-blue" },
          { label: "Studies", value: totalStudies, color: "text-apple-gray600" },
          { label: "Assets", value: totalAssets, color: "text-blue-600" },
          { label: "Deployments", value: totalDeployments, color: "text-green-600" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-lg border border-stone-200 p-4 text-center"
          >
            <div className={`font-display text-3xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
            <div className="text-xs text-stone-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topics.map((topic) => {
          const theme = getTopicTheme(topic.health_topic);
          return (
            <div
              key={topic.health_topic}
              className={`rounded-lg border p-5 transition-shadow hover:shadow-md ${theme.bgTailwind} ${theme.textTailwind} ${theme.borderTailwind}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <TopicIcon theme={theme} />
                <div>
                  <h3 className="font-display font-bold text-lg">
                    {theme.label}
                  </h3>
                  {theme.labelNy !== theme.label && (
                    <div className="text-xs opacity-60 italic">{theme.labelNy}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-white/60 rounded px-3 py-2">
                  <div className="font-display font-bold text-lg">{topic.study_count}</div>
                  <div className="text-xs opacity-70">Studies</div>
                </div>
                <div className="bg-white/60 rounded px-3 py-2">
                  <div className="font-display font-bold text-lg">{topic.asset_count}</div>
                  <div className="text-xs opacity-70">Assets</div>
                </div>
                <div className="bg-white/60 rounded px-3 py-2">
                  <div className="font-display font-bold text-lg">{topic.guide_count}</div>
                  <div className="text-xs opacity-70">Guides</div>
                </div>
                <div className="bg-white/60 rounded px-3 py-2">
                  <div className="font-display font-bold text-lg">{topic.talk_count}</div>
                  <div className="text-xs opacity-70">Talks</div>
                </div>
              </div>

              {topic.deployment_count > 0 && (
                <div className="mt-3 bg-white/60 rounded px-3 py-2 text-sm">
                  <span className="font-display font-bold">{topic.deployment_count}</span> deployments
                  <span className="mx-1 opacity-40">|</span>
                  <span className="font-display font-bold">{topic.households_reached}</span> households reached
                </div>
              )}

              {Object.keys(topic.asset_types).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(topic.asset_types).map(([type, count]) => {
                    const typeTheme = getAssetTypeTheme(type);
                    return (
                      <span
                        key={type}
                        className={`text-[10px] rounded-full px-2 py-0.5 font-display ${typeTheme.bgTailwind} ${typeTheme.textTailwind}`}
                      >
                        {typeTheme.label}: {count}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalHH > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <span className="font-display text-2xl font-bold text-green-700">
            {totalHH.toLocaleString()}
          </span>
          <span className="text-green-600 ml-2">households reached across all topics</span>
        </div>
      )}
    </div>
  );
}
