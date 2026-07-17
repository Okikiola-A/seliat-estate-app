import { useState } from 'react'

// Truncates text with ellipsis by default. Tap/click toggles full text with
// wrapping instead of truncating — since table columns use table-layout:fixed,
// expanding only grows the row's height, it never pushes other columns wider.
export default function TruncatedText({ text, style }) {
  const [expanded, setExpanded] = useState(false)

  if (!text) return null

  return (
    <span
      onClick={(e) => { e.stopPropagation(); setExpanded(p => !p) }}
      title={text}
      style={{
        ...style,
        cursor: 'pointer',
        ...(expanded
          ? { whiteSpace: 'normal', wordBreak: 'break-word', display: 'inline-block' }
          : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }),
      }}
    >
      {text}
    </span>
  )
}