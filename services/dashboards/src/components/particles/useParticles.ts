import { useRef, useEffect, useCallback } from "react";
import type { Particle, BurstParticle, MouseState, ParticleConfig, MapTarget } from "./types";

/**
 * Core particle physics engine.
 * Handles: drift, mouse repulsion, connection lines, click bursts,
 * and map-mode attraction (particles converge to form a silhouette).
 */
export function useParticles(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  config: ParticleConfig,
  opts?: { dark?: boolean; reducedMotion?: boolean; mapTargets?: MapTarget[] }
) {
  const particlesRef = useRef<Particle[]>([]);
  const burstsRef = useRef<BurstParticle[]>([]);
  const mouseRef = useRef<MouseState>({ x: -1000, y: -1000, active: false, pressed: false });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const dirtyRef = useRef(true);
  const hiddenRef = useRef(false);
  const timeRef = useRef(0);

  const reducedMotion = opts?.reducedMotion ?? false;
  const dark = opts?.dark ?? false;
  const mapTargets = opts?.mapTargets;

  // Spatial hash grid for O(n) neighbor lookups
  const gridRef = useRef<Map<string, number[]>>(new Map());
  const cellSize = config.connectionDistance;

  const initParticles = useCallback((width: number, height: number) => {
    const count = reducedMotion ? Math.floor(config.count * 0.5) : config.count;
    const particles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      let startX: number;
      let startY: number;
      let targetX: number;
      let targetY: number;
      let isLake = false;

      if (config.mapMode && mapTargets && mapTargets.length > 0) {
        const target = mapTargets[i % mapTargets.length];
        targetX = target.x * width;
        targetY = target.y * height;
        isLake = target.isLake;

        // Start at target position with small random offset
        const spread = Math.min(width, height) * 0.04;
        startX = targetX + (Math.random() - 0.5) * spread;
        startY = targetY + (Math.random() - 0.5) * spread;
      } else {
        startX = Math.random() * width;
        startY = Math.random() * height;
        targetX = startX;
        targetY = startY;
      }

      const baseRadius = 1 + Math.random() * 2;
      particles.push({
        x: startX,
        y: startY,
        vx: (Math.random() - 0.5) * config.driftSpeed * 0.3,
        vy: (Math.random() - 0.5) * config.driftSpeed * 0.3,
        radius: baseRadius,
        baseRadius,
        opacity: 0.3 + Math.random() * 0.5,
        baseOpacity: 0.3 + Math.random() * 0.5,
        reactivity: 0.3 + Math.random() * 0.7,
        active: isLake ? 0.6 : 0, // lake particles always glow
        targetX,
        targetY,
        isLake,
      });
    }
    particlesRef.current = particles;
  }, [config.count, config.driftSpeed, config.mapMode, reducedMotion, mapTargets]);

  const buildGrid = useCallback((_width: number, _height: number) => {
    const grid = gridRef.current;
    grid.clear();
    const ps = particlesRef.current;
    for (let i = 0; i < ps.length; i++) {
      const cx = Math.floor(ps[i].x / cellSize);
      const cy = Math.floor(ps[i].y / cellSize);
      const key = `${cx},${cy}`;
      let bucket = grid.get(key);
      if (!bucket) {
        bucket = [];
        grid.set(key, bucket);
      }
      bucket.push(i);
    }
  }, [cellSize]);

  const getNeighbors = useCallback((x: number, y: number): number[] => {
    const grid = gridRef.current;
    const cx = Math.floor(x / cellSize);
    const cy = Math.floor(y / cellSize);
    const result: number[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${cx + dx},${cy + dy}`;
        const bucket = grid.get(key);
        if (bucket) {
          for (let k = 0; k < bucket.length; k++) {
            result.push(bucket[k]);
          }
        }
      }
    }
    return result;
  }, [cellSize]);

  const addBurst = useCallback((x: number, y: number) => {
    const count = config.burstCount;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 4;
      burstsRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.5 + Math.random() * 2,
        opacity: 0.8,
        life: config.burstLifetime,
        maxLife: config.burstLifetime,
      });
    }
    dirtyRef.current = true;
  }, [config.burstCount, config.burstLifetime]);

  const tick = useCallback((dt: number) => {
    const ps = particlesRef.current;
    const bs = burstsRef.current;
    const mouse = mouseRef.current;
    const dtFactor = Math.min(dt / 16, 3);
    const canvas = canvasRef.current;
    const w = canvas?.width ?? 800;
    const h = canvas?.height ?? 600;

    timeRef.current += dt / 1000; // track time in seconds

    // Update particles
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];

      if (config.mapMode) {
        // ── MAP MODE: spring attraction + breathing ──
        // Breathing: sinusoidal offset on target position
        const breatheX = Math.sin(timeRef.current * config.breatheSpeed + i * 0.7) * config.breatheAmplitude * w;
        const breatheY = Math.cos(timeRef.current * config.breatheSpeed * 0.8 + i * 1.1) * config.breatheAmplitude * h;
        const tx = p.targetX + breatheX;
        const ty = p.targetY + breatheY;

        // Spring force toward target
        const dx = tx - p.x;
        const dy = ty - p.y;
        p.vx += dx * config.attractForce * dtFactor;
        p.vy += dy * config.attractForce * dtFactor;

        // Mouse scatter: push particles away from target temporarily
        if (!reducedMotion && mouse.active) {
          const mdx = p.x - mouse.x;
          const mdy = p.y - mouse.y;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mDist < config.mouseRadius && mDist > 1) {
            const force = (1 - mDist / config.mouseRadius) * config.mouseForce * 1.2 * p.reactivity;
            p.vx += (mdx / mDist) * force * dtFactor;
            p.vy += (mdy / mDist) * force * dtFactor;
            p.active = Math.min(p.active + 0.08 * dtFactor, 1);
          } else {
            p.active = p.isLake ? 0.6 : Math.max(p.active - 0.04 * dtFactor, 0);
          }
        }

        // Gentle damping — keeps shape but allows organic drift
        p.vx *= 0.94;
        p.vy *= 0.94;

        // Re-add small random drift so particles feel alive
        p.vx += (Math.random() - 0.5) * 0.015 * dtFactor;
        p.vy += (Math.random() - 0.5) * 0.015 * dtFactor;
      } else {
        // ── FREE DRIFT MODE ──
        p.x += p.vx * dtFactor;
        p.y += p.vy * dtFactor;

        // Mouse repulsion
        if (!reducedMotion && mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < config.mouseRadius && dist > 1) {
            const force = (1 - dist / config.mouseRadius) * config.mouseForce * p.reactivity;
            const nx = dx / dist;
            const ny = dy / dist;
            p.vx += nx * force * dtFactor;
            p.vy += ny * force * dtFactor;
            p.active = Math.min(p.active + 0.08 * dtFactor, 1);
          } else {
            p.active = p.isLake ? 0.6 : Math.max(p.active - 0.03 * dtFactor, 0);
          }
        }

        // Damping
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const maxSpeed = reducedMotion ? config.driftSpeed * 1.5 : config.driftSpeed * 4;
        if (speed > maxSpeed) {
          p.vx *= 0.95;
          p.vy *= 0.95;
        }
        p.vx += (Math.random() - 0.5) * 0.02 * dtFactor;
        p.vy += (Math.random() - 0.5) * 0.02 * dtFactor;
      }

      // Clamp to canvas
      if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx) * 0.5; }
      if (p.x > w) { p.x = w; p.vx = -Math.abs(p.vx) * 0.5; }
      if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy) * 0.5; }
      if (p.y > h) { p.y = h; p.vy = -Math.abs(p.vy) * 0.5; }

      // Radius + opacity
      p.radius = p.baseRadius + p.active * 1.5;
      p.opacity = p.baseOpacity + p.active * 0.3;

      dirtyRef.current = true;
    }

    // Update burst particles
    for (let i = bs.length - 1; i >= 0; i--) {
      const b = bs[i];
      b.x += b.vx * dtFactor;
      b.y += b.vy * dtFactor;
      b.vx *= 0.97;
      b.vy *= 0.97;
      b.life -= dt;
      b.opacity = Math.max(0, (b.life / b.maxLife) * 0.8);
      b.radius *= 0.995;
      if (b.life <= 0) {
        bs.splice(i, 1);
      }
      dirtyRef.current = true;
    }
  }, [config, reducedMotion, canvasRef]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ps = particlesRef.current;
    const bs = burstsRef.current;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Build spatial grid
    buildGrid(w, h);

    // Draw connection lines
    if (!reducedMotion) {
      const lineOpacity = config.lineOpacity;
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        const neighbors = getNeighbors(p.x, p.y);
        for (let k = 0; k < neighbors.length; k++) {
          const j = neighbors[k];
          if (j <= i) continue;
          const q = ps[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = dx * dx + dy * dy;
          const maxDist = config.connectionDistance;
          if (dist < maxDist * maxDist) {
            const alpha = (1 - Math.sqrt(dist) / maxDist) * lineOpacity;
            const isActive = p.active > 0.1 || q.active > 0.1 || p.isLake || q.isLake;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = isActive
              ? `rgba(0, 102, 204, ${alpha * 2.5})`
              : dark
                ? `rgba(255, 255, 255, ${alpha})`
                : `rgba(0, 102, 204, ${alpha * 0.6})`;
            ctx.lineWidth = (p.isLake || q.isLake) ? 0.7 : 0.5;
            ctx.stroke();
          }
        }
      }
    }

    // Draw particles
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

      if (p.isLake) {
        // Lake particles: always blue with gentle glow
        ctx.shadowColor = "rgba(0, 102, 204, 0.5)";
        ctx.shadowBlur = 6;
        ctx.fillStyle = `rgba(0, 120, 220, ${0.65 + p.active * 0.2})`;
      } else if (p.active > 0.1) {
        // Mouse-activated particles: blue glow
        const glow = p.active * 8;
        ctx.shadowColor = "rgba(0, 102, 204, 0.6)";
        ctx.shadowBlur = glow;
        ctx.fillStyle = `rgba(0, 102, 204, ${p.opacity})`;
      } else {
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.fillStyle = dark
          ? `rgba(255, 255, 255, ${p.opacity})`
          : `rgba(0, 102, 204, ${p.opacity * 0.6})`;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw burst particles
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i];
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 102, 204, ${b.opacity})`;
      ctx.shadowColor = "rgba(0, 102, 204, 0.4)";
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }, [canvasRef, config.connectionDistance, config.lineOpacity, dark, reducedMotion, buildGrid, getNeighbors]);

  const loop = useCallback((timestamp: number) => {
    if (hiddenRef.current) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }
    const dt = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
    lastTimeRef.current = timestamp;

    tick(dt);
    if (dirtyRef.current) {
      draw();
      dirtyRef.current = false;
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [tick, draw]);

  // Resize handler
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);
    initParticles(rect.width, rect.height);
    dirtyRef.current = true;
  }, [canvasRef, initParticles]);

  // Mouse/touch handlers
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
    mouseRef.current.active = true;
    dirtyRef.current = true;
  }, [canvasRef]);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current.active = false;
  }, []);

  const handleClick = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    addBurst(e.clientX - rect.left, e.clientY - rect.top);
  }, [canvasRef, addBurst]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || !e.touches[0]) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = e.touches[0].clientX - rect.left;
    mouseRef.current.y = e.touches[0].clientY - rect.top;
    mouseRef.current.active = true;
    dirtyRef.current = true;
  }, [canvasRef]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !e.touches[0]) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = e.touches[0].clientX - rect.left;
    mouseRef.current.y = e.touches[0].clientY - rect.top;
    mouseRef.current.active = true;
    addBurst(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
  }, [canvasRef, addBurst]);

  const handleTouchEnd = useCallback(() => {
    mouseRef.current.active = false;
  }, []);

  // Visibility API — pause when hidden
  useEffect(() => {
    const onVisChange = () => { hiddenRef.current = document.hidden; };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, []);

  // Setup
  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("mouseleave", handleMouseLeave);
      canvas.addEventListener("click", handleClick);
      canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
      canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
      canvas.addEventListener("touchend", handleTouchEnd);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(rafRef.current);
      if (canvas) {
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("mouseleave", handleMouseLeave);
        canvas.removeEventListener("click", handleClick);
        canvas.removeEventListener("touchmove", handleTouchMove);
        canvas.removeEventListener("touchstart", handleTouchStart);
        canvas.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, [handleResize, handleMouseMove, handleMouseLeave, handleClick, handleTouchMove, handleTouchStart, handleTouchEnd, loop, canvasRef]);
}
