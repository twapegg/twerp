import { useId } from 'react'

export type TwerpMood = 'content' | 'proud' | 'alarmed' | 'asleep' | 'thinking'

/**
 * Twerp, the app mascot: a glass jar with a navy lid. `fill` (0..1) sets the
 * liquid level, `mood` picks the face and lid pose. Colours come from the
 * `--twerp-*` CSS variables so it adapts to light and dark themes.
 */
export default function Twerp({
  fill = 0.6,
  mood = 'content',
  size = 40,
  className = '',
  animate = true,
  title,
}: {
  fill?: number
  mood?: TwerpMood
  size?: number
  className?: string
  animate?: boolean
  title?: string
}) {
  const id = useId().replace(/:/g, '')
  const level = Math.max(0, Math.min(1, fill))
  // Liquid can sit anywhere between the jar floor (y=56) and shoulder (y=23).
  const top = 56 - 33 * level
  const liquid = mood === 'alarmed' ? 'rgb(var(--c-negative))' : 'rgb(var(--c-positive))'

  const lidTransform =
    mood === 'alarmed'
      ? 'rotate(-9 32 11) translate(0 -1.5)'
      : mood === 'asleep'
        ? 'translate(1.5 0.5)'
        : mood === 'proud'
          ? 'translate(0 -0.5)'
          : undefined

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`${animate ? 'twerp-bob' : ''} ${className}`}
      role="img"
      aria-label={title ?? 'Twerp'}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <clipPath id={`${id}-body`}>
          <rect x="14" y="19" width="36" height="40" rx="11" />
        </clipPath>
        <linearGradient id={`${id}-lid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4A6BB5" />
          <stop offset="1" stopColor="#1E3A7A" />
        </linearGradient>
      </defs>

      {/* Neck */}
      <rect x="19" y="13" width="26" height="9" rx="3" fill="var(--twerp-glass)" stroke="var(--twerp-rim)" strokeWidth="1.2" />

      {/* Body glass */}
      <rect x="14" y="19" width="36" height="40" rx="11" fill="var(--twerp-glass)" />

      {/* Liquid */}
      <g clipPath={`url(#${id}-body)`}>
        <g className={animate ? 'twerp-liquid' : undefined}>
          <path
            d={`M6 ${top + 1.5} Q 19 ${top - 1.8} 32 ${top + 1.5} T 58 ${top + 1.5} V 66 H 6 Z`}
            fill={liquid}
            opacity="0.85"
          />
          <path
            d={`M6 ${top + 1.5} Q 19 ${top - 1.8} 32 ${top + 1.5} T 58 ${top + 1.5}`}
            fill="none"
            stroke="white"
            strokeOpacity="0.55"
            strokeWidth="1.2"
          />
        </g>
      </g>

      {/* Rim and highlights */}
      <rect x="14" y="19" width="36" height="40" rx="11" fill="none" stroke="var(--twerp-rim)" strokeWidth="1.2" />
      <rect x="18.5" y="25" width="3.5" height="20" rx="1.75" fill="white" opacity="0.55" />
      <rect x="43" y="27" width="2" height="8" rx="1" fill="white" opacity="0.35" />

      {/* Lid */}
      <g transform={lidTransform}>
        <rect x="15" y="6" width="34" height="10" rx="5" fill={`url(#${id}-lid)`} />
        <rect x="17" y="7" width="30" height="3" rx="1.5" fill="white" opacity="0.28" />
      </g>

      {/* Face */}
      <g fill="var(--twerp-face)" stroke="var(--twerp-face)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {mood === 'content' && (
          <>
            <g className={animate ? 'twerp-blink' : undefined} stroke="none">
              <circle cx="25.5" cy="38" r="2.4" />
              <circle cx="38.5" cy="38" r="2.4" />
            </g>
            <path d="M27.5 45 Q32 48.5 36.5 45" fill="none" />
          </>
        )}
        {mood === 'proud' && (
          <>
            <path d="M22.5 38.5 Q25.5 34.5 28.5 38.5" fill="none" />
            <path d="M35.5 38.5 Q38.5 34.5 41.5 38.5" fill="none" />
            <path d="M26 44 Q32 50.5 38 44" fill="none" />
            <path
              d="M53 17 l1.1 2.9 2.9 1.1 -2.9 1.1 -1.1 2.9 -1.1 -2.9 -2.9 -1.1 2.9 -1.1z"
              fill="rgb(var(--c-positive))"
              stroke="none"
            />
          </>
        )}
        {mood === 'alarmed' && (
          <>
            <g stroke="none">
              <circle cx="25.5" cy="38" r="3.2" />
              <circle cx="38.5" cy="38" r="3.2" />
              <circle cx="26.5" cy="37" r="1" fill="white" />
              <circle cx="39.5" cy="37" r="1" fill="white" />
            </g>
            <path d="M22 32.5 l6 -1.6" fill="none" />
            <path d="M42 32.5 l-6 -1.6" fill="none" />
            <circle cx="32" cy="46" r="1.9" fill="none" />
          </>
        )}
        {mood === 'asleep' && (
          <>
            <path d="M22.5 38.5 h6" fill="none" />
            <path d="M35.5 38.5 h6" fill="none" />
            <path d="M30 45.5 h4" fill="none" />
            <text x="45" y="31" fontSize="7" fontWeight="700" stroke="none" fontFamily="Inter, system-ui, sans-serif">
              z
            </text>
            <text x="50" y="25" fontSize="5" fontWeight="700" stroke="none" fontFamily="Inter, system-ui, sans-serif">
              z
            </text>
          </>
        )}
        {mood === 'thinking' && (
          <>
            <g stroke="none">
              <circle cx="26.5" cy="36.5" r="2.4" />
              <circle cx="39.5" cy="36.5" r="2.4" />
            </g>
            <path d="M35 31.5 l6 -1.2" fill="none" />
            <path d="M29 46 l5 -1" fill="none" />
          </>
        )}
      </g>
    </svg>
  )
}
