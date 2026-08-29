export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  opacity: number;
  baseOpacity: number;
  /** How strongly this particle reacts to mouse proximity (0-1) */
  reactivity: number;
  /** Hue shift for active particles near cursor */
  active: number;
  /** Target position when in map mode [0..1] canvas-normalized */
  targetX: number;
  targetY: number;
  /** True if this particle represents Lake Malawi — always renders blue */
  isLake: boolean;
}

export interface MapTarget {
  x: number;
  y: number;
  isLake: boolean;
}

export interface ParticleConfig {
  /** Number of particles (scaled by viewport) */
  count: number;
  /** Maximum connection distance between particles */
  connectionDistance: number;
  /** Mouse repulsion radius */
  mouseRadius: number;
  /** Mouse repulsion force multiplier */
  mouseForce: number;
  /** Base drift speed */
  driftSpeed: number;
  /** Particle color on light backgrounds */
  colorLight: string;
  /** Particle color on dark backgrounds */
  colorDark: string;
  /** Line opacity for connections */
  lineOpacity: number;
  /** Burst particle count on click */
  burstCount: number;
  /** Burst particle lifetime (ms) */
  burstLifetime: number;
  /** If true, particles are attracted to mapTarget positions */
  mapMode: boolean;
  /** Spring force pulling particles toward their target (0 = off, higher = stiffer) */
  attractForce: number;
  /** How much target positions drift/breathe */
  breatheAmplitude: number;
  /** Breathe speed (radians per second) */
  breatheSpeed: number;
}

export interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  life: number;
  maxLife: number;
}

export interface MouseState {
  x: number;
  y: number;
  active: boolean;
  pressed: boolean;
}

export const DEFAULT_CONFIG: ParticleConfig = {
  count: 100,
  connectionDistance: 180,
  mouseRadius: 150,
  mouseForce: 0.8,
  driftSpeed: 0.3,
  colorLight: "rgba(0, 102, 204, 0.35)",
  colorDark: "rgba(255, 255, 255, 0.55)",
  lineOpacity: 0.06,
  burstCount: 14,
  burstLifetime: 2200,
  mapMode: false,
  attractForce: 0,
  breatheAmplitude: 0,
  breatheSpeed: 0,
};
