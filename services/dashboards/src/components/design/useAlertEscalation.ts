import { useState, useEffect, useCallback } from "react";
import type { Alert, AlertActionType } from "../../types";

interface UseAlertEscalationProps {
  alert: Alert;
  onEscalate?: (alertId: string) => void | Promise<void>;
  escalationMinutes?: number;
}

interface AlertLifecycle {
  status: Alert["response_status"];
  acknowledgedAt: string | null;
  actionedAt: string | null;
  lastAction: AlertActionType | null;
  timeSinceAck: string | null;
  isEscalated: boolean;
  acknowledge: () => void;
  takeAction: (action: AlertActionType) => void;
}

/**
 * Hook managing the full alert lifecycle per §5.4:
 * acknowledge → timestamp → action → escalation
 */
export function useAlertEscalation({
  alert,
  onEscalate,
  escalationMinutes = 240,
}: UseAlertEscalationProps): AlertLifecycle {
  const [status, setStatus] = useState<Alert["response_status"]>(alert.response_status);
  const [acknowledgedAt, setAcknowledgedAt] = useState<string | null>(null);
  const [actionedAt, setActionedAt] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<AlertActionType | null>(null);
  const [isEscalated, setIsEscalated] = useState(false);

  const acknowledge = useCallback(() => {
    const now = new Date().toISOString();
    setStatus("acknowledged");
    setAcknowledgedAt(now);
  }, []);

  const takeAction = useCallback(
    (action: AlertActionType) => {
      const now = new Date().toISOString();
      setLastAction(action);
      setActionedAt(now);
      setStatus(action === "dismiss" ? "resolved" : "in_progress");
    },
    []
  );

  // Escalation timer
  useEffect(() => {
    if (status !== "acknowledged" || !acknowledgedAt) return;

    const ackTime = new Date(acknowledgedAt).getTime();
    const escalationMs = escalationMinutes * 60_000;

    const check = () => {
      const elapsed = Date.now() - ackTime;
      if (elapsed >= escalationMs && !isEscalated) {
        setIsEscalated(true);
        onEscalate?.(alert.alert_id);
      }
    };

    const interval = setInterval(check, 30_000);
    check();

    return () => clearInterval(interval);
  }, [status, acknowledgedAt, escalationMinutes, alert.alert_id, onEscalate, isEscalated]);

  const timeSinceAck = acknowledgedAt
    ? formatElapsed(Date.now() - new Date(acknowledgedAt).getTime())
    : null;

  return {
    status,
    acknowledgedAt,
    actionedAt,
    lastAction,
    timeSinceAck,
    isEscalated,
    acknowledge,
    takeAction,
  };
}

function formatElapsed(ms: number): string {
  if (ms < 0) return "just now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
