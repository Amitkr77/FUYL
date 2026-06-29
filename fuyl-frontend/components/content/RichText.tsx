interface RichTextProps {
  html:       string
  className?: string
}

export function RichText({ html, className = '' }: RichTextProps) {
  return (
    <div
      className={`prose prose-sm max-w-none text-body-md leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
