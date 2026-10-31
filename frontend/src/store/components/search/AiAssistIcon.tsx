import { useId } from 'react';

type AiAssistIconProps = {
  size?: number;
  className?: string;
};

/** Friendly gradient robot — matches store AI assistant FAB. */
export function AiAssistIcon({ size = 24, className }: AiAssistIconProps) {
  const uid = useId().replace(/:/g, '');
  const shell = `aiBotShell-${uid}`;
  const shine = `aiBotShine-${uid}`;

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={shell} x1="6" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="0.38" stopColor="#2563eb" />
          <stop offset="0.72" stopColor="#6366f1" />
          <stop offset="1" stopColor="#e879f9" />
        </linearGradient>
        <linearGradient id={shine} x1="22" y1="4" x2="10" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fdf4ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>

      <ellipse cx="16" cy="29.2" rx="8.5" ry="1.65" fill="#64748b" opacity="0.22" />

      <ellipse cx="10.8" cy="27.1" rx="3.4" ry="1.45" fill={`url(#${shell})`} />
      <ellipse cx="21.2" cy="27.1" rx="3.4" ry="1.45" fill={`url(#${shell})`} />

      <ellipse cx="16" cy="21.8" rx="10.8" ry="6.6" fill={`url(#${shell})`} />
      <ellipse cx="16" cy="21.8" rx="10.8" ry="6.6" fill={`url(#${shine})`} opacity="0.65" />

      <ellipse cx="16" cy="22.2" rx="7.2" ry="4.1" fill="#0f172a" />
      <path
        d="M9.8 20.8c-0.8 1.6-0.5 3.2 0.6 4.1"
        stroke="#22d3ee"
        strokeWidth="1.35"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M22.2 20.8c0.8 1.6 0.5 3.2-0.6 4.1"
        stroke="#22d3ee"
        strokeWidth="1.35"
        strokeLinecap="round"
        fill="none"
      />

      <ellipse cx="16" cy="11.6" rx="9.6" ry="7.4" fill={`url(#${shell})`} />
      <ellipse cx="16" cy="11.6" rx="9.6" ry="7.4" fill={`url(#${shine})`} opacity="0.5" />

      <ellipse cx="16" cy="12.4" rx="7.6" ry="4.9" fill="#0f172a" />
      <circle cx="12.6" cy="12.1" r="1.55" fill="#fff" />
      <circle cx="19.4" cy="12.1" r="1.55" fill="#fff" />
      <circle cx="13.1" cy="11.6" r="0.45" fill="#0f172a" opacity="0.35" />
      <circle cx="19.9" cy="11.6" r="0.45" fill="#0f172a" opacity="0.35" />

      <path
        d="M12.8 5.4c-1.8-0.6-3.4-1.8-4.2-3.1"
        stroke={`url(#${shell})`}
        strokeWidth="2.1"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="8.4" cy="2.1" r="1.35" fill={`url(#${shell})`} />

      <path
        d="M17.2 5.2c1.4-1.2 3.2-2.4 5.4-3.4"
        stroke={`url(#${shell})`}
        strokeWidth="2.1"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="23.1" cy="1.5" r="1.35" fill={`url(#${shell})`} />
    </svg>
  );
}
