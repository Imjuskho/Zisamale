import { useRef, useMemo } from "react";
import { useParticles } from "./useParticles";
import { DEFAULT_CONFIG } from "./types";
import type { ParticleConfig, MapTarget } from "./types";

interface ParticleCanvasProps {
  /** Override default particle config */
  config?: Partial<ParticleConfig>;
  /** Dark mode flag (controls particle color) */
  dark?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Map attraction targets (normalized 0..1). Enables map mode when provided. */
  mapTargets?: MapTarget[];
}

/**
 * Interactive particle canvas for login page hero.
 *
 * Features:
 * - Drifting particles with gentle random motion
 * - Mouse/touch repulsion physics
 * - Connection lines between nearby particles
 * - Click/tap burst effects
 * - Spatial hashing for O(n) performance
 * - Map mode: particles converge to form a silhouette (e.g. Malawi)
 * - Breathing animation when in map mode
 * - Respects prefers-reduced-motion
 * - Pauses when tab is hidden
 */
export function ParticleCanvas({ config: overrides, dark = true, className = "", mapTargets }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const config = { ...DEFAULT_CONFIG, ...overrides };
  const viewportWidth = typeof window === "undefined" ? 1440 : window.innerWidth;

  // Scale particle count by viewport width
  const scaledConfig = {
    ...config,
    count: Math.floor(config.count * Math.min(viewportWidth / 1440, 1)),
    // If mapTargets provided, enable map mode automatically
    ...(mapTargets && mapTargets.length > 0
      ? { mapMode: true, attractForce: 0.0015, breatheAmplitude: 0.008, breatheSpeed: 0.65 }
      : {}),
  };

  const reducedMotion = typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Memoize mapTargets to avoid re-init on every render
  const memoizedTargets = useMemo(() => mapTargets, [mapTargets]);

  useParticles(canvasRef, scaledConfig, { dark, reducedMotion, mapTargets: memoizedTargets });

  return (
    <canvas
      ref={canvasRef}
      className={`particle-canvas ${className}`}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "auto",
        zIndex: 0,
      }}
    />
  );
}
