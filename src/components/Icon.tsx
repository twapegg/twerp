export type IconName =
  | 'home'
  | 'list'
  | 'chart'
  | 'wallet'
  | 'scale'
  | 'arrowUp'
  | 'arrowDown'
  | 'chat'
  | 'close'
  | 'send'
  | 'sparkle'
  | 'logout'
  | 'plus'
  | 'lock'
  | 'pencil'
  | 'check'
  | 'stack'
  | 'trash'
  | 'sliders'
  | 'sun'
  | 'moon'
  | 'auto'
  | 'card'
  | 'flag'
  | 'calendar'
  | 'chevronLeft'
  | 'chevronRight'

const paths: Record<IconName, string> = {
  sun: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z',
  auto: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM12 3v18M12 7.5a4.5 4.5 0 0 1 0 9',
  trash: 'M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6',
  sliders: 'M4 6h10M18 6h2M4 12h3M11 12h9M4 18h12M20 18h0M14 4v4M7 10v4M16 16v4',
  home: 'M3 11.5 12 4l9 7.5M5.5 10v10h13V10',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  chart: 'M12 3a9 9 0 1 0 9 9h-9V3Z M14 2.5a8 8 0 0 1 7.5 7.5H14V2.5Z',
  wallet: 'M3 8.5h18V19H3zM3 8.5 5 5h14l2 3.5M16 14h2.5',
  scale: 'M12 3v18M6 7h12M3.5 13 6 7l2.5 6a2.5 2.5 0 0 1-5 0ZM15.5 13 18 7l2.5 6a2.5 2.5 0 0 1-5 0Z',
  arrowUp: 'M12 19V5m0 0-6 6m6-6 6 6',
  arrowDown: 'M12 5v14m0 0-6-6m6 6 6-6',
  chat: 'M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-5 4v-4A2.5 2.5 0 0 1 4 13.5v-8Z',
  close: 'M6 6l12 12M18 6 6 18',
  send: 'M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3Z',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z',
  logout: 'M9.5 21H5.5a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 5.5 3h4M16 17l5-5-5-5M21 12H9.5',
  plus: 'M12 5v14M5 12h14',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  pencil: 'M4 20h4l11-11-4-4L4 16v4ZM13.5 6.5l4 4',
  check: 'M5 12.5 9.5 17 19 7.5',
  stack: 'M12 3 3 8l9 5 9-5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5',
  card: 'M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5v-9ZM3 10.5h18M7 14.5h3',
  flag: 'M5 21V4.5M5 4.5h10.5l-1.5 3.5 1.5 3.5H5M15.5 4.5c1.5 0 2.5.5 3.5 1',
  calendar: 'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12ZM4 10h16M8 3v4M16 3v4',
  chevronLeft: 'm15 6-6 6 6 6',
  chevronRight: 'm9 6 6 6-6 6',
}

export default function Icon({
  name,
  className = 'h-5 w-5',
  strokeWidth = 1.8,
}: {
  name: IconName
  className?: string
  strokeWidth?: number
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}
