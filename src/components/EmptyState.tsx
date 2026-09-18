import Twerp, { type TwerpMood } from './Twerp'

export default function EmptyState({
  title,
  hint,
  mood = 'asleep',
  fill = 0.22,
}: {
  title: string
  hint?: string
  mood?: TwerpMood
  fill?: number
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <Twerp mood={mood} fill={fill} size={60} />
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-[260px] text-xs text-muted">{hint}</p>}
    </div>
  )
}
