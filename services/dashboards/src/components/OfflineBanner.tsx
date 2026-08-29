import { useEffect, useState } from "react";
import { useAppSelector } from "../hooks/useRedux";

/**
 * Global connectivity banner. Shows when the browser reports offline or
 * when an open alert socket has errored (the socket only exists on pages
 * that connect it, so "disconnected" alone is not evidence of an outage).
 * Reuses the .offline-banner styles in index.css.
 */
export function OfflineBanner() {
  const wsStatus = useAppSelector((s) => s.dashboard.wsStatus);
  const [browserOffline, setBrowserOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setBrowserOffline(true);
    const goOnline = () => setBrowserOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (browserOffline || wsStatus === "error") {
    return (
      <div className="offline-banner" role="status">
        Muli pa intaneti — muli ndi zosunga zanu / You are offline — your data is saved locally
      </div>
    );
  }
  return null;
}
