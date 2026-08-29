import { useState, useEffect } from "react";
import { api } from "../services/api";
import { getTopicTheme, getAssetTypeTheme, getStatusTheme } from "../design/topicTheme";
import { Icon, type IconName } from "../components/design/Icon";
import type { PipelineNode, PipelineLink } from "../types";

function formatTopic(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PipelineView() {
  const [nodes, setNodes] = useState<PipelineNode[]>([]);
  const [links, setLinks] = useState<PipelineLink[]>([]);
  const [summary, setSummary] = useState({ total_studies: 0, total_assets: 0, total_deployments: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topicFilter, setTopicFilter] = useState<string>("");

  useEffect(() => {
    api
      .getPipeline()
      .then((data) => {
        setNodes(data.nodes);
        setLinks(data.links);
        setSummary(data.summary);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const studies = nodes.filter((n) => n.type === "study");
  const assets = nodes.filter((n) => n.type === "asset");
  const deployments = nodes.filter((n) => n.type === "deployment");

  const filteredStudies = topicFilter
    ? studies.filter((n) => n.topic === topicFilter)
    : studies;
  const filteredAssets = topicFilter
    ? assets.filter((n) => n.topic === topicFilter)
    : assets;
  const filteredDeployments = topicFilter
    ? deployments.filter((n) => n.topic === topicFilter)
    : deployments;

  const allTopics = [...new Set(nodes.map((n) => n.topic).filter(Boolean))].sort();

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-64 bg-parchment rounded animate-pulse" />
        <div className="h-48 bg-parchment rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-apple-blue">
          Knowledge Pipeline
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          Research studies to community impact flow
        </p>
      </div>

      <div className="flex items-center gap-4 md:gap-6 bg-white rounded-lg border border-stone-200 p-4 flex-wrap">
        <div className="text-center">
          <div className="font-display text-3xl font-bold text-apple-blue">{summary.total_studies}</div>
          <div className="text-xs text-stone-500">Studies</div>
        </div>
        <div className="text-2xl text-stone-300">{"\u2192"}</div>
        <div className="text-center">
          <div className="font-display text-3xl font-bold text-apple-gray600">{summary.total_assets}</div>
          <div className="text-xs text-stone-500">Assets</div>
        </div>
        <div className="text-2xl text-stone-300">{"\u2192"}</div>
        <div className="text-center">
          <div className="font-display text-3xl font-bold text-green-600">{summary.total_deployments}</div>
          <div className="text-xs text-stone-500">Deployments</div>
        </div>
        <div className="ml-auto">
          <select
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
            aria-label="Filter pipeline by topic"
            className="border border-stone-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">All Topics</option>
            {allTopics.map((t) => (
              <option key={t} value={t}>{formatTopic(t!)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div>
          <h3 className="font-display font-bold text-apple-blue mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-apple-blue text-white flex items-center justify-center text-xs">1</span>
            Studies ({filteredStudies.length})
          </h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredStudies.map((study) => (
              <div key={study.id} className="bg-white border border-stone-200 rounded-lg p-3 hover:shadow-sm">
                <div className="text-sm font-medium text-apple-blue line-clamp-2">{study.label}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {study.status && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStatusTheme(study.status).bgTailwind} ${getStatusTheme(study.status).textTailwind}`}>
                      {study.status}
                    </span>
                  )}
                  {study.topic && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getTopicTheme(study.topic).bgTailwind} ${getTopicTheme(study.topic).textTailwind}`}>
                      {formatTopic(study.topic)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-display font-bold text-apple-gray600 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-apple-gray600 text-white flex items-center justify-center text-xs">2</span>
            Assets ({filteredAssets.length})
          </h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredAssets.map((asset) => (
              <div key={asset.id} className="bg-white border border-stone-200 rounded-lg p-3 hover:shadow-sm">
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">
                    <Icon name={getAssetTypeTheme(asset.asset_type || "").icon as IconName} size={14} color={getAssetTypeTheme(asset.asset_type || "").hex} weight="fill" />
                  </span>
                  <div className="text-sm font-medium text-apple-blue line-clamp-2">{asset.label}</div>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {asset.status && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getStatusTheme(asset.status).bgTailwind} ${getStatusTheme(asset.status).textTailwind}`}>
                      {asset.status}
                    </span>
                  )}
                  {asset.asset_type && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-600">
                      {asset.asset_type.replace(/_/g, " ")}
                    </span>
                  )}
                  {asset.topic && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getTopicTheme(asset.topic).bgTailwind} ${getTopicTheme(asset.topic).textTailwind}`}>
                      {formatTopic(asset.topic)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-display font-bold text-green-700 mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-green-600 text-white flex items-center justify-center text-xs">3</span>
            Deployments ({filteredDeployments.length})
          </h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredDeployments.length === 0 ? (
              <div className="text-center py-8 text-stone-400 text-sm">
                No deployments yet
              </div>
            ) : (
              filteredDeployments.map((dep) => (
                <div key={dep.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-sm font-medium text-green-800">{dep.label}</div>
                  {dep.topic && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full mt-1 inline-block ${getTopicTheme(dep.topic).bgTailwind} ${getTopicTheme(dep.topic).textTailwind}`}>
                      {formatTopic(dep.topic)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-sm text-stone-500 text-center flex items-center justify-center gap-2">
        <Icon name="ArrowsSplit" size={16} color="#8e8e93" />
        <span>{links.length} connections between studies, assets, and deployments</span>
      </div>
    </div>
  );
}
