"use client";

import { useEffect, useRef } from "react";

/** A geometric particle field. Its motion never represents recording activity. */
export function ParticleOrb({ className = "" }: { className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const points = Array.from({ length: 1000 }, (_, index) => {
      const y = 1 - (index / 999) * 2;
      const radius = Math.sqrt(1 - y * y);
      const angle = index * Math.PI * (3 - Math.sqrt(5));
      return { x: Math.cos(angle) * radius, y, z: Math.sin(angle) * radius };
    });
    let frame = 0;
    let visible = false;
    let size = 0;
    let rotation = 0.3;
    let lastTime = 0;

    function draw() {
      if (!context) return;
      context.clearRect(0, 0, size, size);
      const radius = size * 0.42;
      const sin = Math.sin(rotation);
      const cos = Math.cos(rotation);
      const projected = points
        .map((point) => ({
          x: point.x * cos + point.z * sin,
          y: point.y,
          z: point.z * cos - point.x * sin,
        }))
        .sort((a, b) => a.z - b.z);
      for (const point of projected) {
        const depth = (point.z + 1) / 2;
        const perspective = 2.7 / (2.7 - point.z * 0.35);
        const color =
          point.x > 0.35 && point.y < 0.3 ? "250,209,255" : "203,255,252";
        context.fillStyle = `rgba(${color},${0.12 + depth * 0.72})`;
        context.beginPath();
        context.arc(
          size / 2 + point.x * radius * perspective,
          size / 2 + point.y * radius * perspective,
          Math.max(0.55, size / 330) * (0.6 + depth * 0.8),
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    }
    function animate(time: number) {
      if (!visible || document.hidden || motion.matches) {
        frame = 0;
        return;
      }
      if (time - lastTime >= 40) {
        rotation += Math.min(time - lastTime, 80) * 0.000065;
        lastTime = time;
        draw();
      }
      frame = requestAnimationFrame(animate);
    }
    function syncMotion() {
      cancelAnimationFrame(frame);
      frame = 0;
      draw();
      if (visible && !document.hidden && !motion.matches)
        frame = requestAnimationFrame(animate);
    }
    const resize = new ResizeObserver(([entry]) => {
      size = entry.contentRect.width;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      element.width = Math.round(size * ratio);
      element.height = Math.round(size * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    });
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncMotion();
    });
    resize.observe(element);
    visibility.observe(element);
    motion.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncMotion);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      visibility.disconnect();
      motion.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncMotion);
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      className={`particle-orb ${className}`}
      aria-hidden="true"
    />
  );
}
