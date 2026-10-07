import type { CSSProperties } from 'react';
import { RAINBOW } from '../lib/palette';

const OUT = '#3a2f4a';
const RB = 'url(#rbGrad)';

/** 共有グラデーション定義（にじいろ用） */
export function IconDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <linearGradient id="rbGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff3b3b" />
          <stop offset=".25" stopColor="#ffc93c" />
          <stop offset=".5" stopColor="#5ed16a" />
          <stop offset=".75" stopColor="#4cc3ff" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const fillOf = (c: string) => (c === RAINBOW ? RB : c);
const s: CSSProperties = { width: '100%', height: '100%', overflow: 'visible' };

export function PenIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 64 64" style={s}>
      <g transform="rotate(-35 32 32)" stroke={OUT} strokeWidth="3" strokeLinejoin="round">
        <rect x="22" y="14" width="20" height="38" rx="5" fill={fillOf(color)} />
        <path d="M22 20h20M22 46h20" fill="none" opacity=".5" />
        <path d="M24 14L32 1L40 14Z" fill={fillOf(color)} />
        <rect x="22" y="50" width="20" height="8" rx="3" fill="#fff" />
      </g>
    </svg>
  );
}

export function PatternIcon({ tileUrl }: { tileUrl: string }) {
  return (
    <svg viewBox="0 0 64 64" style={s}>
      <defs>
        <pattern id="icoPat" width="16" height="16" patternUnits="userSpaceOnUse">
          <image href={tileUrl} width="16" height="16" />
        </pattern>
      </defs>
      <g transform="rotate(-35 32 32)" stroke={OUT} strokeWidth="3" strokeLinejoin="round">
        <rect x="18" y="10" width="28" height="30" rx="8" fill="#fff" />
        <rect x="18" y="10" width="28" height="30" rx="8" fill="url(#icoPat)" />
        <rect x="27" y="38" width="10" height="22" rx="4" fill="#ffd27a" />
      </g>
    </svg>
  );
}

export function SparkleIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 64 64" style={s}>
      <g stroke={OUT} strokeWidth="3" strokeLinejoin="round">
        {/* 5芒星（黄色） */}
        <polygon
          points="26,6 30,18 43,18 32,26 36,38 26,30 16,38 20,26 9,18 22,18"
          fill="#ffdf00"
        />
        {/* 十字の光（白） */}
        <path d="M46 16Q47 25 56 26Q47 27 46 36Q45 27 36 26Q45 25 46 16Z" fill="#ffffff" />
        {/* 小さな十字の光 */}
        <path d="M20 40Q21 46 27 47Q21 48 20 54Q19 48 13 47Q19 46 20 40Z" fill={fillOf(color)} />
      </g>
      <circle cx="26" cy="22" r="3" fill="#ffffff" />
    </svg>
  );
}

export function GlitterIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 64 64" style={s}>
      <defs>
        <linearGradient id="glitterGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd700" />
          <stop offset="35%" stopColor="#ff80bf" />
          <stop offset="70%" stopColor="#80d8ff" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <g stroke={OUT} strokeWidth="3" strokeLinejoin="round">
        {/* ラメペン本体 */}
        <g transform="rotate(-35 32 32)">
          <rect x="22" y="14" width="20" height="38" rx="5" fill="url(#glitterGrad)" />
          <path d="M24 14L32 1L40 14Z" fill={fillOf(color)} />
          <rect x="22" y="50" width="20" height="8" rx="3" fill="#ffffff" />
        </g>
        {/* 密集するラメ粒子・結晶 */}
        <circle cx="12" cy="18" r="3" fill="#ffd700" />
        <circle cx="18" cy="10" r="2.2" fill="#ffffff" />
        <circle cx="48" cy="46" r="3" fill="#80d8ff" />
        <circle cx="54" cy="38" r="2.5" fill="#ff80bf" />
        <polygon points="50,14 52,19 57,21 52,23 50,28 48,23 43,21 48,19" fill="#ffffff" />
      </g>
    </svg>
  );
}

export function SprayIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 64 64" style={s}>
      <g stroke={OUT} strokeWidth="3" strokeLinejoin="round">
        <rect x="14" y="24" width="24" height="36" rx="7" fill={fillOf(color)} />
        <rect x="19" y="14" width="14" height="11" rx="3" fill="#fff" />
        <rect x="22" y="8" width="11" height="7" rx="2" fill="#bfc6d4" />
      </g>
      <g fill={fillOf(color)}>
        <circle cx="44" cy="10" r="3" />
        <circle cx="52" cy="6" r="2.4" />
        <circle cx="54" cy="15" r="3.2" />
        <circle cx="46" cy="20" r="2" />
        <circle cx="59" cy="10" r="1.8" />
      </g>
    </svg>
  );
}

export function EraserIcon() {
  return (
    <svg viewBox="0 0 64 64" style={s}>
      <g transform="rotate(-30 32 32)" stroke={OUT} strokeWidth="3" strokeLinejoin="round">
        <rect x="10" y="20" width="44" height="24" rx="6" fill="#ff9ec4" />
        <path d="M30 20h18a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6H30Z" fill="#7fc8ff" />
      </g>
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 64 64" style={s}>
      <g stroke={OUT} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        <path d="M14 20h36l-4 36a4 4 0 0 1-4 4H22a4 4 0 0 1-4-4Z" fill="#ffd36e" />
        <rect x="10" y="12" width="44" height="9" rx="4" fill="#ff8a65" />
        <path d="M26 12V7h12v5" fill="none" />
        <path d="M26 30v20M38 30v20" fill="none" />
      </g>
    </svg>
  );
}

export function HomeIcon() {
  return (
    <svg viewBox="0 0 64 64" style={s}>
      <g stroke={OUT} strokeWidth="4" strokeLinejoin="round">
        <path d="M8 30L32 8L56 30" fill="none" strokeLinecap="round" />
        <path d="M14 26v30h36V26L32 10Z" fill="#fff4c2" />
        <rect x="26" y="38" width="12" height="18" rx="3" fill="#ff9f7a" />
      </g>
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg viewBox="0 0 64 64" style={s}>
      <path d="M38 12L18 32L38 52" fill="none" stroke={OUT} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CameraIcon() {
  return (
    <svg viewBox="0 0 64 64" style={s}>
      <g stroke={OUT} strokeWidth="3.5" strokeLinejoin="round">
        <rect x="6" y="18" width="52" height="36" rx="8" fill="#7fd6ff" />
        <path d="M22 18l4-8h12l4 8" fill="#fff" />
        <circle cx="32" cy="36" r="11" fill="#fff" />
        <circle cx="32" cy="36" r="5" fill="#3a2f4a" />
      </g>
      <circle cx="49" cy="26" r="3" fill="#ffe27a" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 64 64" style={s}>
      <path d="M12 34L26 48L52 18" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CrossIcon() {
  return (
    <svg viewBox="0 0 64 64" style={s}>
      <path d="M16 16L48 48M48 16L16 48" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" />
    </svg>
  );
}

export function UndoIcon() {
  return (
    <svg viewBox="0 0 64 64" style={s}>
      <g stroke={OUT} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M22 16L10 28L22 40" />
        <path d="M14 28H34C45 28 53 36 53 47" />
      </g>
    </svg>
  );
}

export function WatercolorIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 64 64" style={s}>
      <g transform="rotate(-30 32 32)">
        {/* チューブの本体（白） */}
        <path d="M18 42 L24 20 C24 16 40 16 40 20 L46 42 L18 42 Z" fill="#ffffff" stroke={OUT} strokeWidth="3" strokeLinejoin="round" />
        {/* チューブの底の折り目 */}
        <rect x="16" y="42" width="32" height="6" rx="2" fill="#d9e2ec" stroke={OUT} strokeWidth="3" />
        {/* チューブの口 */}
        <rect x="28" y="12" width="8" height="8" fill="#ffffff" stroke={OUT} strokeWidth="3" />
        {/* 絞り出されたえのぐ */}
        <path d="M32 12 Q32 2 24 4 Q24 -2 32 2 Q40 -2 40 4 Q32 2 32 12 Z" fill={fillOf(color)} stroke={OUT} strokeWidth="3" strokeLinejoin="round" />
        {/* チューブのラベル部分（色） */}
        <path d="M21 28 L43 28 L44 36 L20 36 Z" fill={fillOf(color)} />
      </g>
    </svg>
  );
}
