import { strings } from "../i18n";

interface OfflineBannerProps {
  onSync?: () => void;
}

export function OfflineBanner({ onSync }: OfflineBannerProps) {
  return (
    <div className="offline-banner animate-slide-in">
      <div className="max-w-4xl mx-auto flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📡</span>
          <span>{strings.offlineTitle.cy}</span>
        </div>
        {onSync && (
          <button
            onClick={onSync}
            className="text-caption font-semibold bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition-colors"
          >
            {strings.syncNow.cy}
          </button>
        )}
      </div>
    </div>
  );
}
