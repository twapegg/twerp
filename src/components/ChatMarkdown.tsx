import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Renders an assistant reply. The model answers in GitHub-flavoured markdown
 * (bold, lists, the occasional table), and the bubble it lands in is narrow,
 * so everything is sized down and tables scroll sideways instead of
 * squeezing the whole panel.
 */
const components: Components = {
  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-pine underline decoration-pine/40 underline-offset-2">
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="my-1.5 flex list-disc flex-col gap-1 pl-4 marker:text-muted">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 flex list-decimal flex-col gap-1 pl-4 marker:text-muted">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5 [&>p]:my-0">{children}</li>,
  h1: ({ children }) => <p className="mb-1 mt-2.5 text-[13px] font-semibold uppercase tracking-wide text-muted first:mt-0">{children}</p>,
  h2: ({ children }) => <p className="mb-1 mt-2.5 text-[13px] font-semibold uppercase tracking-wide text-muted first:mt-0">{children}</p>,
  h3: ({ children }) => <p className="mb-1 mt-2.5 text-[13px] font-semibold uppercase tracking-wide text-muted first:mt-0">{children}</p>,
  hr: () => <hr className="my-2.5 border-ink/10" />,
  blockquote: ({ children }) => <blockquote className="my-1.5 border-l-2 border-ink/15 pl-3 text-muted">{children}</blockquote>,
  code: ({ className, children }) => {
    const block = typeof className === 'string' && className.includes('language-')
    return block ? (
      <code className="block overflow-x-auto rounded-[14px] bg-ink/[0.06] px-3 py-2 font-mono text-xs">{children}</code>
    ) : (
      <code className="rounded-md bg-ink/[0.07] px-1.5 py-0.5 font-mono text-[12px]">{children}</code>
    )
  },
  pre: ({ children }) => <pre className="my-2">{children}</pre>,
  table: ({ children }) => (
    <div className="-mx-1 my-2 overflow-x-auto rounded-[16px] ring-1 ring-inset ring-ink/10">
      <table className="w-full min-w-max border-collapse text-xs tabular">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-ink/[0.05] text-left text-muted">{children}</thead>,
  th: ({ children }) => <th className="whitespace-nowrap px-2.5 py-1.5 font-semibold">{children}</th>,
  td: ({ children }) => <td className="whitespace-nowrap border-t border-ink/[0.08] px-2.5 py-1.5 align-top">{children}</td>,
}

export default function ChatMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  )
}
