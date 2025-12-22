"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId, useMemo } from "react";

type PathSpec = {
  id: number;
  d: string;
  strokeOpacity: number;
  strokeWidth: number;
  duration: number;
  dashArray: string;
  dashOffset: number;
};

const hashString = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

const buildPaths = (seed: string, position: number) => {
  const rng = mulberry32(hashString(`${seed}:${position}`));

  return Array.from({ length: 36 }, (_, i): PathSpec => {
    const r = i / 35;
    const d = `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${
      189 + i * 6
    } -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${
      343 - i * 6
    }C${616 - i * 5 * position} ${470 - i * 6} ${684 - i * 5 * position} ${
      875 - i * 6
    } ${684 - i * 5 * position} ${875 - i * 6}`;

    return {
      id: i,
      d,
      strokeOpacity: 0.18 + r * r * 0.72,
      strokeWidth: 0.55 + r * 1.35,
      duration: 18 + rng() * 14,
      dashArray: `${1.5 + rng() * 1.5} ${6 + rng() * 10}`,
      dashOffset: -rng() * 24,
    };
  });
};

function FloatingPaths({ position }: { position: number }) {
  const uid = useId();
  const safeUid = useMemo(() => uid.replace(/[^a-zA-Z0-9_-]/g, ""), [uid]);
  const reduceMotion = useReducedMotion();
  const paths = useMemo(() => buildPaths(safeUid, position), [safeUid, position]);
  const gradientId = `${safeUid}-paths-grad-${position}`;

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg className="h-full w-full" viewBox="0 0 696 316" fill="none">
        <title>Background Paths</title>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgb(59, 130, 246)" stopOpacity="1" />
            <stop offset="0.55" stopColor="rgb(16, 185, 129)" stopOpacity="1" />
            <stop offset="1" stopColor="rgb(168, 85, 247)" stopOpacity="1" />
          </linearGradient>
        </defs>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke={`url(#${gradientId})`}
            strokeWidth={path.strokeWidth}
            strokeOpacity={path.strokeOpacity}
            strokeDasharray={path.dashArray}
            strokeLinecap="round"
            initial={{ opacity: 0.95, strokeDashoffset: path.dashOffset }}
            animate={
              reduceMotion
                ? { opacity: 0.7, strokeDashoffset: path.dashOffset }
                : {
                    opacity: [0.55, 1, 0.55],
                    strokeDashoffset: [path.dashOffset, path.dashOffset - 120],
                  }
            }
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    duration: path.duration,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }
            }
          />
        ))}
      </svg>
    </div>
  );
}

export function AuthBackgroundPaths() {
  return (
    <div className="absolute inset-0 opacity-100 mix-blend-screen [filter:drop-shadow(0_0_22px_rgba(255,255,255,0.16))]">
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />
    </div>
  );
}
