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

export function GlitterIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 64 64" style={s}>
      <g stroke={OUT} strokeWidth="3" strokeLinejoin="round">
        <path d="M30 6Q34 26 54 30Q34 34 30 56Q26 34 6 30Q26 26 30 6Z" fill={fillOf(color)} />
        <path d="M50 4Q51 11 58 12Q51 13 50 20Q49 13 42 12Q49 11 50 4Z" fill="#ffe27a" />
        <path d="M14 44Q15 50 20 51Q15 52 14 58Q13 52 8 51Q13 50 14 44Z" fill="#fff" />
      </g>
      <circle cx="30" cy="30" r="4" fill="#fff" />
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
