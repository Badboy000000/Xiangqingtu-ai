export function DualGunLogo({ size = 44 }: { size?: number }) {
  // Aspect ratio of viewBox: 52 × 44
  const h = size;
  const w = Math.round((size * 52) / 44);

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 52 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Single diagonal gradient flowing across both bolts */}
        <linearGradient
          id="dg-grad"
          x1="0"
          y1="0"
          x2="52"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="48%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>

        {/* Warm glow */}
        <filter id="dg-glow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="2.5"
            floodColor="#f97316"
            floodOpacity="0.28"
          />
        </filter>
      </defs>

      {/* Left lightning bolt */}
      <path
        d="M14 0 L2 24 H10 L0 44 L20 20 H12 Z"
        fill="url(#dg-grad)"
        filter="url(#dg-glow)"
      />

      {/* Right lightning bolt */}
      <path
        d="M46 0 L34 24 H42 L32 44 L52 20 H44 Z"
        fill="url(#dg-grad)"
        filter="url(#dg-glow)"
      />
    </svg>
  );
}
