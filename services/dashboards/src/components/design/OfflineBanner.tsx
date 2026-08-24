import { strings } from "../../i18n";
import { Icon } from "./Icon";

interface OfflineBannerProps {
  onSync?: () => void;
}

export function OfflineBanner({ onSync }: OfflineBannerProps) {
  return (
    <div className="offline-banner animate-slide-in">
      <div className="max-w-4xl mx-auto flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Icon name="WifiSlash" size={20} color="#fff" />
          <span>{strings.offlineTitle.ny}</span>
        </div>
        {onSync && (
          <button
            onClick={onSync}
            className="text-caption font-semibold bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition-colors flex items-center gap-1.5"
          >
            <Icon name="CloudArrowUp" size={14} color="#fff" />
            {strings.syncNow.ny}
          </button>
        )}
      </div>
    </div>
  );
}
